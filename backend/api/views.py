from django.contrib.auth import update_session_auth_hash
from django.shortcuts import get_object_or_404

from rest_framework import generics, status, viewsets
from rest_framework.authtoken.models import Token
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated, IsAdminUser
from rest_framework.response import Response
from rest_framework.views import APIView

from collections import defaultdict

from .models import *
from .serializers import (
    AssessmentTemplateSerializer,
    UserAssessmentSerializer,
    UserAnswerSerializer,
    QuestionTemplateSerializer,
    AnswerOptionSetSerializer,
    QuestionAreaSerializer,
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
    Retorna datos de usuario para frontend (ejemplo: is_staff).
    """
    user = request.user
    return Response({'is_staff': user.is_staff})


# -----------------------
# ASSESSMENTS
# -----------------------

class AssessmentTemplateViewSet(viewsets.ModelViewSet):
    """
    CRUD para templates de assessment solo para admins.
    """
    queryset = AssessmentTemplate.objects.all()
    serializer_class = AssessmentTemplateSerializer
    permission_classes = [IsAdminUser]


class AssessmentTemplateListView(generics.ListAPIView):
    """
    Lista pública de templates de assessment (permitido a cualquiera).
    """
    queryset = AssessmentTemplate.objects.prefetch_related('questions').all()
    serializer_class = AssessmentTemplateSerializer
    permission_classes = [AllowAny]


@api_view(['POST', 'PUT'])
@permission_classes([IsAdminUser])
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
@permission_classes([IsAdminUser])
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
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return UserAssessment.objects.filter(user=self.request.user)


class StartUserAssessmentView(APIView):
    permission_classes = [IsAuthenticated]

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
    permission_classes = [IsAuthenticated]

    def get(self, request, pk):
        """
        Detalles de un assessment iniciado por el usuario.
        """
        user_assessment = get_object_or_404(UserAssessment, pk=pk, user=request.user)
        serializer = UserAssessmentSerializer(user_assessment)
        return Response(serializer.data)


class FinalizeUserAssessmentView(APIView):
    permission_classes = [IsAuthenticated]

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
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        # Solo permitir modificar respuestas propias
        return UserAnswer.objects.filter(user_assessment__user=self.request.user)


@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
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
# QUESTIONS
# -----------------------

class QuestionListCreateView(generics.ListCreateAPIView):
    queryset = QuestionTemplate.objects.all()
    serializer_class = QuestionTemplateSerializer
    permission_classes = [IsAdminUser]


# -----------------------
# ASSESSMENT ANALYSIS
# -----------------------

class QuestionRetrieveUpdateDestroyView(generics.RetrieveUpdateDestroyAPIView):
    queryset = QuestionTemplate.objects.all()
    serializer_class = QuestionTemplateSerializer
    permission_classes = [IsAdminUser]


from collections import defaultdict
from rest_framework.decorators import api_view
from rest_framework.response import Response
from .models import UserAssessment, AnswerOptionSet


@api_view(['GET'])
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
