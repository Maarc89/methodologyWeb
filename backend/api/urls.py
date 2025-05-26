from django.urls import path
from .views import (
    register,
    AssessmentTemplateListView,
    UserAssessmentListView,
    StartUserAssessmentView,
    UserAnswerUpdateView,
    UserAssessmentDetailView,
    user_me,
    create_assessment
)
from rest_framework.authtoken.views import obtain_auth_token
from .views import UserDetailView

urlpatterns = [
    path('assessments/', AssessmentTemplateListView.as_view(), name='assessment-template-list'),
    path('user-assessments/', UserAssessmentListView.as_view(), name='user-assessment-list'),
    path('user-assessments/start/', StartUserAssessmentView.as_view(), name='start-user-assessment'),
    path('user-assessments/answers/<int:pk>/', UserAnswerUpdateView.as_view(), name='user-answer-update'),
    path('user-assessments/<int:pk>/', UserAssessmentDetailView.as_view(), name='user-assessment-detail'),
    path('auth/login/', obtain_auth_token),
    path('auth/register/', register, name='register'),
    path('auth/user/', UserDetailView.as_view(), name='user-detail'),
    path('users/me/', user_me, name='user-me'),
    path('assessments/create/', create_assessment, name='create-assessment'),
]
