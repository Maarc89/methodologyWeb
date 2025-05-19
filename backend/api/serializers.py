# serializers.py
from rest_framework import serializers
from .models import AssessmentTemplate, QuestionTemplate, UserAssessment, UserAnswer

class QuestionTemplateSerializer(serializers.ModelSerializer):
    class Meta:
        model = QuestionTemplate
        fields = ['id', 'text']

class AssessmentTemplateSerializer(serializers.ModelSerializer):
    questions = QuestionTemplateSerializer(many=True, read_only=True)

    class Meta:
        model = AssessmentTemplate
        fields = ['id', 'title', 'created_at', 'questions']


class UserAnswerSerializer(serializers.ModelSerializer):
    question_template = QuestionTemplateSerializer(read_only=True)

    class Meta:
        model = UserAnswer
        fields = ['id', 'question_template', 'answer']


class UserAssessmentSerializer(serializers.ModelSerializer):
    assessment_template = AssessmentTemplateSerializer(read_only=True)
    answers = UserAnswerSerializer(many=True, read_only=True)

    class Meta:
        model = UserAssessment
        fields = ['id', 'assessment_template', 'started_at', 'completed', 'answers']
