from rest_framework.decorators import api_view, permission_classes
from django.contrib.auth.models import User
from rest_framework.authtoken.models import Token
from rest_framework.permissions import AllowAny
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from .models import UserAssessment
from .serializers import UserAssessmentSerializer
from .models import AssessmentTemplate
from .serializers import AssessmentTemplateSerializer
from rest_framework import generics
from .models import UserAnswer
from .serializers import UserAnswerSerializer
from rest_framework.permissions import IsAuthenticated
from django.shortcuts import get_object_or_404


class AssessmentTemplateListView(generics.ListAPIView):
    queryset = AssessmentTemplate.objects.all()
    serializer_class = AssessmentTemplateSerializer
    permission_classes = [AllowAny]


class UserAssessmentListView(generics.ListAPIView):
    serializer_class = UserAssessmentSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return UserAssessment.objects.filter(user=self.request.user)


class StartUserAssessmentView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        assessment_template_id = request.data.get('assessment_template_id')
        if not assessment_template_id:
            return Response({'detail': 'assessment_template_id is required'}, status=status.HTTP_400_BAD_REQUEST)
        try:
            template = AssessmentTemplate.objects.get(id=assessment_template_id)
        except AssessmentTemplate.DoesNotExist:
            return Response({'detail': 'Assessment template not found'}, status=status.HTTP_404_NOT_FOUND)

        user_assessment, created = UserAssessment.objects.get_or_create(
            user=request.user,
            assessment_template=template
        )
        if created:
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
        user_assessment = get_object_or_404(UserAssessment, pk=pk, user=request.user)
        serializer = UserAssessmentSerializer(user_assessment)
        return Response(serializer.data)


class UserAnswerUpdateView(generics.UpdateAPIView):
    queryset = UserAnswer.objects.all()
    serializer_class = UserAnswerSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        # Para asegurarnos que el usuario solo puede modificar sus propias respuestas
        return UserAnswer.objects.filter(user_assessment__user=self.request.user)


@api_view(['POST'])
@permission_classes([AllowAny])
def register(request):
    if request.method == 'POST':
        username = request.data.get('username')
        email = request.data.get('email')
        password = request.data.get('password')

        if not username or not email or not password:
            return Response({'detail': 'Please provide all fields'}, status=status.HTTP_400_BAD_REQUEST)

        user = User.objects.create_user(username=username, email=email, password=password)
        token = Token.objects.create(user=user)

        return Response({'token': token.key}, status=status.HTTP_201_CREATED)
    return None


class UserDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        return Response({
            'username': user.username,
            'email': user.email,
        })
