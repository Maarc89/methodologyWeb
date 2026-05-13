from django.conf import settings
from rest_framework.permissions import BasePermission

try:
    import jwt as _jwt
except Exception:
    _jwt = None


def _get_claims_from_request(request):
    """Return decoded claims dict if available, else {}.
    First prefer request.auth (some authentication backends place decoded claims there).
    Otherwise try to decode Authorization Bearer token without verifying signature.
    """
    auth_obj = getattr(request, "auth", None)
    if isinstance(auth_obj, dict):
        return auth_obj

    auth_header = request.META.get("HTTP_AUTHORIZATION", "")
    if auth_header and auth_header.startswith("Bearer "):
        token = auth_header.split(" ", 1)[1]
        if _jwt is not None:
            try:
                return _jwt.decode(token, options={"verify_signature": False})
            except Exception:
                return {}
    return {}


def has_role(request, role_name):
    """Check if the current request user (or token) has the given role.
    Checks, in order:
      - request.user.is_staff (only treats as admin)
      - Django group with exact name
      - realm_access.roles in token claims
      - resource_access[client_id].roles or any client roles in token claims
    """
    user = getattr(request, "user", None)
    if user and getattr(user, "is_authenticated", False):
        # is_staff => admin
        if getattr(user, "is_staff", False) and role_name == "admin":
            return True
        # Django groups
        try:
            if user.groups.filter(name=role_name).exists():
                return True
        except Exception:
            pass

    claims = _get_claims_from_request(request)
    if not isinstance(claims, dict):
        return False

    realm_roles = claims.get("realm_access", {}).get("roles", []) or []
    if role_name in realm_roles:
        return True

    client_id = None
    try:
        client_id = (
            settings.KEYCLOAK_CONFIG.get("KEYCLOAK_CLIENT_ID")
            if getattr(settings, "KEYCLOAK_CONFIG", None)
            else getattr(settings, "KEYCLOAK_CLIENT_ID", None)
        )
    except Exception:
        client_id = getattr(settings, "KEYCLOAK_CLIENT_ID", None)

    resource_access = claims.get("resource_access", {}) or {}
    if client_id and resource_access:
        client_roles = resource_access.get(client_id, {}).get("roles", []) or []
        if role_name in client_roles:
            return True

    # check any client roles
    for client_obj in resource_access.values():
        roles = client_obj.get("roles", []) or []
        if role_name in roles:
            return True

    return False


class IsRealmAdmin(BasePermission):
    """Allow access only to users with role 'admin' (realm/client/group/is_staff)."""

    def has_permission(self, request, view):
        return has_role(request, "admin")


class IsEditor(BasePermission):
    """Allow access to editor or admin."""

    def has_permission(self, request, view):
        return has_role(request, "editor") or has_role(request, "admin")


class IsBaseUser(BasePermission):
    """Allow access to base_user, editor or admin."""

    def has_permission(self, request, view):
        return (
            has_role(request, "base_user")
            or has_role(request, "editor")
            or has_role(request, "admin")
        )


class CanStartAssessment(BasePermission):
    """Allow only base_user or admin (editors are NOT allowed to start assessments)."""

    def has_permission(self, request, view):
        return has_role(request, "base_user") or has_role(request, "admin")
