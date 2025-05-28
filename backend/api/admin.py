from django.contrib import admin
from .models import (
    AssessmentTemplate,
    QuestionTemplate,
    UserAssessment,
    UserAnswer
)


# Muestra las preguntas al editar un AssessmentTemplate
class QuestionTemplateInline(admin.TabularInline):
    model = QuestionTemplate
    extra = 0


@admin.register(AssessmentTemplate)
class AssessmentTemplateAdmin(admin.ModelAdmin):
    list_display = ('title', 'created_at')
    inlines = [QuestionTemplateInline]
    search_fields = ('title',)
    ordering = ('-created_at',)


# Muestra las respuestas al editar un UserAssessment
class UserAnswerInline(admin.TabularInline):
    model = UserAnswer
    extra = 0


@admin.register(UserAssessment)
class UserAssessmentAdmin(admin.ModelAdmin):
    list_display = ('user', 'assessment_template', 'started_at', 'completed')
    list_filter = ('completed',)
    search_fields = ('user__username', 'assessment_template__title')
    ordering = ('-started_at',)
    inlines = [UserAnswerInline]


@admin.register(UserAnswer)
class UserAnswerAdmin(admin.ModelAdmin):
    list_display = ('user_assessment', 'question_template', 'answer')
    list_filter = ('answer',)
    search_fields = (
        'user_assessment__user__username',
        'question_template__text',
    )
    ordering = ('user_assessment',)


@admin.register(QuestionTemplate)
class QuestionTemplateAdmin(admin.ModelAdmin):
    list_display = ('assessment_template', 'text')
    search_fields = ('text',)
    ordering = ('assessment_template',)
