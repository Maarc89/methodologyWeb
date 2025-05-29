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
    questions = QuestionTemplateSerializer(many=True)

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
        questions_data = validated_data.pop('questions')

        # Actualizar campos normales del assessment
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()

        # Obtener preguntas actuales asociadas al assessment
        current_questions = instance.questions.all()
        current_ids = set(q.id for q in current_questions)
        new_ids = set()

        for question_data in questions_data:
            q_id = question_data.get('id', None)

            if q_id:  # Pregunta existente -> actualizar
                try:
                    question = QuestionTemplate.objects.get(id=q_id)
                except QuestionTemplate.DoesNotExist:
                    raise serializers.ValidationError(f'Pregunta con id {q_id} no existe.')

                # Actualizar texto
                question.text = question_data.get('text', question.text)
                question.save()

                # Asegurar que la pregunta está asociada al assessment
                if question not in current_questions:
                    instance.questions.add(question)

                new_ids.add(q_id)

            else:  # Pregunta nueva -> crear y asociar
                question = QuestionTemplate.objects.create(text=question_data['text'])
                instance.questions.add(question)
                new_ids.add(question.id)

        # Desasociar preguntas que no están en la actualización
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
