from django.db import models

class Assessment(models.Model):
    title = models.CharField(max_length=255)
    created_at = models.DateTimeField(auto_now_add=True)

class Question(models.Model):
    assessment = models.ForeignKey(Assessment, related_name='questions', on_delete=models.CASCADE)
    text = models.TextField()
    is_answered = models.BooleanField(default=False)
    answer = models.CharField(max_length=10, choices=[
        ('YES', 'Yes'),
        ('NO', 'No'),
        ('NA', 'N/A'),
        ('ALT', 'Alternate')
    ], blank=True, null=True)
