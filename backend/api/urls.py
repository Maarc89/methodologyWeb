from rest_framework.routers import DefaultRouter
from django.urls import path, include
from rest_framework.authtoken.views import obtain_auth_token
from .views import *

router = DefaultRouter()
# Ruta solo para admin (CRUD)
router.register(r'assessments-admin', AssessmentTemplateViewSet, basename='assessment-template')

urlpatterns = [
    # Ruta pública o para usuarios autenticados (solo listar)
    path('assessments/', AssessmentTemplateListView.as_view(), name='assessment-list'),

    path('', include(router.urls)),

    # Otras rutas que tienes
    path('assessments/create/', create_assessment, name='create-assessment'),
    path('assessments/<int:pk>/', AssessmentTemplateDetailView.as_view(), name='assessment-detail'),
    path('user-assessments/', UserAssessmentListView.as_view(), name='user-assessment-list'),
    path('user-assessments/start/', StartUserAssessmentView.as_view(), name='start-user-assessment'),
    path('user-assessments/answers/<int:pk>/', UserAnswerUpdateView.as_view(), name='user-answer-update'),
    path('user-assessments/<int:pk>/', UserAssessmentDetailView.as_view(), name='user-assessment-detail'),

    # Auth
    path('auth/login/', obtain_auth_token),
    path('auth/register/', register, name='register'),
    path('auth/user/', UserDetailView.as_view(), name='user-detail'),
    path('auth/settings/update/', update_user_settings, name='update-user-settings'),
    path('users/me/', user_me, name='user-me'),
]
