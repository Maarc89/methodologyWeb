from django.db import models


class Question(models.Model):
    question_text = models.CharField(max_length=255)


class Response(models.Model):
    QUESTION_CHOICES = [
        ('SI', 'Sí'),
        ('NO', 'No'),
        ('NO_SE', 'No sé'),
    ]

    question = models.ForeignKey(Question, on_delete=models.CASCADE)
    answer = models.CharField(max_length=5, choices=QUESTION_CHOICES)
    assessment = models.ForeignKey('CybersecurityAssessment', on_delete=models.CASCADE)


class CybersecurityAssessment(models.Model):
    site_name = models.CharField(max_length=255)
    user = models.ForeignKey('auth.User', on_delete=models.CASCADE)  # Si usas autenticación
    score = models.DecimalField(max_digits=5, decimal_places=2)  # Puntuación del assessment
