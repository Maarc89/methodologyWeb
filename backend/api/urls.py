from django.urls import include, path
from rest_framework.routers import DefaultRouter

from . import views

router = DefaultRouter()
# Ruta solo para admin (CRUD)
router.register(
    r"assessments-admin",
    views.AssessmentTemplateViewSet,
    basename="assessment-template",
)
router.register(
    r"answer-option-sets", views.AnswerOptionSetViewSet, basename="answer-option-set"
)
router.register(
    r"assessment-access", views.AssessmentAccessViewSet, basename="assessment-access"
)

urlpatterns = [
    # Ruta pública o para usuarios autenticados (solo listar)
    path(
        "assessments/",
        views.AssessmentTemplateListView.as_view(),
        name="assessment-list",
    ),
    path(
        "assessments/<int:pk>/request-access/",
        views.request_assessment_access,
        name="assessment-request-access",
    ),
    path("", include(router.urls)),
    # Crear usuario a Keycloak
    path(
        "keycloak/create-user/", views.create_keycloak_user, name="create_keycloak_user"
    ),
    # Gestion usuarios Keycloak
    path("keycloak/users/", views.keycloak_list_users, name="keycloak-list-users"),
    path(
        "keycloak/users/<str:user_id>/",
        views.keycloak_user_detail,
        name="keycloak-user-detail",
    ),
    # Roles management
    path("keycloak/roles/", views.keycloak_list_roles, name="keycloak-list-roles"),
    path(
        "keycloak/users/<str:user_id>/roles/",
        views.keycloak_user_roles,
        name="keycloak-user-roles",
    ),
    path(
        "keycloak/users/<str:user_id>/assign-roles/",
        views.keycloak_assign_roles,
        name="keycloak-assign-roles",
    ),
    # Rutas de assessments y questions
    path(
        "assessment-templates/",
        views.assessment_template_create_update,
        name="assessment-template-create-update",
    ),
    path(
        "assessment-templates/import/",
        views.import_assessment_template,
        name="assessment-template-import",
    ),
    path(
        "assessments/<int:pk>/",
        views.AssessmentTemplateDetailView.as_view(),
        name="assessment-detail",
    ),
    path(
        "user-assessments/",
        views.UserAssessmentListView.as_view(),
        name="user-assessment-list",
    ),
    path(
        "user-assessments/start/",
        views.StartUserAssessmentView.as_view(),
        name="start-user-assessment",
    ),
    path(
        "user-assessments/answers/<int:pk>/",
        views.UserAnswerUpdateView.as_view(),
        name="user-answer-update",
    ),
    path(
        "user-assessments/<int:pk>/",
        views.UserAssessmentDetailView.as_view(),
        name="user-assessment-detail",
    ),
    path(
        "questions/",
        views.QuestionListCreateView.as_view(),
        name="question-list-create",
    ),
    path(
        "questions/<int:pk>/",
        views.QuestionRetrieveUpdateDestroyView.as_view(),
        name="question-detail",
    ),
    path(
        "question-areas/",
        views.QuestionAreaListCreateView.as_view(),
        name="question-areas",
    ),
    path(
        "user-assessments/<int:pk>/finalize/",
        views.FinalizeUserAssessmentView.as_view(),
        name="finalize-assessment",
    ),
    path(
        "user-assessments/<int:pk>/delete/",
        views.delete_user_assessment,
        name="delete-assessment",
    ),
    path(
        "user-assessments/<int:user_assessment_id>/analysis/",
        views.assessment_analysis,
        name="assessment-analysis",
    ),
    path(
        "export-user-assessment-csv/<int:assessment_id>/",
        views.ExportUserAssessmentCSV.as_view(),
        name="export_user_assessment_csv",
    ),
    # Admin endpoint: listar todas las user assessments
    path(
        "admin/user-assessments/",
        views.AdminUserAssessmentListView.as_view(),
        name="admin-user-assessments",
    ),
    path(
        "admin/user-assessments/<int:pk>/",
        views.AdminUserAssessmentDetailView.as_view(),
        name="admin-user-assessment-detail",
    ),
    path(
        "admin/user-assessments/<int:pk>/delete/",
        views.AdminUserAssessmentDeleteView.as_view(),
        name="admin-user-assessment-delete",
    ),
    #    path('auth/user/', UserDetailView.as_view(), name='user-detail'),
    #    path('auth/settings/update/', update_user_settings, name='update-user-settings'),
    path("users/me/", views.user_me, name="user-me"),
]
