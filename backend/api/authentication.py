import base64
import json
import logging
import threading
import time

import jwt
import requests
import urllib3
from django.conf import settings
from django.contrib.auth.models import Group, User
from rest_framework import authentication, exceptions
from rest_framework.authentication import get_authorization_header

logger = logging.getLogger(__name__)

try:
    if getattr(settings, "KEYCLOAK_CONFIG", {}).get("KEYCLOAK_VERIFY") is False:
        urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)
except Exception:
    pass

# Cache for JWKS
_jwks_cache = {"jwks": None, "fetched_at": 0.0, "lock": threading.Lock()}

JWKS_CACHE_TTL = getattr(settings, "KEYCLOAK_JWKS_CACHE_TTL", 3600)


def base64url_decode(input_str):
    rem = len(input_str) % 4
    if rem == 2:
        input_str += "=="
    elif rem == 3:
        input_str += "="
    elif rem != 0:
        raise ValueError("Invalid base64url string")
    return base64.urlsafe_b64decode(input_str.encode("ascii"))


def jwk_to_public_key(jwk):
    # Import cryptography modules dynamically to avoid static analysis issues
    try:
        import importlib

        rsa_mod = importlib.import_module(
            "cryptography.hazmat.primitives.asymmetric.rsa"
        )
        serialization = importlib.import_module(
            "cryptography.hazmat.primitives.serialization"
        )
        backends = importlib.import_module("cryptography.hazmat.backends")
        default_backend = getattr(backends, "default_backend")
    except Exception as imp_err:
        raise ImportError(
            "cryptography is required to convert JWK to public key PEM"
        ) from imp_err

    n_b = base64url_decode(jwk["n"])
    e_b = base64url_decode(jwk["e"])
    n = int.from_bytes(n_b, "big")
    e = int.from_bytes(e_b, "big")
    public_numbers = rsa_mod.RSAPublicNumbers(e, n)
    public_key = public_numbers.public_key(default_backend())
    pem = public_key.public_bytes(
        encoding=serialization.Encoding.PEM,
        format=serialization.PublicFormat.SubjectPublicKeyInfo,
    )
    return pem


def _fetch_jwks_from_url(url):
    verify = getattr(settings, "KEYCLOAK_CONFIG", {}).get("KEYCLOAK_VERIFY", True)
    timeout = getattr(settings, "KEYCLOAK_REQUEST_TIMEOUT", 5)
    resp = requests.get(url, timeout=timeout, verify=verify)
    resp.raise_for_status()
    return resp.json()


def get_cached_jwks():
    now = time.time()
    if _jwks_cache["jwks"] and (now - _jwks_cache["fetched_at"] < JWKS_CACHE_TTL):
        return _jwks_cache["jwks"]

    with _jwks_cache["lock"]:
        now = time.time()
        if _jwks_cache["jwks"] and (now - _jwks_cache["fetched_at"] < JWKS_CACHE_TTL):
            return _jwks_cache["jwks"]

        jwks_url = f"{getattr(settings, 'KEYCLOAK_CONFIG', {}).get('KEYCLOAK_SERVER_URL', '').rstrip('/')}/realms/{getattr(settings, 'KEYCLOAK_CONFIG', {}).get('KEYCLOAK_REALM', '')}/protocol/openid-connect/certs"
        alt = getattr(settings, "KEYCLOAK_CONFIG", {}).get("KEYCLOAK_JWKS_URL_ALT")

        if alt:
            try:
                jwks = _fetch_jwks_from_url(alt)
                _jwks_cache["jwks"] = jwks
                _jwks_cache["fetched_at"] = time.time()
                logger.info("JWKS descargado desde alternativa")
                return jwks
            except Exception as e:
                logger.debug(f"Fail to fetch JWKS from alternative: {e}")

        try:
            jwks = _fetch_jwks_from_url(jwks_url)
            _jwks_cache["jwks"] = jwks
            _jwks_cache["fetched_at"] = time.time()
            logger.info("JWKS descargado desde principal")
            return jwks
        except Exception as e:
            logger.debug(f"Fail to fetch JWKS from primary: {e}")

        return None


class KeycloakAuthentication(authentication.BaseAuthentication):
    """
    Autenticación de usuarios usando JWT emitido por Keycloak.
    Decodifica el token con la public key del realm.
    """

    def authenticate(self, request):
        auth_header = get_authorization_header(request)
        if auth_header:
            try:
                auth_header = auth_header.decode("utf-8")
            except Exception:
                auth_header = None

        if not auth_header:
            auth_header = (
                request.META.get("HTTP_AUTHORIZATION")
                if hasattr(request, "META")
                else None
            )

        if not auth_header or not auth_header.startswith("Bearer "):
            # Sólo advertir si faltan cabeceras de autorización
            logger.debug("No Authorization header presente en la petición")
            return None

        token = auth_header.split(" ")[1]

        try:
            kid = None
            try:
                kid = jwt.get_unverified_header(token).get("kid")
            except Exception:
                pass

            jwks = get_cached_jwks()

            signing_key_pem = None
            if jwks:
                if not kid:
                    kid = jwt.get_unverified_header(token).get("kid")
                jwk = None
                if kid:
                    jwk = next(
                        (k for k in jwks.get("keys", []) if k.get("kid") == kid), None
                    )
                if not jwk and jwks.get("keys"):
                    jwk = jwks.get("keys")[0]
                if jwk:
                    signing_key_pem = jwk_to_public_key(jwk)

            if not signing_key_pem:
                local_path = getattr(settings, "KEYCLOAK_CONFIG", {}).get(
                    "KEYCLOAK_JWKS_LOCAL_FILE"
                )
                if local_path:
                    try:
                        with open(local_path, "r", encoding="utf-8") as f:
                            jwks = json.load(f)
                        if not kid:
                            kid = jwt.get_unverified_header(token).get("kid")
                        jwk = next(
                            (k for k in jwks.get("keys", []) if k.get("kid") == kid),
                            None,
                        )
                        if not jwk and jwks.get("keys"):
                            jwk = jwks.get("keys")[0]
                        if jwk:
                            signing_key_pem = jwk_to_public_key(jwk)
                    except Exception as e3:
                        logger.debug(f"Fallo al cargar JWKS local: {e3}")

            if not signing_key_pem:
                logger.warning("No se pudo obtener clave de firma (JWKS)")
                raise exceptions.AuthenticationFailed(
                    "No se pudo obtener la clave de firma del servidor de autorización."
                )

            token_info = jwt.decode(
                token,
                signing_key_pem,
                algorithms=["RS256"],
                options={"verify_aud": False},
            )

            username = token_info.get("preferred_username") or token_info.get("email")
            email = token_info.get("email", "")

            if not username:
                raise exceptions.AuthenticationFailed(
                    "Token no contiene usuario válido."
                )

            user, _ = User.objects.get_or_create(
                username=username, defaults={"email": email}
            )

            for role_name in ["admin", "editor", "base_user"]:
                Group.objects.get_or_create(name=role_name)

            user.groups.clear()
            roles = token_info.get("realm_access", {}).get("roles", [])
            if "admin" in roles:
                user.groups.add(Group.objects.get(name="admin"))
                user.is_staff = True
            elif "editor" in roles:
                user.groups.add(Group.objects.get(name="editor"))
                user.is_staff = True
            else:
                user.groups.add(Group.objects.get(name="base_user"))
                user.is_staff = False

            user.save()
            return (user, token)

        except jwt.ExpiredSignatureError:
            logger.info("Token expirado")
            raise exceptions.AuthenticationFailed("Token expirado.")
        except jwt.InvalidTokenError as e:
            logger.warning(f"Token inválido: {e}")
            raise exceptions.AuthenticationFailed(f"Token inválido: {e}")
        except exceptions.AuthenticationFailed:
            raise
        except Exception as e:
            logger.exception(f"Error autenticando token: {e}")
            raise exceptions.AuthenticationFailed(f"Error autenticando token: {e}")


def get_admin_token(realm=None):
    """
    Obtiene un token de administrador de Keycloak usando el usuario admin configurado en settings.
    Si 'realm' es None usa KEYCLOAK_CONFIG['KEYCLOAK_REALM'], puede pasarse 'master' para obtener token de administración global.
    """
    use_realm = (
        realm
        if realm
        else getattr(settings, "KEYCLOAK_CONFIG", {}).get("KEYCLOAK_REALM")
    )
    base_server_url = (
        getattr(settings, "KEYCLOAK_CONFIG", {})
        .get("KEYCLOAK_SERVER_URL", "")
        .rstrip("/")
    )
    url = f"{base_server_url}/realms/{use_realm}/protocol/openid-connect/token"
    data = {
        "grant_type": "password",
        "client_id": "admin-cli",
        "username": getattr(settings, "KEYCLOAK_CONFIG", {}).get("KEYCLOAK_ADMIN_USER"),
        "password": getattr(settings, "KEYCLOAK_CONFIG", {}).get(
            "KEYCLOAK_ADMIN_PASSWORD"
        ),
    }
    timeout = getattr(settings, "KEYCLOAK_REQUEST_TIMEOUT", 5)
    verify = getattr(settings, "KEYCLOAK_CONFIG", {}).get("KEYCLOAK_VERIFY", True)

    alt_server = getattr(settings, "KEYCLOAK_CONFIG", {}).get("KEYCLOAK_SERVER_URL_ALT")

    resp = None
    tried = []

    client_id = getattr(settings, "KEYCLOAK_CONFIG", {}).get(
        "KEYCLOAK_ADMIN_CLIENT_ID"
    ) or getattr(settings, "KEYCLOAK_ADMIN_CLIENT_ID", None)
    client_secret = getattr(settings, "KEYCLOAK_CONFIG", {}).get(
        "KEYCLOAK_ADMIN_CLIENT_SECRET"
    ) or getattr(settings, "KEYCLOAK_ADMIN_CLIENT_SECRET", None)
    if client_id and client_secret:
        try:
            if alt_server:
                cc_alt_url = f"{alt_server.rstrip('/')}/realms/{use_realm}/protocol/openid-connect/token"
                tried.append(cc_alt_url)
                try:
                    resp = requests.post(
                        cc_alt_url,
                        data={
                            "grant_type": "client_credentials",
                            "client_id": client_id,
                            "client_secret": client_secret,
                        },
                        verify=verify,
                        timeout=timeout,
                    )
                    resp.raise_for_status()
                except requests.exceptions.RequestException:
                    resp = None

            if resp is None:
                cc_url = f"{base_server_url}/realms/{use_realm}/protocol/openid-connect/token"
                tried.append(cc_url)
                resp = requests.post(
                    cc_url,
                    data={
                        "grant_type": "client_credentials",
                        "client_id": client_id,
                        "client_secret": client_secret,
                    },
                    verify=verify,
                    timeout=timeout,
                )
                resp.raise_for_status()

            logger.info("Obtenido token admin vía client_credentials")
        except requests.exceptions.RequestException as e_cc:
            logger.info(
                f"client_credentials falló: {e_cc}; se intentará password grant"
            )
            resp = None

    if resp is None:
        try:
            if alt_server:
                alt_url = f"{alt_server.rstrip('/')}/realms/{use_realm}/protocol/openid-connect/token"
                tried.append(alt_url)
                try:
                    logger.info(
                        f"Intentando obtener token admin desde URL alternativa: {alt_url}"
                    )
                    resp = requests.post(
                        alt_url, data=data, verify=verify, timeout=timeout
                    )
                    resp.raise_for_status()
                except requests.exceptions.RequestException:
                    resp = None

            if resp is None:
                tried.append(url)
                resp = requests.post(url, data=data, verify=verify, timeout=timeout)
                resp.raise_for_status()
        except requests.exceptions.RequestException as e:
            logger.exception(
                f"Error obteniendo token admin de Keycloak (urls tried: {tried}): {e}"
            )
            raise

    token = resp.json().get("access_token")
    if not token:
        logger.error("No se pudo obtener token de administrador de Keycloak")
        raise Exception("No se pudo obtener token de administrador de Keycloak")
    return token
