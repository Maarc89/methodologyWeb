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


class RequestAssessmentAccessTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(username="requester", password="pass")
        self.template = AssessmentTemplate.objects.create(
            title="Access Template", description="desc"
        )
        self.url = f"/api/assessments/{self.template.id}/request-access/"

    def test_unauthenticated_user_cannot_request_access(self):
        response = self.client.post(self.url, format="json")
        self.assertEqual(response.status_code, 401)

    def test_creates_pending_access_if_not_exists(self):
        self.client.force_authenticate(user=self.user)
        response = self.client.post(self.url, format="json")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["status"], AssessmentAccess.STATUS_PENDING)

        access = AssessmentAccess.objects.get(user=self.user, assessment=self.template)
        self.assertEqual(access.status, AssessmentAccess.STATUS_PENDING)

    def test_resets_denied_access_back_to_pending(self):
        AssessmentAccess.objects.create(
            user=self.user,
            assessment=self.template,
            status=AssessmentAccess.STATUS_DENIED,
        )

        self.client.force_authenticate(user=self.user)
        response = self.client.post(self.url, format="json")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["status"], AssessmentAccess.STATUS_PENDING)

        access = AssessmentAccess.objects.get(user=self.user, assessment=self.template)
        self.assertEqual(access.status, AssessmentAccess.STATUS_PENDING)

    def test_keeps_approved_access_as_approved(self):
        AssessmentAccess.objects.create(
            user=self.user,
            assessment=self.template,
            status=AssessmentAccess.STATUS_APPROVED,
        )

        self.client.force_authenticate(user=self.user)
        response = self.client.post(self.url, format="json")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["status"], AssessmentAccess.STATUS_APPROVED)

        access = AssessmentAccess.objects.get(user=self.user, assessment=self.template)
        self.assertEqual(access.status, AssessmentAccess.STATUS_APPROVED)


class UserMeEndpointTests(APITestCase):
    def setUp(self):
        self.editor_group, _ = Group.objects.get_or_create(name="editor")
        self.base_group, _ = Group.objects.get_or_create(name="base_user")
        self.admin_group, _ = Group.objects.get_or_create(name="admin")

        self.user = User.objects.create_user(username="roleuser", password="pass")
        self.url = "/api/users/me/"

    def test_requires_authentication(self):
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, 401)

    def test_returns_role_flags_for_authenticated_user(self):
        self.user.groups.add(self.editor_group, self.base_group)
        self.client.force_authenticate(user=self.user)

        response = self.client.get(self.url)

        self.assertEqual(response.status_code, 200)
        self.assertFalse(response.data["is_staff"])
        self.assertFalse(response.data["is_admin"])
        self.assertTrue(response.data["is_editor"])
        self.assertTrue(response.data["is_base_user"])
        self.assertEqual(sorted(response.data["roles"]), ["base_user", "editor"])

    def test_admin_group_sets_is_admin_even_without_staff_flag(self):
        self.user.groups.add(self.admin_group)
        self.client.force_authenticate(user=self.user)

        response = self.client.get(self.url)

        self.assertEqual(response.status_code, 200)
        self.assertFalse(response.data["is_staff"])
        self.assertTrue(response.data["is_admin"])
        self.assertIn("admin", response.data["roles"])
