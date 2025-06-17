import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.backend.settings')
django.setup()

from api.models import AnswerOptionSet, AnswerOption, QuestionArea

def create_answer_option_sets():
    yes_no_set, created = AnswerOptionSet.objects.get_or_create(name="YES_NO_NA")
    if created:
        AnswerOption.objects.create(option_set=yes_no_set, value="yes", label="Yes")
        AnswerOption.objects.create(option_set=yes_no_set, value="no", label="No")
        AnswerOption.objects.create(option_set=yes_no_set, value="na", label="N/A")

    likert_set, created = AnswerOptionSet.objects.get_or_create(name="Likert 1-5")
    if created:
        for i in range(1, 6):
            AnswerOption.objects.create(option_set=likert_set, value=str(i), label=str(i))

def create_question_areas():
    areas = ['Gobernanza', 'Seguridad de la red', 'Control de acceso', 'Protección de la información', 'Seguridad física', 'Formación']
    for area_name in areas:
        QuestionArea.objects.get_or_create(name=area_name)

if __name__ == '__main__':
    create_answer_option_sets()
    create_question_areas()
    print("Datos iniciales creados correctamente.")
