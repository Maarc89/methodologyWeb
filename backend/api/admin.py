from django.contrib import admin
from .models import *


class AnswerOptionInline(admin.TabularInline):
    model = AnswerOption
    extra = 1


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
    filter_horizontal = ('questions',)


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
    list_display = ('user_assessment', 'question_template', 'get_selected_option')
    list_filter = ('selected_option',)
    search_fields = (
        'user_assessment__user__username',
        'question_template__text',
    )
    ordering = ('user_assessment',)

    def get_selected_option(self, obj):
        return obj.selected_option.label if obj.selected_option else '-'

    get_selected_option.short_description = 'Answer'


@admin.register(QuestionArea)
class QuestionAreaAdmin(admin.ModelAdmin):
    list_display = ('name',)


@admin.register(AnswerOptionSet)
class AnswerOptionSetAdmin(admin.ModelAdmin):
    list_display = ("name",)
    inlines = [AnswerOptionInline]
