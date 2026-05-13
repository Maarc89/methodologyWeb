import codecs
import csv
import logging
import traceback
from collections import defaultdict

import requests
from django.conf import settings
from django.contrib.auth.models import User
from django.db import IntegrityError
from django.http import HttpResponse
from django.shortcuts import get_object_or_404
from rest_framework import generics, status, viewsets
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .authentication import get_admin_token
from .keycloak import (
    _keycloak_request,
    _request_get_with_fallback,
    _request_post_with_fallback,
    assign_realm_roles_helper,
    assign_client_roles_helper,
)
from .permissions import (CanStartAssessment, IsBaseUser, IsEditor,
                          IsRealmAdmin, _get_claims_from_request)
from .models import (
    AssessmentTemplate,
    QuestionTemplate,
    UserAssessment,
    UserAnswer,
    AssessmentAccess,
    AnswerOptionSet,
    AnswerOption,
    QuestionArea,
)
from .serializers import (
    AssessmentTemplateSerializer,
    QuestionTemplateSerializer,
    UserAssessmentSerializer,
    UserAnswerSerializer,
    AssessmentAccessSerializer,
    AnswerOptionSetSerializer,
    QuestionAreaSerializer,
)

logger = logging.getLogger(__name__)


# -----------------------
# KEYCLOAK USER MANAGEMENT
# -----------------------


@api_view(["GET"])
@permission_classes([IsRealmAdmin])
def keycloak_list_users(request):
    """Lista usuarios en Keycloak. Acepta filtros query params (username, email, first, max).
    Devuelve la lista de usuarios tal como Keycloak la proporciona.
    """
    try:
        admin_token = get_admin_token(
            realm=settings.KEYCLOAK_CONFIG.get("KEYCLOAK_REALM")
        )
    except Exception as e:
        logger.exception("No se pudo obtener token admin para listar usuarios: %s", e)
        return Response(
            {"detail": "Error obteniendo token admin", "error": str(e)},
            status=status.HTTP_502_BAD_GATEWAY,
        )

    params = {}
    for k, v in request.query_params.items():
        params[k] = v

    path = f"/admin/realms/{settings.KEYCLOAK_CONFIG.get('KEYCLOAK_REALM')}/users"
    r, tried = _keycloak_request(admin_token, "GET", path, params=params)
    if not r:
        return Response(
            {"detail": "No response from Keycloak", "tried": tried},
            status=status.HTTP_502_BAD_GATEWAY,
        )

    try:
        return Response(r.json())
    except Exception:
        return Response(
            {
                "detail": "OK but could not decode JSON",
                "status_code": r.status_code,
                "text": r.text,
            },
            status=r.status_code,
        )


@api_view(["GET", "DELETE", "PATCH"])
@permission_classes([IsRealmAdmin])
def keycloak_user_detail(request, user_id):
    """GET: obtener user; DELETE: eliminar user; PATCH: actualizar campos (ej: enabled)."""
    try:
        admin_token = get_admin_token(
            realm=settings.KEYCLOAK_CONFIG.get("KEYCLOAK_REALM")
        )
    except Exception as e:
        logger.exception("No se pudo obtener token admin para user detail: %s", e)
        return Response(
            {"detail": "Error obteniendo token admin", "error": str(e)},
            status=status.HTTP_502_BAD_GATEWAY,
        )

    base_path = f"/admin/realms/{settings.KEYCLOAK_CONFIG.get('KEYCLOAK_REALM')}/users/{user_id}"

    if request.method == "GET":
        r, tried = _keycloak_request(admin_token, "GET", base_path)
        if not r:
            return Response(
                {"detail": "No response from Keycloak", "tried": tried},
                status=status.HTTP_502_BAD_GATEWAY,
            )
        try:
            return Response(r.json())
        except Exception:
            return Response(
                {
                    "detail": "OK but could not decode JSON",
                    "status_code": r.status_code,
                    "text": r.text,
                },
                status=r.status_code,
            )

    if request.method == "DELETE":
        r_get, tried_get = _keycloak_request(admin_token, "GET", base_path)
        if not r_get:
            return Response(
                {
                    "detail": "No response from Keycloak (get before delete)",
                    "tried": tried_get,
                },
                status=status.HTTP_502_BAD_GATEWAY,
            )
        if not getattr(r_get, "ok", False):
            return Response(
                {
                    "detail": "Error leyendo usuario antes de eliminar",
                    "status_code": getattr(r_get, "status_code", None),
                    "text": getattr(r_get, "text", None),
                },
                status=getattr(r_get, "status_code", status.HTTP_502_BAD_GATEWAY),
            )

        try:
            user_body = r_get.json()
            username_to_delete = user_body.get("username")
            email_to_delete = user_body.get("email")
        except Exception:
            username_to_delete = None
            email_to_delete = None

        r_del, tried_del = _keycloak_request(admin_token, "DELETE", base_path)
        if not r_del:
            return Response(
                {"detail": "No response from Keycloak (delete)", "tried": tried_del},
                status=status.HTTP_502_BAD_GATEWAY,
            )
        if r_del.status_code in (204, 200):
            try:
                if username_to_delete:
                    User.objects.filter(username__iexact=username_to_delete).delete()
                elif email_to_delete:
                    User.objects.filter(email__iexact=email_to_delete).delete()
            except Exception:
                logger.exception(
                    "Error eliminando usuario local tras borrar en Keycloak"
                )
            return Response(
                {"detail": "Usuario eliminado en Keycloak"},
                status=status.HTTP_204_NO_CONTENT,
            )
        else:
            return Response(
                {
                    "detail": "Error eliminando usuario",
                    "status_code": r_del.status_code,
                    "text": r_del.text,
                },
                status=r_del.status_code,
            )

    if request.method == "PATCH":
        r_get, tried_get = _keycloak_request(admin_token, "GET", base_path)
        if not r_get:
            return Response(
                {
                    "detail": "No response from Keycloak (get before patch)",
                    "tried": tried_get,
                },
                status=status.HTTP_502_BAD_GATEWAY,
            )
        if not hasattr(r_get, "ok") or not r_get.ok:
            return Response(
                {
                    "detail": "Error leyendo usuario",
                    "status_code": getattr(r_get, "status_code", None),
                    "text": getattr(r_get, "text", None),
                },
                status=getattr(r_get, "status_code", status.HTTP_502_BAD_GATEWAY),
            )
        try:
            user_repr = r_get.json()
        except Exception:
            return Response(
                {"detail": "Error decodificando usuario desde Keycloak"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        allowed_fields = {"enabled", "firstName", "lastName", "email", "username"}
        changed = False
        for k, v in request.data.items():
            if k in allowed_fields:
                user_repr[k] = v
                changed = True
        if not changed:
            return Response(
                {"detail": "No hay campos permitidos para actualizar"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        r_put, tried_put = _keycloak_request(
            admin_token, "PUT", base_path, json_data=user_repr
        )
        if not r_put:
            return Response(
                {"detail": "No response from Keycloak (put)", "tried": tried_put},
                status=status.HTTP_502_BAD_GATEWAY,
            )
        if r_put.status_code in (204, 200):
            if "enabled" in request.data:
                try:
                    local_username = user_repr.get("username")
                    if local_username:
                        local_users = User.objects.filter(
                            username__iexact=local_username
                        )
                        for lu in local_users:
                            lu.is_active = bool(request.data.get("enabled"))
                            lu.save()
                except Exception:
                    logger.exception("Error sincronizando usuario local enabled flag")
            return Response({"detail": "Usuario actualizado en Keycloak"})
        else:
            return Response(
                {
                    "detail": "Error actualizando usuario",
                    "status_code": r_put.status_code,
                    "text": r_put.text,
                },
                status=r_put.status_code,
            )


@api_view(["GET"])
@permission_classes([IsRealmAdmin])
def keycloak_list_roles(request):
    """Lista todos los roles del realm configurado."""
    try:
        admin_token = get_admin_token(realm=settings.KEYCLOAK_CONFIG.get("KEYCLOAK_REALM"))
    except Exception as e:
        logger.exception("No se pudo obtener token admin para listar roles: %s", e)
        return Response(
            {"detail": "Error obteniendo token admin", "error": str(e)},
            status=status.HTTP_502_BAD_GATEWAY,
        )

    path = f"/admin/realms/{settings.KEYCLOAK_CONFIG.get('KEYCLOAK_REALM')}/roles"
    r, tried = _keycloak_request(admin_token, "GET", path)
    if not r:
        return Response(
            {"detail": "No response from Keycloak", "tried": tried},
            status=status.HTTP_502_BAD_GATEWAY,
        )
    try:
        return Response(r.json())
    except Exception:
        return Response(
            {"detail": "OK but could not decode JSON", "status_code": r.status_code, "text": r.text},
            status=r.status_code,
        )


@api_view(["GET"])
@permission_classes([IsRealmAdmin])
def keycloak_user_roles(request, user_id):
    try:
        admin_token = get_admin_token(realm=settings.KEYCLOAK_CONFIG.get("KEYCLOAK_REALM"))
    except Exception as e:
        logger.exception("No se pudo obtener token admin para roles de usuario: %s", e)
        return Response(
            {"detail": "Error obteniendo token admin", "error": str(e)},
            status=status.HTTP_502_BAD_GATEWAY,
        )

    path = f"/admin/realms/{settings.KEYCLOAK_CONFIG.get('KEYCLOAK_REALM')}/users/{user_id}/role-mappings"
    r, tried = _keycloak_request(admin_token, "GET", path)
    if not r:
        return Response(
            {"detail": "No response from Keycloak", "tried": tried},
            status=status.HTTP_502_BAD_GATEWAY,
        )
    try:
        return Response(r.json())
    except Exception:
        return Response(
            {"detail": "OK but could not decode JSON", "status_code": r.status_code, "text": r.text},
            status=r.status_code,
        )


@api_view(["POST"])
@permission_classes([IsRealmAdmin])
def keycloak_assign_roles(request, user_id):
    """
    Body esperado (ejemplos):
    {
      "realm_roles": ["admin", "editor"]
    }
    o
    {
      "client_roles": {"client_id": "my-client", "roles": ["role-a", "role-b"]}
    }
    Puede incluir ambos campos para asignar en conjunto.
    """
    try:
        admin_token = get_admin_token(realm=settings.KEYCLOAK_CONFIG.get("KEYCLOAK_REALM"))
    except Exception as e:
        logger.exception("No se pudo obtener token admin para asignación de roles: %s", e)
        return Response(
            {"detail": "Error obteniendo token admin", "error": str(e)},
            status=status.HTTP_502_BAD_GATEWAY,
        )

    realm_roles = request.data.get("realm_roles") or []
    client_roles_spec = request.data.get("client_roles")

    results = {}
    if realm_roles:
        ok, err = assign_realm_roles_helper(admin_token, user_id, realm_roles)
        results["realm_roles"] = {"ok": ok, "error": err}

    if client_roles_spec and isinstance(client_roles_spec, dict):
        client_id = client_roles_spec.get("client_id")
        roles = client_roles_spec.get("roles") or []
        if client_id and roles:
            ok, err = assign_client_roles_helper(admin_token, user_id, client_id, roles)
            results["client_roles"] = {"ok": ok, "error": err}
        else:
            results["client_roles"] = {"ok": False, "error": "invalid_client_roles_spec"}

    if not results:
        return Response({"detail": "No se proporcionaron roles para asignar"}, status=status.HTTP_400_BAD_REQUEST)

    all_ok = all(v.get("ok") for v in results.values())
    status_code = status.HTTP_200_OK if all_ok else 207
    return Response({"results": results}, status=status_code)


# -----------------------
# USER ENDPOINTS
# -----------------------


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def user_me(request):
    user = request.user
    claims = _get_claims_from_request(request) or {}

    roles = []
    try:
        if isinstance(claims, dict):
            realm_roles = claims.get("realm_access", {}).get("roles", []) or []
            roles.extend(realm_roles)
            resource_access = claims.get("resource_access", {}) or {}
            for client_obj in resource_access.values():
                client_roles = client_obj.get("roles", []) or []
                roles.extend(client_roles)
    except Exception:
        roles = []

    roles = list({r.lower() for r in roles})
    allowed = {"admin", "editor", "base_user"}
    roles = [r for r in roles if r in allowed]

    is_admin_flag = "admin" in roles
    is_editor_flag = "editor" in roles
    is_base_flag = "base_user" in roles

    return Response(
        {
            "is_staff": user.is_staff,
            "is_admin": is_admin_flag,
            "is_editor": is_editor_flag,
            "is_base_user": is_base_flag,
            "roles": roles,
        }
    )


# -----------------------
# ASSESSMENTS
# -----------------------


class AssessmentTemplateViewSet(viewsets.ModelViewSet):
    queryset = AssessmentTemplate.objects.all()
    serializer_class = AssessmentTemplateSerializer
    permission_classes = [IsEditor]  # editor or admin


class AssessmentTemplateListView(generics.ListAPIView):
    queryset = AssessmentTemplate.objects.prefetch_related("questions").all()
    serializer_class = AssessmentTemplateSerializer
    permission_classes = [AllowAny]


@api_view(["POST", "PUT"])
@permission_classes([IsEditor])
def assessment_template_create_update(request):
    if request.method == "POST":
        serializer = AssessmentTemplateSerializer(data=request.data)
    else:
        try:
            template = AssessmentTemplate.objects.get(id=request.data.get("id"))
        except AssessmentTemplate.DoesNotExist:
            return Response(
                {"detail": "AssessmentTemplate no encontrado"},
                status=status.HTTP_404_NOT_FOUND,
            )
        serializer = AssessmentTemplateSerializer(template, data=request.data)

    if serializer.is_valid():
        serializer.save()
        return Response(
            serializer.data,
            status=(
                status.HTTP_201_CREATED
                if request.method == "POST"
                else status.HTTP_200_OK
            ),
        )

    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(["POST"])
@permission_classes([IsEditor])
def import_assessment_template(request):
    serializer = AssessmentTemplateSerializer(data=request.data)
    if serializer.is_valid():
        assessment = serializer.save()
        return Response(
            AssessmentTemplateSerializer(assessment).data,
            status=status.HTTP_201_CREATED,
        )
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class UserAssessmentListView(generics.ListAPIView):
    serializer_class = UserAssessmentSerializer
    permission_classes = [IsBaseUser]

    def get_queryset(self):
        return UserAssessment.objects.filter(user=self.request.user)


class StartUserAssessmentView(APIView):
    """Solo los usuarios base_user y los administradores pueden iniciar evaluaciones;
    los usuarios con rol 'editor' no pueden iniciar evaluaciones."""
    permission_classes = [CanStartAssessment]

    def post(self, request):
        try:
            assessment_template_id = request.data.get("assessment_template_id")
            name = request.data.get("name", "")

            if not assessment_template_id:
                return Response(
                    {"detail": "assessment_template_id is required"},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            try:
                template = AssessmentTemplate.objects.get(id=assessment_template_id)
            except AssessmentTemplate.DoesNotExist:
                return Response(
                    {"detail": "Assessment template not found"},
                    status=status.HTTP_404_NOT_FOUND,
                )

            is_realm_admin = request.user.groups.filter(name="admin").exists()
            if not is_realm_admin:
                has_access = AssessmentAccess.objects.filter(
                    user=request.user, assessment=template, status="approved"
                ).exists()
                if not has_access:
                    return Response(
                        {
                            "detail": "Acceso no aprobado para este assessment. Solicítalo primero."
                        },
                        status=status.HTTP_403_FORBIDDEN,
                    )

            user_assessment = UserAssessment.objects.create(
                user=request.user, assessment_template=template, name=name
            )

            for question in template.questions.all():
                UserAnswer.objects.create(
                    user_assessment=user_assessment, question_template=question
                )

            serializer = UserAssessmentSerializer(
                user_assessment, context={"request": request}
            )
            return Response(serializer.data)
        except Exception as e:
            logger.exception(
                f"Error iniciando UserAssessment (template_id={request.data.get('assessment_template_id')}) : {e}"
            )
            return Response(
                {
                    "detail": "Error iniciando assessment",
                    "error": str(e),
                },
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )


class UserAssessmentDetailView(APIView):
    permission_classes = [IsBaseUser]

    def get(self, request, pk):
        is_realm_admin = (
            getattr(request.user, "is_staff", False)
            or request.user.groups.filter(name="admin").exists()
        )
        if is_realm_admin:
            user_assessment = get_object_or_404(UserAssessment, pk=pk)
        else:
            user_assessment = get_object_or_404(
                UserAssessment, pk=pk, user=request.user
            )
        serializer = UserAssessmentSerializer(
            user_assessment, context={"request": request}
        )
        return Response(serializer.data)


class AdminUserAssessmentDetailView(APIView):
    permission_classes = [IsRealmAdmin]

    def get(self, request, pk):
        ua = get_object_or_404(UserAssessment, pk=pk)
        serializer = UserAssessmentSerializer(ua, context={"request": request})
        return Response(serializer.data)


class AdminUserAssessmentListView(generics.ListAPIView):
    """Lista todas las UserAssessment para administradores del realm."""
    permission_classes = [IsRealmAdmin]
    serializer_class = UserAssessmentSerializer

    def get_queryset(self):
        return UserAssessment.objects.all().select_related("assessment_template", "user")


class AdminUserAssessmentDeleteView(APIView):
    permission_classes = [IsRealmAdmin]

    def delete(self, request, pk):
        """Permite al administrador eliminar cualquier UserAssessment."""
        ua = get_object_or_404(UserAssessment, pk=pk)
        owner_id = getattr(ua.user, "id", None)
        logger.info(
            f"Admin user {request.user} deleting UserAssessment id={pk} owner={owner_id}"
        )
        ua.delete()
        return Response(
            {"detail": "UserAssessment eliminado por admin."},
            status=status.HTTP_204_NO_CONTENT,
        )


class FinalizeUserAssessmentView(APIView):
    permission_classes = [IsBaseUser]

    def post(self, request, pk):
        user_assessment = get_object_or_404(UserAssessment, pk=pk, user=request.user)

        if user_assessment.completed:
            return Response(
                {"detail": "Assessment ya fue finalizado."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        user_assessment.completed = True
        user_assessment.save()

        return Response({"detail": "Assessment finalizado correctamente."})


class UserAnswerUpdateView(generics.UpdateAPIView):
    serializer_class = UserAnswerSerializer
    permission_classes = [IsBaseUser]

    def get_queryset(self):
        return UserAnswer.objects.filter(user_assessment__user=self.request.user)


@api_view(["DELETE"])
@permission_classes([IsBaseUser])
def delete_user_assessment(request, pk):
    user_assessment = get_object_or_404(UserAssessment, pk=pk, user=request.user)
    user_assessment.delete()
    return Response(
        {"detail": "UserAssessment eliminado correctamente."},
        status=status.HTTP_204_NO_CONTENT,
    )


class AssessmentTemplateDetailView(generics.RetrieveUpdateAPIView):
    queryset = AssessmentTemplate.objects.all()
    serializer_class = AssessmentTemplateSerializer


# -----------------------
# ACCESS REQUESTS
# -----------------------


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def request_assessment_access(request, pk):
    """
    Crea o reestablece a 'pending' la solicitud de acceso del usuario autenticado
    para el assessment con id=pk. Devuelve el estado actual.
    """
    try:
        assessment = AssessmentTemplate.objects.get(pk=pk)
    except AssessmentTemplate.DoesNotExist:
        return Response(
            {"detail": "Assessment no encontrado"}, status=status.HTTP_404_NOT_FOUND
        )

    try:
        access, created = AssessmentAccess.objects.get_or_create(
            user=request.user,
            assessment=assessment,
            defaults={"status": AssessmentAccess.STATUS_PENDING},
        )
    except IntegrityError:
        access = AssessmentAccess.objects.get(user=request.user, assessment=assessment)
        created = False

    if not created and access.status in (
        AssessmentAccess.STATUS_DENIED,
        AssessmentAccess.STATUS_PENDING,
    ):
        access.status = AssessmentAccess.STATUS_PENDING
        access.save()

    return Response({"status": access.status})


class AssessmentAccessViewSet(viewsets.ModelViewSet):
    queryset = AssessmentAccess.objects.select_related("user", "assessment").all()
    serializer_class = AssessmentAccessSerializer
    permission_classes = [IsRealmAdmin]

    def get_queryset(self):
        qs = super().get_queryset().order_by("-created_at")
        status_param = self.request.query_params.get("status")
        user_id = self.request.query_params.get("user")
        assessment_id = self.request.query_params.get("assessment")
        if status_param:
            qs = qs.filter(status=status_param)
        if user_id:
            qs = qs.filter(user_id=user_id)
        if assessment_id:
            qs = qs.filter(assessment_id=assessment_id)
        return qs

    @action(detail=True, methods=["post"])
    def approve(self, request, pk=None):
        access = self.get_object()
        access.status = AssessmentAccess.STATUS_APPROVED
        access.save()
        return Response(self.get_serializer(access).data)

    @action(detail=True, methods=["post"])
    def deny(self, request, pk=None):
        access = self.get_object()
        access.status = AssessmentAccess.STATUS_DENIED
        access.save()
        return Response(self.get_serializer(access).data)


# -----------------------
# QUESTIONS
# -----------------------


class QuestionListCreateView(generics.ListCreateAPIView):
    queryset = QuestionTemplate.objects.all()
    serializer_class = QuestionTemplateSerializer
    permission_classes = [IsRealmAdmin]  # ��


class QuestionRetrieveUpdateDestroyView(generics.RetrieveUpdateDestroyAPIView):
    queryset = QuestionTemplate.objects.all()
    serializer_class = QuestionTemplateSerializer
    permission_classes = [IsRealmAdmin]  # ��


# -----------------------
# ANALYSIS
# -----------------------


@api_view(["GET"])
@permission_classes([IsRealmAdmin])
def assessment_analysis(request, user_assessment_id):
    try:
        ua = UserAssessment.objects.get(id=user_assessment_id)
    except UserAssessment.DoesNotExist:
        return Response({"error": "UserAssessment no encontrado"}, status=404)

    answers = ua.answers.select_related(
        "question_template__area", "selected_option__option_set"
    )

    selected_options = [a.selected_option for a in answers if a.selected_option]
    used_option_set_ids = set(opt.option_set_id for opt in selected_options)

    option_set_mappings = {}
    for option_set in AnswerOptionSet.objects.filter(
        id__in=used_option_set_ids
    ).prefetch_related("options"):
        option_set_mappings[option_set.id] = {
            opt.value: opt.label for opt in option_set.options.all()
        }

    area_stats = defaultdict(lambda: defaultdict(int))
    total_controls = 0
    total_fully_compliant = 0

    for answer in answers:
        area_name = answer.question_template.area.name

        if answer.selected_option:
            raw_value = answer.selected_option.value
            option_set_id = answer.selected_option.option_set_id
            label = option_set_mappings.get(option_set_id, {}).get(raw_value, raw_value)
        else:
            raw_value = "na"
            label = "N/A"

        area_stats[area_name][label] += 1
        total_controls += 1

        if raw_value.lower() in ["yes", "sí", "si"]:
            total_fully_compliant += 1

    bar_chart_data = []
    for area, counts in area_stats.items():
        entry = {"area": area}
        entry.update(counts)
        bar_chart_data.append(entry)

    yes_labels = set()
    for mapping in option_set_mappings.values():
        for value, label in mapping.items():
            if value.lower() in ["yes", "sí", "si"]:
                yes_labels.add(label)

    spider_chart_data = []
    for area, counts in area_stats.items():
        total_area = sum(counts.values())
        yes_count = sum(count for label, count in counts.items() if label in yes_labels)
        porcentaje = (yes_count / total_area * 100) if total_area else 0
        spider_chart_data.append({"area": area, "porcentaje": porcentaje})

    percent_fully_compliant = (
        (total_fully_compliant / total_controls * 100) if total_controls else 0
    )

    return Response(
        {
            "pie": {
                "percent_fully_compliant": percent_fully_compliant,
                "total_controls": total_controls,
            },
            "bar": bar_chart_data,
            "spider": spider_chart_data,
        }
    )


class AnswerOptionSetViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = AnswerOptionSet.objects.all()
    serializer_class = AnswerOptionSetSerializer
    permission_classes = [IsAuthenticated]


class QuestionAreaListCreateView(generics.ListCreateAPIView):
    queryset = QuestionArea.objects.all()
    serializer_class = QuestionAreaSerializer


class ExportUserAssessmentCSV(APIView):
    permission_classes = [IsBaseUser]

    def get(self, request, assessment_id):
        is_realm_admin = (
            getattr(request.user, "is_staff", False)
            or request.user.groups.filter(name="admin").exists()
        )
        if is_realm_admin:
            user_assessment = get_object_or_404(UserAssessment, pk=assessment_id)
        else:
            user_assessment = get_object_or_404(
                UserAssessment, pk=assessment_id, user=request.user
            )

        response = HttpResponse(
            content_type="text/csv",
            headers={
                "Content-Disposition": f'attachment; filename="assessment_{assessment_id}.csv"'
            },
        )
        response.write(codecs.BOM_UTF8)

        writer = csv.writer(response)

        writer.writerow(["Assessment Name", user_assessment.name])
        writer.writerow(["Template", user_assessment.assessment_template.title])
        writer.writerow(["Date", user_assessment.started_at.strftime("%Y-%m-%d %H:%M")])
        writer.writerow([])

        writer.writerow(["Question", "Selected Option", "Marked for Review"])

        for answer in user_assessment.answers.select_related(
            "question_template", "selected_option"
        ):
            question_text = answer.question_template.text
            selected_label = (
                answer.selected_option.label if answer.selected_option else ""
            )
            marked = "Yes" if answer.marked_for_review else "No"
            writer.writerow([question_text, selected_label, marked])

        return response


# -----------------------
# CREATE USER IN KEYCLOAK
# -----------------------


@api_view(["POST"])
@permission_classes([IsRealmAdmin])
def create_keycloak_user(request):
    """
    Crea un usuario en Keycloak usando el token de admin.
    Solo accesible para usuarios del grupo 'admin'.
    """
    try:
        username = request.data.get("username")
        email = request.data.get("email")
        password = request.data.get("password")
        first_name = request.data.get("first_name", "")
        last_name = request.data.get("last_name", "")

        if not username or not email or not password:
            return Response(
                {"detail": "username, email y password son obligatorios"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        admin_token = None
        tried_admin_realms = []

        configured_realm = settings.KEYCLOAK_CONFIG.get("KEYCLOAK_REALM")
        if configured_realm:
            try:
                tried_admin_realms.append(configured_realm)
                admin_token = get_admin_token(realm=configured_realm)
            except Exception as e:
                logger.debug("Fallo al obtener admin token para realm configurado '%s': %s", configured_realm, e)

        if not admin_token:
            try:
                tried_admin_realms.append("master")
                admin_token = get_admin_token(realm="master")
            except Exception as e:
                logger.error("No se pudo obtener admin token. Realms probados: %s. Error: %s", tried_admin_realms, e)
                return Response(
                    {"detail": "No se pudo obtener token de administrador", "tried": tried_admin_realms},
                    status=status.HTTP_502_BAD_GATEWAY,
                )

        if not configured_realm:
            return Response(
                {"detail": "KEYCLOAK_REALM no está configurado en settings"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        create_path = f"/admin/realms/{configured_realm}/users"
        payload = {
            "username": username,
            "email": email,
            "firstName": first_name,
            "lastName": last_name,
            "enabled": True,
            "emailVerified": False,
            "credentials": [
                {"type": "password", "value": password, "temporary": False}
            ],
        }

        r, tried_urls = _request_post_with_fallback(admin_token, create_path, json_data=payload)
        if not r:
            return Response(
                {"detail": "No hubo respuesta de Keycloak", "tried": tried_urls},
                status=status.HTTP_502_BAD_GATEWAY,
            )

        if r.status_code in (200, 201):
            return Response({"detail": "Usuario creado en Keycloak"}, status=status.HTTP_201_CREATED)
        if r.status_code == 409:
            return Response(
                {"detail": "Usuario ya existe en Keycloak", "status_code": r.status_code, "text": r.text},
                status=status.HTTP_409_CONFLICT,
            )

        try:
            body = r.json()
        except Exception:
            body = {"text": getattr(r, "text", None)}

        return Response(
            {"detail": "Error creando usuario en Keycloak", "status_code": r.status_code, "body": body},
            status=r.status_code,
        )

    except Exception:
        logger.exception("Error no controlado en create_keycloak_user")
        return Response({"detail": "Error interno"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)



