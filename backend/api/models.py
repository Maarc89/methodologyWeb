from django.db import models
from django.contrib.auth.models import User


class AssessmentTemplate(models.Model):
    title = models.CharField(max_length=255)
    created_at = models.DateTimeField(auto_now_add=True)


class QuestionTemplate(models.Model):
    assessment_template = models.ForeignKey(AssessmentTemplate, related_name='questions', on_delete=models.CASCADE)
    text = models.TextField()


class UserAssessment(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='user_assessments')
    assessment_template = models.ForeignKey(AssessmentTemplate, on_delete=models.CASCADE)
    started_at = models.DateTimeField(auto_now_add=True)
    completed = models.BooleanField(default=False)
    name = models.CharField(max_length=255, blank=True)


class UserAnswer(models.Model):
    user_assessment = models.ForeignKey(UserAssessment, related_name='answers', on_delete=models.CASCADE)
    question_template = models.ForeignKey(QuestionTemplate, on_delete=models.CASCADE)
    answer = models.CharField(max_length=10, choices=[
        ('YES', 'Yes'),
        ('NO', 'No'),
        ('NA', 'N/A'),
        ('ALT', 'Alternate')
    ], blank=True, null=True)
