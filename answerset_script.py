import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

from backend.api.models import AnswerOptionSet, AnswerOption, QuestionArea

def create_answer_option_sets():
    yes_no_set, created = AnswerOptionSet.objects.get_or_create(name="YES_NO_NA")
    # crear o actualizar opciones y asociarlas de forma idempotente
    for val, lab in [("yes", "Yes"), ("no", "No"), ("na", "N/A")]:
        ao, acreated = AnswerOption.objects.get_or_create(value=val, defaults={'label': lab})
        if not acreated and ao.label != lab:
            ao.label = lab
            ao.save()
        if not yes_no_set.options.filter(pk=ao.pk).exists():
            yes_no_set.options.add(ao)

    likert_set, created = AnswerOptionSet.objects.get_or_create(name="Likert 1-5")
    for i in range(1, 6):
        val = str(i)
        lab = str(i)
        ao, acreated = AnswerOption.objects.get_or_create(value=val, defaults={'label': lab})
        if not acreated and ao.label != lab:
            ao.label = lab
            ao.save()
        if not likert_set.options.filter(pk=ao.pk).exists():
            likert_set.options.add(ao)

def create_question_areas():
    areas = ['Gobernanza', 'Seguridad de la red', 'Control de acceso', 'Protección de la información', 'Seguridad física', 'Formación']
    for area_name in areas:
        QuestionArea.objects.get_or_create(name=area_name)

if __name__ == '__main__':
    create_answer_option_sets()
    create_question_areas()
    print("Datos iniciales creados correctamente.")
