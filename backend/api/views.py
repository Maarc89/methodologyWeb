import csv, codecs

from django.contrib.auth.models import Group
from django.contrib.auth import update_session_auth_hash
from django.contrib.auth.decorators import login_required
from django.db import IntegrityError
from django.shortcuts import get_object_or_404

from rest_framework import generics, status, viewsets
from rest_framework.authtoken.models import Token
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from django.http import HttpResponse

from collections import defaultdict

from .models import *
from .permissions import CanStartAssessment, IsBaseUser, IsEditor, IsRealmAdmin
from .serializers import (
    AssessmentAccessSerializer,
    AssessmentTemplateSerializer,
    UserAssessmentSerializer,
    UserAnswerSerializer,
    QuestionTemplateSerializer,
    AnswerOptionSetSerializer,
    QuestionAreaSerializer,
)


# -----------------------
# KEYCLOAK-STYLE ADMIN ENDPOINTS (Django-backed replacements)
# -----------------------


@api_view(['GET'])
@permission_classes([IsRealmAdmin])
def keycloak_roles(request):
    """
    Dev endpoint that returns available realm roles (maps to Django groups).
    Returns: { roles: [..] }
    """
    roles = [g.name for g in Group.objects.filter(name__in=["admin", "editor", "base_user"]) ]
    return Response({'roles': roles})


@api_view(['POST'])
@permission_classes([IsRealmAdmin])
def keycloak_create_user(request):
    """
    Create a Django user (admin-only). Accepts same payload the frontend used for Keycloak.
    Returns basic user info and any role assignment errors under `role_assignment_errors`.
    """
    data = request.data
    username = data.get('username')
    email = data.get('email')
    password = data.get('password')
    enabled = data.get('enabled', True)
    first_name = data.get('first_name', '')
    last_name = data.get('last_name', '')
    roles = data.get('roles', [])

    if not username or not email or not password:
        return Response({'detail': 'username, email and password required'}, status=status.HTTP_400_BAD_REQUEST)

    if User.objects.filter(username=username).exists():
        return Response({'detail': 'Username already exists'}, status=status.HTTP_400_BAD_REQUEST)
    if User.objects.filter(email=email).exists():
        return Response({'detail': 'Email already exists'}, status=status.HTTP_400_BAD_REQUEST)

    user = User.objects.create_user(username=username, email=email, password=password,
                                    first_name=first_name, last_name=last_name)
    user.is_active = bool(enabled)
    user.save()

    _ensure_default_groups()
    role_assignment_errors = []
    for r in roles:
        try:
            g, _ = Group.objects.get_or_create(name=r)
            user.groups.add(g)
        except Exception as e:
            role_assignment_errors.append({r: str(e)})

    resp = {
        'id': user.id,
        'username': user.username,
        'email': user.email,
    }
    if role_assignment_errors:
        resp['role_assignment_errors'] = role_assignment_errors

    return Response(resp, status=status.HTTP_201_CREATED)


@api_view(['GET'])
@permission_classes([IsRealmAdmin])
def keycloak_users_list(request):
    """
    List users. Supports simple pagination via `first` and `max`, and filters `username` or `email`.
    Returns an array of users.
    """
    first = int(request.query_params.get('first') or 0)
    maxn = int(request.query_params.get('max') or 50)
    username = request.query_params.get('username') or request.query_params.get('user')
    email = request.query_params.get('email')

    qs = User.objects.all().order_by('id')
    if username:
        qs = qs.filter(username__icontains=username)
    if email:
        qs = qs.filter(email__icontains=email)

    users = qs[first:first+maxn]
    result = []
    for u in users:
        result.append({
            'id': u.id,
            'username': u.username,
            'email': u.email,
            'firstName': u.first_name,
            'lastName': u.last_name,
            'enabled': u.is_active,
        })
    return Response(result)


@api_view(['GET', 'PATCH', 'DELETE'])
@permission_classes([IsRealmAdmin])
def keycloak_user_detail(request, pk):
    try:
        u = User.objects.get(pk=pk)
    except User.DoesNotExist:
        return Response({'detail': 'User not found'}, status=status.HTTP_404_NOT_FOUND)

    if request.method == 'GET':
        return Response({
            'id': u.id,
            'username': u.username,
            'email': u.email,
            'firstName': u.first_name,
            'lastName': u.last_name,
            'enabled': u.is_active,
        })

    if request.method == 'PATCH':
        enabled = request.data.get('enabled')
        if enabled is not None:
            u.is_active = bool(enabled)
        # allow partial update of other fields if desired
        if 'firstName' in request.data:
            u.first_name = request.data.get('firstName')
        if 'lastName' in request.data:
            u.last_name = request.data.get('lastName')
        u.save()
        return Response({'detail': 'User updated'})

    # DELETE
    u.delete()
    return Response({'detail': 'User deleted'}, status=status.HTTP_204_NO_CONTENT)


@api_view(['GET'])
@permission_classes([IsRealmAdmin])
def keycloak_user_roles(request, pk):
    try:
        u = User.objects.get(pk=pk)
    except User.DoesNotExist:
        return Response({'detail': 'User not found'}, status=status.HTTP_404_NOT_FOUND)

    realm_roles = [g.name for g in u.groups.all()]
    return Response({'realm_roles': realm_roles, 'client_roles': {}})


@api_view(['POST'])
@permission_classes([IsRealmAdmin])
def keycloak_user_assign_roles(request, pk):
    try:
        u = User.objects.get(pk=pk)
    except User.DoesNotExist:
        return Response({'detail': 'User not found'}, status=status.HTTP_404_NOT_FOUND)

    roles = request.data.get('roles', [])
    _ensure_default_groups()
    # remove known realm roles then add selected
    all_role_names = set(g.name for g in Group.objects.filter(name__in=['admin', 'editor', 'base_user']))
    # remove existing role groups that are in our set
    for g in u.groups.filter(name__in=all_role_names):
        u.groups.remove(g)

    errors = []
    for r in roles:
        try:
            g, _ = Group.objects.get_or_create(name=r)
            u.groups.add(g)
        except Exception as e:
            errors.append({r: str(e)})

    resp = {'detail': 'roles updated'}
    if errors:
        resp['errors'] = errors
    return Response(resp)



def _ensure_default_groups():
    for group_name in ["admin", "editor", "base_user"]:
        Group.objects.get_or_create(name=group_name)


def _is_realm_admin(user):
    return bool(
        user
        and getattr(user, "is_authenticated", False)
        and (
            getattr(user, "is_staff", False)
            or user.groups.filter(name="admin").exists()
        )
    )


# -----------------------
# USER REGISTRATION & PROFILE
# -----------------------

@api_view(['POST'])
@permission_classes([AllowAny])
def register(request):
    """
    Registro de usuario nuevo. Devuelve token.
    """
    username = request.data.get('username')
    email = request.data.get('email')
    password = request.data.get('password')

    if not username or not email or not password:
        return Response({'detail': 'Please provide all fields'}, status=status.HTTP_400_BAD_REQUEST)

    if User.objects.filter(username=username).exists():
        return Response({'detail': 'Username already exists'}, status=status.HTTP_400_BAD_REQUEST)
    if User.objects.filter(email=email).exists():
        return Response({'detail': 'Email already exists'}, status=status.HTTP_400_BAD_REQUEST)

    user = User.objects.create_user(username=username, email=email, password=password)
    _ensure_default_groups()
    user.groups.add(Group.objects.get(name='base_user'))
    token = Token.objects.create(user=user)

    return Response({'token': token.key}, status=status.HTTP_201_CREATED)


class UserDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        """
        Devuelve información básica del usuario autenticado.
        """
        user = request.user
        return Response({
            'username': user.username,
            'email': user.email,
        })


@api_view(['PUT'])
@permission_classes([IsAuthenticated])
def update_user_settings(request):
    """
    Actualiza email y/o contraseña del usuario.
    """
    user = request.user
    data = request.data

    email = data.get('email')
    password = data.get('password')
    new_password = data.get('new_password')

    if email:
        user.email = email

    if password and new_password:
        if not user.check_password(password):
            return Response({'detail': 'Incorrect current password'}, status=status.HTTP_400_BAD_REQUEST)
        user.set_password(new_password)
        update_session_auth_hash(request, user)

    user.save()
    return Response({'detail': 'User updated successfully'})


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def user_me(request):
    """
    Retorna datos de usuario y roles locales de Django para frontend.
    """
    user = request.user
    roles = sorted({g.name for g in user.groups.all()})
    return Response({
        'is_staff': user.is_staff,
        'is_admin': user.is_staff or 'admin' in roles,
        'is_editor': 'editor' in roles,
        'is_base_user': 'base_user' in roles,
        'roles': roles,
    })


# -----------------------
# ASSESSMENTS
# -----------------------

class AssessmentTemplateViewSet(viewsets.ModelViewSet):
    """
    CRUD para templates de assessment solo para admins.
    """
    queryset = AssessmentTemplate.objects.all()
    serializer_class = AssessmentTemplateSerializer
    permission_classes = [IsEditor]


class AssessmentTemplateListView(generics.ListAPIView):
    """
    Lista pública de templates de assessment (permitido a cualquiera).
    """
    queryset = AssessmentTemplate.objects.prefetch_related('questions').all()
    serializer_class = AssessmentTemplateSerializer
    permission_classes = [AllowAny]


@api_view(['POST', 'PUT'])
@permission_classes([IsEditor])
def assessment_template_create_update(request):
    """
    Crear o actualizar una plantilla de assessment con preguntas nuevas o existentes.
    - POST para crear
    - PUT para actualizar (requiere id en el body)
    """

    if request.method == 'POST':
        serializer = AssessmentTemplateSerializer(data=request.data)
    else:  # PUT
        try:
            template = AssessmentTemplate.objects.get(id=request.data.get('id'))
            print(template)
        except AssessmentTemplate.DoesNotExist:
            return Response({'detail': 'AssessmentTemplate no encontrado'}, status=status.HTTP_404_NOT_FOUND)
        serializer = AssessmentTemplateSerializer(template, data=request.data)

    if serializer.is_valid():
        serializer.save()
        return Response(serializer.data,
                        status=status.HTTP_201_CREATED if request.method == 'POST' else status.HTTP_200_OK)

    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
@permission_classes([IsEditor])
def import_assessment_template(request):
    """
    Importar una plantilla de assessment desde JSON externo.
    Usa el mismo serializer que la creación.
    """
    serializer = AssessmentTemplateSerializer(data=request.data)
    if serializer.is_valid():
        assessment = serializer.save()
        return Response(AssessmentTemplateSerializer(assessment).data, status=status.HTTP_201_CREATED)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class UserAssessmentListView(generics.ListAPIView):
    """
    Lista los assessments iniciados por el usuario autenticado.
    """
    serializer_class = UserAssessmentSerializer
    permission_classes = [IsBaseUser]

    def get_queryset(self):
        return UserAssessment.objects.filter(user=self.request.user)


class StartUserAssessmentView(APIView):
    permission_classes = [CanStartAssessment]

    def post(self, request):
        """
        Inicia un assessment para el usuario, con un nombre opcional.
        """
        assessment_template_id = request.data.get('assessment_template_id')
        name = request.data.get('name', '')  # Recoger el nombre del formulario, por defecto vacío

        if not assessment_template_id:
            return Response({'detail': 'assessment_template_id is required'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            template = AssessmentTemplate.objects.get(id=assessment_template_id)
        except AssessmentTemplate.DoesNotExist:
            return Response({'detail': 'Assessment template not found'}, status=status.HTTP_404_NOT_FOUND)

        if not _is_realm_admin(request.user):
            has_access = AssessmentAccess.objects.filter(
                user=request.user,
                assessment=template,
                status=AssessmentAccess.STATUS_APPROVED,
            ).exists()
            if not has_access:
                return Response(
                    {'detail': 'Acceso no aprobado para este assessment. Solicítalo primero.'},
                    status=status.HTTP_403_FORBIDDEN,
                )

        # Crear uno nuevo (sin usar get_or_create)
        user_assessment = UserAssessment.objects.create(
            user=request.user,
            assessment_template=template,
            name=name
        )

        # Crear respuestas vacías para cada pregunta del template
        for question in template.questions.all():
            UserAnswer.objects.create(
                user_assessment=user_assessment,
                question_template=question
            )

        serializer = UserAssessmentSerializer(user_assessment)
        return Response(serializer.data)


class UserAssessmentDetailView(APIView):
    permission_classes = [IsBaseUser]

    def get(self, request, pk):
        """
        Detalles de un assessment iniciado por el usuario.
        """
        if _is_realm_admin(request.user):
            user_assessment = get_object_or_404(UserAssessment, pk=pk)
        else:
            user_assessment = get_object_or_404(UserAssessment, pk=pk, user=request.user)
        serializer = UserAssessmentSerializer(user_assessment)
        return Response(serializer.data)


class FinalizeUserAssessmentView(APIView):
    permission_classes = [IsBaseUser]

    def post(self, request, pk):
        user_assessment = get_object_or_404(UserAssessment, pk=pk, user=request.user)

        if user_assessment.completed:
            return Response({'detail': 'Assessment ya fue finalizado.'}, status=status.HTTP_400_BAD_REQUEST)

        user_assessment.completed = True
        user_assessment.save()

        return Response({'detail': 'Assessment finalizado correctamente.'})


class UserAnswerUpdateView(generics.UpdateAPIView):
    """
    Actualizar una respuesta de usuario a una pregunta.
    """
    serializer_class = UserAnswerSerializer
    permission_classes = [IsBaseUser]

    def get_queryset(self):
        # Solo permitir modificar respuestas propias
        return UserAnswer.objects.filter(user_assessment__user=self.request.user)


@api_view(['DELETE'])
@permission_classes([IsBaseUser])
def delete_user_assessment(request, pk):
    """
    Elimina un UserAssessment propio del usuario autenticado.
    """
    user_assessment = get_object_or_404(UserAssessment, pk=pk, user=request.user)
    user_assessment.delete()
    return Response({'detail': 'UserAssessment eliminado correctamente.'}, status=status.HTTP_204_NO_CONTENT)


class AssessmentTemplateDetailView(generics.RetrieveUpdateAPIView):
    queryset = AssessmentTemplate.objects.all()
    serializer_class = AssessmentTemplateSerializer


# -----------------------
# ACCESS REQUESTS
# -----------------------


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def request_assessment_access(request, pk):
    """
    Crea o reestablece a 'pending' la solicitud de acceso del usuario autenticado
    para el assessment con id=pk. Devuelve el estado actual.
    """
    try:
        assessment = AssessmentTemplate.objects.get(pk=pk)
    except AssessmentTemplate.DoesNotExist:
        return Response({'detail': 'Assessment no encontrado'}, status=status.HTTP_404_NOT_FOUND)

    try:
        access, created = AssessmentAccess.objects.get_or_create(
            user=request.user,
            assessment=assessment,
            defaults={'status': AssessmentAccess.STATUS_PENDING},
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

    return Response({'status': access.status})


class AssessmentAccessViewSet(viewsets.ModelViewSet):
    queryset = AssessmentAccess.objects.select_related('user', 'assessment').all()
    serializer_class = AssessmentAccessSerializer
    permission_classes = [IsRealmAdmin]

    def get_queryset(self):
        qs = super().get_queryset().order_by('-created_at')
        status_param = self.request.query_params.get('status')
        user_id = self.request.query_params.get('user')
        assessment_id = self.request.query_params.get('assessment')
        if status_param:
            qs = qs.filter(status=status_param)
        if user_id:
            qs = qs.filter(user_id=user_id)
        if assessment_id:
            qs = qs.filter(assessment_id=assessment_id)
        return qs

    @action(detail=True, methods=['post'])
    def approve(self, request, pk=None):
        access = self.get_object()
        access.status = AssessmentAccess.STATUS_APPROVED
        access.save()
        return Response(self.get_serializer(access).data)

    @action(detail=True, methods=['post'])
    def deny(self, request, pk=None):
        access = self.get_object()
        access.status = AssessmentAccess.STATUS_DENIED
        access.save()
        return Response(self.get_serializer(access).data)


class AdminUserAssessmentListView(generics.ListAPIView):
    """Lista todas las UserAssessment para administradores del realm."""
    permission_classes = [IsRealmAdmin]
    serializer_class = UserAssessmentSerializer

    def get_queryset(self):
        return UserAssessment.objects.all().select_related('assessment_template', 'user')


class AdminUserAssessmentDetailView(APIView):
    permission_classes = [IsRealmAdmin]

    def get(self, request, pk):
        ua = get_object_or_404(UserAssessment, pk=pk)
        serializer = UserAssessmentSerializer(ua)
        return Response(serializer.data)


class AdminUserAssessmentDeleteView(APIView):
    permission_classes = [IsRealmAdmin]

    def delete(self, request, pk):
        ua = get_object_or_404(UserAssessment, pk=pk)
        ua.delete()
        return Response({'detail': 'UserAssessment eliminado por admin.'}, status=status.HTTP_204_NO_CONTENT)


# -----------------------
# QUESTIONS
# -----------------------

class QuestionListCreateView(generics.ListCreateAPIView):
    queryset = QuestionTemplate.objects.all()
    serializer_class = QuestionTemplateSerializer
    permission_classes = [IsRealmAdmin]


# -----------------------
# ASSESSMENT ANALYSIS
# -----------------------

class QuestionRetrieveUpdateDestroyView(generics.RetrieveUpdateDestroyAPIView):
    queryset = QuestionTemplate.objects.all()
    serializer_class = QuestionTemplateSerializer
    permission_classes = [IsRealmAdmin]


from collections import defaultdict
from rest_framework.decorators import api_view
from rest_framework.response import Response
from .models import UserAssessment, AnswerOptionSet


@api_view(['GET'])
@permission_classes([IsRealmAdmin])
def assessment_analysis(request, user_assessment_id):
    try:
        ua = UserAssessment.objects.get(id=user_assessment_id)
    except UserAssessment.DoesNotExist:
        return Response({'error': 'UserAssessment no encontrado'}, status=404)

    answers = ua.answers.select_related(
        'question_template__area',
        'selected_option__option_set'
    )

    # Paso 1: Crear un mapeo de option_set_id -> {value -> label}
    selected_options = [a.selected_option for a in answers if a.selected_option]
    used_option_set_ids = set(opt.option_set_id for opt in selected_options)

    option_set_mappings = {}
    for option_set in AnswerOptionSet.objects.filter(id__in=used_option_set_ids).prefetch_related('options'):
        option_set_mappings[option_set.id] = {
            opt.value: opt.label for opt in option_set.options.all()
        }

    # Paso 2: Inicializar estructuras
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
            raw_value = 'na'
            label = 'N/A'

        area_stats[area_name][label] += 1
        total_controls += 1

        if raw_value.lower() in ['yes', 'sí', 'si']:
            total_fully_compliant += 1

    # Paso 3: Preparar datos para gráfico de barras
    bar_chart_data = []
    for area, counts in area_stats.items():
        entry = {'area': area}
        entry.update(counts)
        bar_chart_data.append(entry)

    # Paso 4: Determinar qué labels representan "yes"
    yes_labels = set()
    for mapping in option_set_mappings.values():
        for value, label in mapping.items():
            if value.lower() in ['yes', 'sí', 'si']:
                yes_labels.add(label)

    # Paso 5: Preparar datos para gráfico de araña
    spider_chart_data = []
    for area, counts in area_stats.items():
        total_area = sum(counts.values())
        yes_count = sum(count for label, count in counts.items() if label in yes_labels)
        porcentaje = (yes_count / total_area * 100) if total_area else 0
        spider_chart_data.append({
            'area': area,
            'porcentaje': porcentaje
        })

    percent_fully_compliant = (total_fully_compliant / total_controls * 100) if total_controls else 0

    return Response({
        'pie': {
            'percent_fully_compliant': percent_fully_compliant,
            'total_controls': total_controls,
        },
        'bar': bar_chart_data,
        'spider': spider_chart_data,
    })


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
        if _is_realm_admin(request.user):
            user_assessment = get_object_or_404(UserAssessment, pk=assessment_id)
        else:
            user_assessment = get_object_or_404(UserAssessment, pk=assessment_id, user=request.user)

        # Prepara la respuesta CSV con encabezados adecuados
        response = HttpResponse(
            content_type='text/csv',
            headers={'Content-Disposition': f'attachment; filename="assessment_{assessment_id}.csv"'},
        )
        # Escribe el BOM UTF-8 para que Excel reconozca bien la codificación
        response.write(codecs.BOM_UTF8)

        writer = csv.writer(response)

        # Escribe cabeceras
        writer.writerow(['Assessment Name', user_assessment.name])
        writer.writerow(['Template', user_assessment.assessment_template.title])
        writer.writerow(['Date', user_assessment.started_at.strftime("%Y-%m-%d %H:%M")])
        writer.writerow([])  # línea vacía

        # Escribe columnas
        writer.writerow(['Question', 'Selected Option', 'Marked for Review'])

        # Escribe cada respuesta
        for answer in user_assessment.answers.select_related('question_template', 'selected_option'):
            question_text = answer.question_template.text
            selected_label = answer.selected_option.label if answer.selected_option else ''
            marked = 'Yes' if answer.marked_for_review else 'No'
            writer.writerow([question_text, selected_label, marked])

        return response
