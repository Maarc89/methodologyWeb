from rest_framework import serializers
from .models import *


# ----------------------------
# SERIALIZER PARA PREGUNTAS Y RESPUESTAS
# ----------------------------
class AnswerOptionSerializer(serializers.ModelSerializer):
    class Meta:
        model = AnswerOption
        fields = ['id', 'value', 'label']


class AnswerOptionSetSerializer(serializers.ModelSerializer):
    options = AnswerOptionSerializer(many=True, read_only=True)

    class Meta:
        model = AnswerOptionSet
        fields = ['name', 'options']


class QuestionTemplateSerializer(serializers.ModelSerializer):
    option_set = serializers.CharField(allow_null=True, required=False)  # ahora es string (nombre)
    area = serializers.CharField()

    options = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = QuestionTemplate
        fields = ['id', 'text', 'option_set', 'area', 'options']
        extra_kwargs = {'id': {'read_only': False, 'required': False}}

    def get_options(self, obj):
        if obj.option_set:
            return AnswerOptionSerializer(obj.option_set.options.all(), many=True).data
        return []


# ----------------------------
# SERIALIZER PARA TEMPLATES DE ASSESSMENT
# Incluye preguntas anidadas
# ----------------------------
class AssessmentTemplateSerializer(serializers.ModelSerializer):
    questions = QuestionTemplateSerializer(many=True)

    class Meta:
        model = AssessmentTemplate
        fields = ['id', 'title', 'description', 'created_at', 'questions']
        read_only_fields = ['created_at']

    def create(self, validated_data):
        questions_data = validated_data.pop('questions', [])
        assessment = AssessmentTemplate.objects.create(**validated_data)

        for question_data in questions_data:
            q_id = question_data.pop('id', None)
            option_set_name = question_data.pop('option_set', None)
            area_name = question_data.pop('area')

            option_set = None
            if option_set_name:
                option_set, _ = AnswerOptionSet.objects.get_or_create(name=option_set_name)

            area, _ = QuestionArea.objects.get_or_create(name=area_name)

            if q_id:
                try:
                    question = QuestionTemplate.objects.get(id=q_id)
                except QuestionTemplate.DoesNotExist:
                    raise serializers.ValidationError(f'Pregunta con id {q_id} no existe.')
            else:
                question = QuestionTemplate.objects.create(
                    option_set=option_set,
                    area=area,
                    **question_data
                )

            assessment.questions.add(question)

        return assessment

    def update(self, instance, validated_data):
        questions_data = validated_data.pop('questions', [])

        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()

        current_questions = instance.questions.all()
        current_ids = set(q.id for q in current_questions)
        new_ids = set()

        for question_data in questions_data:
            q_id = question_data.get('id', None)
            option_set_name = question_data.pop('option_set', None)
            area_name = question_data.pop('area')

            option_set = None
            if option_set_name:
                option_set, _ = AnswerOptionSet.objects.get_or_create(name=option_set_name)

            area, _ = QuestionArea.objects.get_or_create(name=area_name)

            if q_id:
                try:
                    question = QuestionTemplate.objects.get(id=q_id)
                except QuestionTemplate.DoesNotExist:
                    raise serializers.ValidationError(f'Pregunta con id {q_id} no existe.')

                question.text = question_data.get('text', question.text)
                question.option_set = option_set
                question.area = area
                question.save()

                if question not in current_questions:
                    instance.questions.add(question)

                new_ids.add(q_id)

            else:
                question = QuestionTemplate.objects.create(
                    option_set=option_set,
                    area=area,
                    **question_data
                )
                instance.questions.add(question)
                new_ids.add(question.id)

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
    selected_option_text = serializers.CharField(source='selected_option.label', read_only=True)

    class Meta:
        model = UserAnswer
        fields = ['id', 'question_template', 'selected_option', 'selected_option_text']


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
