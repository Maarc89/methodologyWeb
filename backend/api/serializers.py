from rest_framework import serializers
from .models import AssessmentTemplate, QuestionTemplate, UserAssessment, UserAnswer


# ----------------------------
# SERIALIZER PARA PREGUNTAS
# ----------------------------
class QuestionTemplateSerializer(serializers.ModelSerializer):
    class Meta:
        model = QuestionTemplate
        fields = ['id', 'text']


# ----------------------------
# SERIALIZER PARA TEMPLATES DE ASSESSMENT
# Incluye preguntas anidadas
# ----------------------------
class AssessmentTemplateSerializer(serializers.ModelSerializer):
    questions = QuestionTemplateSerializer(many=True)

    class Meta:
        model = AssessmentTemplate
        fields = ['id', 'title', 'created_at', 'questions']
        read_only_fields = ['created_at']

    def create(self, validated_data):
        """
        Crear AssessmentTemplate con preguntas anidadas.
        """
        questions_data = validated_data.pop('questions', [])
        assessment = AssessmentTemplate.objects.create(**validated_data)

        for question_data in questions_data:
            QuestionTemplate.objects.create(assessment_template=assessment, **question_data)

        return assessment

    def update(self, instance, validated_data):
        """
        Actualizar AssessmentTemplate y preguntas asociadas.
        Méthod eficiente para sincronizar preguntas:
         - Actualiza preguntas existentes
         - Crea nuevas preguntas
         - Elimina preguntas no presentes
        """
        questions_data = validated_data.pop('questions', None)
        instance.title = validated_data.get('title', instance.title)
        instance.save()

        if questions_data is not None:
            existing_ids = [q.id for q in instance.questions.all()]
            sent_ids = [q.get('id') for q in questions_data if q.get('id')]

            # Eliminar preguntas que no vienen en el payload
            for question_id in existing_ids:
                if question_id not in sent_ids:
                    QuestionTemplate.objects.filter(id=question_id).delete()

            # Crear o actualizar preguntas
            for question_data in questions_data:
                question_id = question_data.get('id', None)
                if question_id and question_id in existing_ids:
                    # Actualizar pregunta existente
                    question = QuestionTemplate.objects.get(id=question_id)
                    question.text = question_data.get('text', question.text)
                    question.save()
                else:
                    # Crear nueva pregunta
                    QuestionTemplate.objects.create(assessment_template=instance, **question_data)

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
