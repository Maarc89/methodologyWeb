from django.contrib import admin
from .models import (
    AssessmentTemplate,
    QuestionTemplate,
    UserAssessment,
    UserAnswer
)


@admin.register(QuestionTemplate)
class QuestionTemplateAdmin(admin.ModelAdmin):
    list_display = ('text',)
    search_fields = ('text',)
    ordering = ('text',)


@admin.register(AssessmentTemplate)
class AssessmentTemplateAdmin(admin.ModelAdmin):
    list_display = ('title', 'created_at')
    search_fields = ('title',)
    ordering = ('-created_at',)
    filter_horizontal = ('questions',)  # Esto habilita widget para ManyToMany en admin


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
