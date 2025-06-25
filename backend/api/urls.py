from rest_framework.routers import DefaultRouter
from django.urls import path, include
from rest_framework.authtoken.views import obtain_auth_token
from .views import *

router = DefaultRouter()
# Ruta solo para admin (CRUD)
router.register(r'assessments-admin', AssessmentTemplateViewSet, basename='assessment-template')
router.register(r'answer-option-sets', AnswerOptionSetViewSet, basename='answer-option-set')

urlpatterns = [
    # Ruta pública o para usuarios autenticados (solo listar)
    path('assessments/', AssessmentTemplateListView.as_view(), name='assessment-list'),

    path('', include(router.urls)),

    # Rutas de assessments y questions
    path('assessment-templates/', assessment_template_create_update, name='assessment-template-create-update'),
    path('assessment-templates/import/', import_assessment_template, name='assessment-template-import'),
    path('assessments/<int:pk>/', AssessmentTemplateDetailView.as_view(), name='assessment-detail'),
    path('user-assessments/', UserAssessmentListView.as_view(), name='user-assessment-list'),
    path('user-assessments/start/', StartUserAssessmentView.as_view(), name='start-user-assessment'),
    path('user-assessments/answers/<int:pk>/', UserAnswerUpdateView.as_view(), name='user-answer-update'),
    path('user-assessments/<int:pk>/', UserAssessmentDetailView.as_view(), name='user-assessment-detail'),
    path('questions/', QuestionListCreateView.as_view(), name='question-list-create'),
    path('questions/<int:pk>/', QuestionRetrieveUpdateDestroyView.as_view(), name='question-detail'),
    path('question-areas/', QuestionAreaListCreateView.as_view(), name='question-areas'),
    path('user-assessments/<int:pk>/finalize/', FinalizeUserAssessmentView.as_view(), name='finalize-assessment'),
    path('user-assessments/<int:pk>/delete/', delete_user_assessment, name='delete-assessment'),
    path('user-assessments/<int:user_assessment_id>/analysis/', assessment_analysis, name='assessment-analysis'),

    # Auth
    path('auth/login/', obtain_auth_token, name='login'),
    path('auth/register/', register, name='register'),
    path('auth/user/', UserDetailView.as_view(), name='user-detail'),
    path('auth/settings/update/', update_user_settings, name='update-user-settings'),
    path('users/me/', user_me, name='user-me'),
]
