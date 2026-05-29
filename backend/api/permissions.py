from rest_framework.permissions import BasePermission


def _get_claims_from_request(request):
    """Compatibilidad mínima para llamadas antiguas; en desarrollo no se usan claims."""
    return {}


def has_role(request, role_name):
    """Comprueba si el usuario autenticado tiene el rol pedido vía Django groups."""
    user = getattr(request, "user", None)
    if user and getattr(user, "is_authenticated", False):
        if getattr(user, "is_staff", False) and role_name == "admin":
            return True
        try:
            if user.groups.filter(name=role_name).exists():
                return True
        except Exception:
            pass

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
