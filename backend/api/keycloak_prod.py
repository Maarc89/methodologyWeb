"""Helpers reutilizables para interacción con Keycloak.

Este módulo contiene funciones puramente auxiliares (HTTP hacia Keycloak,
con fallback a un servidor alternativo, mapeo de roles, etc.).

Separar esta lógica facilita pruebas unitarias y mantiene `views.py` más
ligero.
"""

import logging

import requests
from django.conf import settings

logger = logging.getLogger(__name__)


def _keycloak_base():
    """Leer configuración de Keycloak desde settings y devolver parámetros
    básicos: (server, alt_server, realm, verify_ssl, timeout).
    """
    cfg = getattr(settings, "KEYCLOAK_CONFIG", {})
    server = cfg.get("KEYCLOAK_SERVER_URL", "").rstrip("/")
    alt = cfg.get("KEYCLOAK_SERVER_URL_ALT")
    realm = cfg.get("KEYCLOAK_REALM")
    verify = cfg.get("KEYCLOAK_VERIFY", True)
    timeout = getattr(settings, "KEYCLOAK_REQUEST_TIMEOUT", 10)
    return server, alt, realm, verify, timeout


def _admin_headers(admin_token):
    return {
        "Authorization": f"Bearer {admin_token}",
        "Content-Type": "application/json",
    }


def _keycloak_request(admin_token, method, path, params=None, json_data=None):
    """Realiza una petición HTTP a Keycloak intentando primero el servidor
    alternativo (`KEYCLOAK_SERVER_URL_ALT`) y luego el servidor principal.
    Devuelve (response_obj or None, tried_urls_list).
    """
    server, alt, realm, verify, timeout = _keycloak_base()
    headers = _admin_headers(admin_token)
    tried = []

    if alt:
        alt_url = f"{alt.rstrip('/')}{path}"
        tried.append(alt_url)
        try:
            r = requests.request(
                method,
                alt_url,
                params=params,
                json=json_data,
                headers=headers,
                verify=verify,
                timeout=timeout,
            )
            return r, tried
        except requests.RequestException as e:
            logger.debug("Keycloak alt request failed: %s %s", alt_url, e)

    main_url = f"{server}{path}"
    tried.append(main_url)
    try:
        r = requests.request(
            method,
            main_url,
            params=params,
            json=json_data,
            headers=headers,
            verify=verify,
            timeout=timeout,
        )
        return r, tried
    except requests.RequestException as e:
        logger.debug("Keycloak main request failed: %s %s", main_url, e)
        return None, tried


def _request_get_with_fallback(admin_token, path, params=None):
    server, alt, realm, verify, timeout = _keycloak_base()
    headers = _admin_headers(admin_token)

    tried = []
    if alt:
        alt_url = f"{alt.rstrip('/')}{path}"
        tried.append(alt_url)
        try:
            r = requests.get(
                alt_url, params=params, headers=headers, verify=verify, timeout=timeout
            )
            return r, tried
        except requests.RequestException as e:
            logger.debug("GET alt %s failed: %s", alt_url, e)

    main_url = f"{server}{path}"
    tried.append(main_url)
    try:
        r = requests.get(
            main_url, params=params, headers=headers, verify=verify, timeout=timeout
        )
        return r, tried
    except requests.RequestException as e:
        logger.debug("GET main %s failed: %s", main_url, e)
        return None, tried


def _request_post_with_fallback(admin_token, path, json_data=None):
    server, alt, realm, verify, timeout = _keycloak_base()
    headers = _admin_headers(admin_token)
    tried = []
    if alt:
        alt_url = f"{alt.rstrip('/')}{path}"
        tried.append(alt_url)
        try:
            r = requests.post(
                alt_url, json=json_data, headers=headers, verify=verify, timeout=timeout
            )
            return r, tried
        except requests.RequestException as e:
            logger.debug("POST alt %s failed: %s", alt_url, e)

    main_url = f"{server}{path}"
    tried.append(main_url)
    try:
        r = requests.post(
            main_url, json=json_data, headers=headers, verify=verify, timeout=timeout
        )
        return r, tried
    except requests.RequestException as e:
        logger.debug("POST main %s failed: %s", main_url, e)
        return None, tried


def assign_realm_roles_helper(admin_token, user_id, role_names):
    """Asigna roles realm a un usuario. Devuelve (success:bool, error:dict|null).

    role_names: lista de nombres de roles en el realm (ej: ['editor']).
    """
    errors = []
    role_objs = []
    for rn in role_names:
        role_path = (
            f"/admin/realms/{settings.KEYCLOAK_CONFIG['KEYCLOAK_REALM']}/roles/{rn}"
        )
        r, meta = _request_get_with_fallback(admin_token, role_path)
        if r and getattr(r, "ok", False):
            try:
                role_objs.append(r.json())
            except Exception as e:
                errors.append(
                    {"role": rn, "error": f"Invalid JSON from role endpoint: {e}"}
                )
        else:
            errors.append(
                {
                    "role": rn,
                    "meta": meta,
                    "status": getattr(r, "status_code", None) if r else None,
                }
            )

    if not role_objs:
        return False, {"error": "no_realm_roles_found", "details": errors}

    map_path = f"/admin/realms/{settings.KEYCLOAK_CONFIG['KEYCLOAK_REALM']}/users/{user_id}/role-mappings/realm"
    rr, tried_map = _request_post_with_fallback(
        admin_token, map_path, json_data=role_objs
    )
    if rr and getattr(rr, "ok", False):
        return True, None
    else:
        return False, {
            "map_meta": tried_map,
            "status": getattr(rr, "status_code", None) if rr else None,
            "body": getattr(rr, "text", None),
            "details": errors,
        }


def assign_client_roles_helper(admin_token, user_id, client_id, role_names):
    """Asigna roles de cliente a un usuario. Devuelve (success:bool, error:dict|null)."""
    clients_path = f"/admin/realms/{settings.KEYCLOAK_CONFIG['KEYCLOAK_REALM']}/clients"
    rclients, meta_clients = _request_get_with_fallback(
        admin_token, clients_path, params={"clientId": client_id}
    )
    if not rclients or not getattr(rclients, "ok", False) or not rclients.json():
        return False, {"error": "client_not_found", "meta": meta_clients}

    try:
        client_uuid = rclients.json()[0]["id"]
    except Exception as e:
        return False, {
            "error": "invalid_clients_response",
            "exception": str(e),
            "body": getattr(rclients, "text", None),
        }

    role_objs = []
    errors = []
    for rn in role_names:
        role_path = f"/admin/realms/{settings.KEYCLOAK_CONFIG['KEYCLOAK_REALM']}/clients/{client_uuid}/roles/{rn}"
        r, meta = _request_get_with_fallback(admin_token, role_path)
        if r and getattr(r, "ok", False):
            try:
                role_objs.append(r.json())
            except Exception as e:
                errors.append(
                    {
                        "role": rn,
                        "error": f"Invalid JSON from client role endpoint: {e}",
                    }
                )
        else:
            errors.append(
                {
                    "role": rn,
                    "meta": meta,
                    "status": getattr(r, "status_code", None) if r else None,
                }
            )

    if not role_objs:
        return False, {"error": "no_client_roles_found", "details": errors}

    map_path = f"/admin/realms/{settings.KEYCLOAK_CONFIG['KEYCLOAK_REALM']}/users/{user_id}/role-mappings/clients/{client_uuid}"
    rr, tried_map = _request_post_with_fallback(
        admin_token, map_path, json_data=role_objs
    )
    if rr and getattr(rr, "ok", False):
        return True, None
    else:
        return False, {
            "map_meta": tried_map,
            "status": getattr(rr, "status_code", None) if rr else None,
            "body": getattr(rr, "text", None),
            "details": errors,
        }
