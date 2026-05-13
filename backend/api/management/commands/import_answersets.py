import json
import csv
import os
from django.core.management.base import BaseCommand, CommandError
from backend.api.models import AnswerOptionSet, AnswerOption


class Command(BaseCommand):
    help = """Importa conjuntos de opciones (answer option sets) desde un fichero JSON o CSV.

JSON expected format:
{
  "sets": [
    {"name": "set_name", "options": [{"value": "a", "label": "A"}, ...]},
    ...
  ]
}

CSV expected format (columns): set_name,value,label
"""

    def add_arguments(self, parser):
        parser.add_argument('path', type=str, help='Ruta al fichero JSON o CSV con los answer sets')
        parser.add_argument('--dry-run', action='store_true', help='No guarda cambios, solo muestra lo que se importaría')

    def handle(self, *args, **options):
        path = options['path']
        dry_run = options['dry_run']

        if not os.path.exists(path):
            raise CommandError(f'Fichero no encontrado: {path}')

        sets = []
        if path.lower().endswith('.json'):
            with open(path, 'r', encoding='utf-8') as f:
                data = json.load(f)
                sets = data.get('sets', [])
        else:
            # parse CSV: set_name,value,label
            sets_map = {}
            with open(path, newline='', encoding='utf-8') as csvfile:
                # Try to detect header
                sample = csvfile.read(2048)
                csvfile.seek(0)
                has_header = csv.Sniffer().has_header(sample)
                reader = csv.DictReader(csvfile)
                for row in reader:
                    # Expect keys like set_name, value, label or headerless rows in order
                    if 'set_name' in row and 'value' in row and 'label' in row:
                        name = (row.get('set_name') or '').strip()
                        val = (row.get('value') or '').strip()
                        lab = (row.get('label') or '').strip()
                    else:
                        # fallback to positional fields
                        parts = [p.strip() for p in row.values() if p is not None]
                        if len(parts) < 3:
                            continue
                        name, val, lab = parts[0], parts[1], parts[2]

                    if not name:
                        continue
                    if name not in sets_map:
                        sets_map[name] = []
                    sets_map[name].append({'value': val, 'label': lab})
            sets = [{'name': k, 'options': v} for k, v in sets_map.items()]

        self.stdout.write(f'Preparado para importar {len(sets)} sets')

        for s in sets:
            name = s.get('name')
            options = s.get('options', [])
            self.stdout.write(f"Procesando set '{name}' con {len(options)} opciones...")
            if not name:
                self.stderr.write('Set sin nombre, se omite')
                continue

            if dry_run:
                for o in options:
                    self.stdout.write(f"  -> {o.get('value')} : {o.get('label')}")
                continue

            set_obj, created = AnswerOptionSet.objects.get_or_create(name=name)
            if created:
                self.stdout.write(f"  Creado set {name}")
            else:
                self.stdout.write(f"  Set {name} ya existe (se sincronizarán opciones)")

            # sincronizar opciones: si existe una opción con mismo value, actualizar label; si no, crear
            for opt in options:
                val = opt.get('value')
                lab = opt.get('label')
                if val is None:
                    continue
                ao, acreated = AnswerOption.objects.get_or_create(value=val, defaults={'label': lab})
                if not acreated:
                    if ao.label != lab:
                        ao.label = lab
                        ao.save()
                # asociar si no está
                if not set_obj.options.filter(pk=ao.pk).exists():
                    set_obj.options.add(ao)

            self.stdout.write(self.style.SUCCESS(f'Set {name} procesado'))

        self.stdout.write(self.style.SUCCESS('Import terminado'))
