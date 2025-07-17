from django.apps import AppConfig
import sys


class ApiConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'api'

    # def ready(self):
    #     if 'runserver' in sys.argv:
    #         banner = [
    #             "  ____ ___ __  __     ____    _    __  __ ",
    #             " |  _ \\_ _|  \\/  |   |  _ \\  / \\  |  \\/  |",
    #             " | |_) | || |\\/| |   | |_) |/ _ \\ | |\\/| |",
    #             " |  __/| || |  | |   |  __// ___ \\| |  | |",
    #             " |_|  |___|_|  |_|   |_|  /_/   \\_\\_|  |_|",
    #             "",
    #             "           [ API en modo desarrollo ]"
    #         ]
    #         for line in banner:
    #             print(line)
