from django.contrib.auth.models import Group, User
from rest_framework.test import APITestCase

from .models import AssessmentAccess, AssessmentTemplate, UserAssessment


class StartUserAssessmentTests(APITestCase):
    def setUp(self):
        # Crear grupos
        self.editor_group, _ = Group.objects.get_or_create(name="editor")
        self.base_group, _ = Group.objects.get_or_create(name="base_user")
        self.admin_group, _ = Group.objects.get_or_create(name="admin")

        # Crear usuarios
        self.editor_user = User.objects.create_user(username="editor1", password="pass")
        self.editor_user.groups.add(self.editor_group)

        self.base_user = User.objects.create_user(username="base1", password="pass")
        self.base_user.groups.add(self.base_group)

        self.admin_user = User.objects.create_user(
            username="admin1", password="pass", is_staff=True
        )
        self.admin_user.groups.add(self.admin_group)

        # Crear un assessment template simple
        self.template = AssessmentTemplate.objects.create(
            title="Test Template", description="desc"
        )

        # Crear AssessmentAccess aprobado para base_user
        AssessmentAccess.objects.create(
            user=self.base_user,
            assessment=self.template,
            status=AssessmentAccess.STATUS_APPROVED,
        )

        # APITestCase already provides self.client (an APIClient)

        # Endpoint path (router/urls should expose this path)
        # Usamos ruta absoluta según proyecto: /api/user-assessments/start/
        self.url = "/api/user-assessments/start/"

    def test_editor_cannot_start_assessment(self):
        # Autenticar como editor
        self.client.force_authenticate(user=self.editor_user)
        resp = self.client.post(
            self.url,
            data={"assessment_template_id": self.template.id, "name": "try by editor"},
            format="json",
        )
        self.assertEqual(
            resp.status_code,
            403,
            f"Expected 403 for editor starting assessment, got {resp.status_code} body: {resp.data}",
        )

    def test_base_user_can_start_assessment(self):
        # Autenticar como base_user (has approved access)
        self.client.force_authenticate(user=self.base_user)
        resp = self.client.post(
            self.url,
            data={"assessment_template_id": self.template.id, "name": "base run"},
            format="json",
        )
        # Should succeed and create a UserAssessment
        self.assertIn(
            resp.status_code,
            (200, 201),
            f"Expected 200 or 201, got {resp.status_code} body: {resp.data}",
        )
        # Verify created
        created = UserAssessment.objects.filter(
            user=self.base_user, assessment_template=self.template
        )
        self.assertTrue(
            created.exists(), "UserAssessment was not created for base_user"
        )

    def test_admin_can_start_without_approval(self):
        # Admin should bypass approval
        self.client.force_authenticate(user=self.admin_user)
        resp = self.client.post(
            self.url,
            data={"assessment_template_id": self.template.id, "name": "admin run"},
            format="json",
        )
        self.assertIn(
            resp.status_code,
            (200, 201),
            f"Admin could not start assessment: {resp.status_code} {resp.data}",
        )
        created = UserAssessment.objects.filter(
            user=self.admin_user, assessment_template=self.template
        )
        self.assertTrue(created.exists(), "UserAssessment not created for admin")
