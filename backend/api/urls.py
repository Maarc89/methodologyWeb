from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import QuestionViewSet, AssessmentViewSet

router = DefaultRouter()
router.register(r'assessments', AssessmentViewSet)
router.register(r'questions', QuestionViewSet)

urlpatterns = [
    path('', include(router.urls)),
]

