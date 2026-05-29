from rest_framework import serializers

from .models import *


# ----------------------------
# SERIALIZER PARA PREGUNTAS Y RESPUESTAS
# ----------------------------
class AnswerOptionSerializer(serializers.ModelSerializer):
    class Meta:
        model = AnswerOption
        fields = ["id", "value", "label"]


class AnswerOptionSetSerializer(serializers.ModelSerializer):
    options = AnswerOptionSerializer(many=True, read_only=True)

    class Meta:
        model = AnswerOptionSet
        fields = ["name", "options"]


class QuestionTemplateSerializer(serializers.ModelSerializer):
    option_set = serializers.CharField(allow_null=True, required=False)
    area = serializers.CharField()

    options = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = QuestionTemplate
        fields = ["id", "text", "option_set", "area", "options"]
        extra_kwargs = {"id": {"read_only": False, "required": False}}

    def get_options(self, obj):
        """Obtener opciones de respuesta para la pregunta."""
        if obj.option_set:
            return AnswerOptionSerializer(obj.option_set.options.all(), many=True).data
        return []


class QuestionAreaSerializer(serializers.ModelSerializer):
    class Meta:
        model = QuestionArea
        fields = ["id", "name"]


# ----------------------------
# SERIALIZER PARA TEMPLATES DE ASSESSMENT
# Incluye preguntas anidadas
# ----------------------------
class AssessmentTemplateSerializer(serializers.ModelSerializer):
    questions = QuestionTemplateSerializer(many=True)
    has_access = serializers.SerializerMethodField()
    access_requested = serializers.SerializerMethodField()
    access_status = serializers.SerializerMethodField()

    class Meta:
        model = AssessmentTemplate
        fields = [
            "id",
            "title",
            "description",
            "created_at",
            "questions",
            "has_access",
            "access_requested",
            "access_status",
        ]
        read_only_fields = ["created_at"]

    def get_has_access(self, obj):
        """Determinar si el usuario tiene acceso al assessment."""
        user = self.context["request"].user
        # Los administradores pueden empezar cualquier assessment sin pedir acceso
        if not user or not user.is_authenticated:
            return False
        if (
            getattr(user, "is_staff", False)
            or user.groups.filter(name="admin").exists()
        ):
            return True
        return AssessmentAccess.objects.filter(
            user=user, assessment=obj, status="approved"
        ).exists()

    def get_access_requested(self, obj):
        """Verificar si se ha solicitado acceso al assessment."""
        user = self.context["request"].user
        # Los administradores no necesitan solicitar acceso
        if not user or not user.is_authenticated:
            return False
        if (
            getattr(user, "is_staff", False)
            or user.groups.filter(name="admin").exists()
        ):
            return False
        return AssessmentAccess.objects.filter(
            user=user, assessment=obj, status__in=["pending", "denied"]
        ).exists()

    def get_access_status(self, obj):
        """Obtener el estado de acceso del usuario al assessment."""
        user = self.context["request"].user
        if not user or not user.is_authenticated:
            return "none"
        if (
            getattr(user, "is_staff", False)
            or user.groups.filter(name="admin").exists()
        ):
            return "approved"
        req = (
            AssessmentAccess.objects.filter(user=user, assessment=obj)
            .order_by("-updated_at", "-created_at")
            .first()
        )
        return req.status if req else "none"

    def create(self, validated_data):
        questions_data = validated_data.pop("questions", [])
        assessment = AssessmentTemplate.objects.create(**validated_data)

        for question_data in questions_data:
            q_id = question_data.pop("id", None)
            option_set_name = question_data.pop("option_set", None)
            area_name = question_data.pop("area")

            option_set = None
            if option_set_name:
                option_set, _ = AnswerOptionSet.objects.get_or_create(
                    name=option_set_name
                )

            area, _ = QuestionArea.objects.get_or_create(name=area_name)

            if q_id:
                try:
                    question = QuestionTemplate.objects.get(id=q_id)
                except QuestionTemplate.DoesNotExist:
                    raise serializers.ValidationError(
                        f"Pregunta con id {q_id} no existe."
                    )
            else:
                question = QuestionTemplate.objects.create(
                    option_set=option_set, area=area, **question_data
                )

            assessment.questions.add(question)

        return assessment

    def update(self, instance, validated_data):
        questions_data = validated_data.pop("questions", [])

        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()

        current_questions = instance.questions.all()
        current_ids = set(q.id for q in current_questions)
        new_ids = set()

        for question_data in questions_data:
            q_id = question_data.get("id", None)
            option_set_name = question_data.pop("option_set", None)
            area_name = question_data.pop("area")

            option_set = None
            if option_set_name:
                option_set, _ = AnswerOptionSet.objects.get_or_create(
                    name=option_set_name
                )

            area, _ = QuestionArea.objects.get_or_create(name=area_name)

            if q_id:
                try:
                    question = QuestionTemplate.objects.get(id=q_id)
                except QuestionTemplate.DoesNotExist:
                    raise serializers.ValidationError(
                        f"Pregunta con id {q_id} no existe."
                    )

                question.text = question_data.get("text", question.text)
                question.option_set = option_set
                question.area = area
                question.save()

                if question not in current_questions:
                    instance.questions.add(question)

                new_ids.add(q_id)

            else:
                question = QuestionTemplate.objects.create(
                    option_set=option_set, area=area, **question_data
                )
                instance.questions.add(question)
                new_ids.add(question.pk)

        # Quitar preguntas que no están en el nuevo listado
        for q in current_questions:
            if q.id not in new_ids:
                instance.questions.remove(q)

        return instance


# ----------------------------
# SERIALIZER PARA RESPUESTAS DE USUARIO
# Incluye pregunta anidada en modo lectura
# ----------------------------
class UserAnswerSerializer(serializers.ModelSerializer):
    question_template = QuestionTemplateSerializer(read_only=True)
    selected_option = serializers.PrimaryKeyRelatedField(
        queryset=AnswerOption.objects.all(), required=False
    )
    selected_option_text = serializers.CharField(
        source="selected_option.label", read_only=True
    )

    class Meta:
        model = UserAnswer
        fields = ["id", "question_template", "selected_option", "selected_option_text"]


# ----------------------------
# SERIALIZER PARA ASSESSMENTS DE USUARIO
# Incluye template y respuestas anidadas
# ----------------------------
class UserAssessmentSerializer(serializers.ModelSerializer):
    assessment_template = AssessmentTemplateSerializer(read_only=True)
    answers = UserAnswerSerializer(many=True, read_only=True)
    name = serializers.CharField(required=False, allow_blank=True)
    user_username = serializers.SerializerMethodField()
    user_email = serializers.SerializerMethodField()
    user_anonymized = serializers.SerializerMethodField()

    class Meta:
        model = UserAssessment
        fields = [
            "id",
            "assessment_template",
            "started_at",
            "completed",
            "answers",
            "name",
            "user_username",
            "user_email",
            "user_anonymized",
        ]

    def get_user_username(self, obj):
        # If user exists and is_active, prefer real username; otherwise use snapshot or 'Unknown'
        if obj.user and getattr(obj.user, "is_active", True):
            try:
                return obj.user.username
            except Exception:
                pass
        return obj.user_username_snapshot or "Usuario desconocido"

    def get_user_email(self, obj):
        if obj.user and getattr(obj.user, "is_active", True):
            try:
                return obj.user.email
            except Exception:
                pass
        return obj.user_email_snapshot or ""

    def get_user_anonymized(self, obj):
        # User is considered anonymized when the FK is null or the user is inactive
        if not obj.user:
            return True
        try:
            return not getattr(obj.user, 'is_active', True)
        except Exception:
            return True


# ----------------------------
# SERIALIZER PARA SOLICITUDES DE ACCESO (ADMIN)
# ----------------------------
class AssessmentAccessSerializer(serializers.ModelSerializer):
    username = serializers.CharField(source="user.username", read_only=True)
    assessment_title = serializers.CharField(source="assessment.title", read_only=True)

    class Meta:
        model = AssessmentAccess
        fields = [
            "id",
            "user",
            "username",
            "assessment",
            "assessment_title",
            "status",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["created_at", "updated_at"]

    def validate(self, attrs):
        # En creación, asegurar unicidad por (user, assessment)
        user = attrs.get("user") or getattr(self.instance, "user", None)
        assessment = attrs.get("assessment") or getattr(
            self.instance, "assessment", None
        )
        if user and assessment:
            qs = AssessmentAccess.objects.filter(user=user, assessment=assessment)
            if self.instance:
                qs = qs.exclude(pk=self.instance.pk)
            if qs.exists():
                raise serializers.ValidationError(
                    "Ya existe una solicitud para este usuario y assessment."
                )
        return attrs
