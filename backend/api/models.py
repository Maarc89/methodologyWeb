from django.db import models
from django.contrib.auth.models import User

class AnswerOptionSet(models.Model):
    name = models.CharField(max_length=100, unique=True)

    def __str__(self):
        return self.name


class QuestionArea(models.Model):
    name = models.CharField(max_length=100, unique=True)

    def __str__(self):
        return self.name


class QuestionTemplate(models.Model):
    text = models.TextField()
    option_set = models.ForeignKey(AnswerOptionSet, null=True, blank=True, on_delete=models.SET_NULL)
    area = models.ForeignKey(QuestionArea, on_delete=models.PROTECT, related_name="questions")

    def __str__(self):
        return self.text


class AssessmentTemplate(models.Model):
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    questions = models.ManyToManyField(QuestionTemplate, related_name='assessment_templates')


class UserAssessment(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='user_assessments')
    assessment_template = models.ForeignKey(AssessmentTemplate, on_delete=models.CASCADE)
    started_at = models.DateTimeField(auto_now_add=True)
    completed = models.BooleanField(default=False)
    name = models.CharField(max_length=255, blank=True)


class AnswerOption(models.Model):
    option_set = models.ForeignKey(AnswerOptionSet, related_name='options', on_delete=models.CASCADE)
    value = models.CharField(max_length=20)
    label = models.CharField(max_length=50)

    def __str__(self):
        return f"{self.option_set.name}: {self.label}"


class UserAnswer(models.Model):
    user_assessment = models.ForeignKey(UserAssessment, related_name='answers', on_delete=models.CASCADE)
    question_template = models.ForeignKey(QuestionTemplate, on_delete=models.CASCADE)
    selected_option = models.ForeignKey(AnswerOption, null=True, blank=True, on_delete=models.SET_NULL)
    marked_for_review = models.BooleanField(default=False)
