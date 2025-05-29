from rest_framework import serializers
from .models import AssessmentTemplate, QuestionTemplate, UserAssessment, UserAnswer


# ----------------------------
# SERIALIZER PARA PREGUNTAS
# ----------------------------
class QuestionTemplateSerializer(serializers.ModelSerializer):
    class Meta:
        model = QuestionTemplate
        fields = ['id', 'text']
        extra_kwargs = {'id': {'read_only': False, 'required': False}}


# ----------------------------
# SERIALIZER PARA TEMPLATES DE ASSESSMENT
# Incluye preguntas anidadas
# ----------------------------
class AssessmentTemplateSerializer(serializers.ModelSerializer):
    questions = QuestionTemplateSerializer(many=True, read_only=True)

    class Meta:
        model = AssessmentTemplate
        fields = ['id', 'title', 'description', 'created_at', 'questions']

    def create(self, validated_data):
        questions_data = validated_data.pop('questions', [])
        assessment = AssessmentTemplate.objects.create(**validated_data)

        for question_data in questions_data:
            question = QuestionTemplate.objects.create(**question_data)
            assessment.questions.add(question)

        return assessment

    def update(self, instance, validated_data):
        questions_data = validated_data.pop('questions', None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()

        if questions_data is not None:
            # Para simplificar, borramos las preguntas actuales y creamos nuevas
            instance.questions.clear()
            for question_data in questions_data:
                question = QuestionTemplate.objects.create(**question_data)
                instance.questions.add(question)

        return instance


# ----------------------------
# SERIALIZER PARA RESPUESTAS DE USUARIO
# Incluye pregunta anidada en modo lectura
# ----------------------------
class UserAnswerSerializer(serializers.ModelSerializer):
    question_template = QuestionTemplateSerializer(read_only=True)

    class Meta:
        model = UserAnswer
        fields = ['id', 'question_template', 'answer']


# ----------------------------
# SERIALIZER PARA ASSESSMENTS DE USUARIO
# Incluye template y respuestas anidadas
# ----------------------------
class UserAssessmentSerializer(serializers.ModelSerializer):
    assessment_template = AssessmentTemplateSerializer(read_only=True)
    answers = UserAnswerSerializer(many=True, read_only=True)
    name = serializers.CharField(required=False, allow_blank=True)

    class Meta:
        model = UserAssessment
        fields = ['id', 'assessment_template', 'started_at', 'completed', 'answers', 'name']
