from django.urls import path
from .views import QuestionViewSet, AssessmentViewSet, register
from rest_framework.authtoken.views import obtain_auth_token


urlpatterns = [
    path('assessments/', AssessmentViewSet.as_view({'get': 'list', 'post': 'create'})),
    path('assessments/<int:pk>/', AssessmentViewSet.as_view({'get': 'retrieve', 'patch': 'partial_update'})),
    path('questions/<int:pk>/', QuestionViewSet.as_view({'patch': 'partial_update'})),
    path('auth/login/', obtain_auth_token),
    path('auth/register/', register, name='register'),
]

