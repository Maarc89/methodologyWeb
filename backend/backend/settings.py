import os
from decouple import Config, RepositoryEnv

DJANGO_ENV = os.environ.get('DJANGO_ENV', 'development')

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
config = Config(RepositoryEnv(os.path.join(BASE_DIR, '..', '.env')))

SECRET_KEY = config('SECRET_KEY')
DEBUG = DJANGO_ENV == 'development'
raw_hosts = config('ALLOWED_HOSTS', default='')
ALLOWED_HOSTS = [h.strip() for h in raw_hosts.split(',') if h.strip()]

INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'corsheaders',
    'rest_framework',
    'api',
]

MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware',
    'django.middleware.security.SecurityMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

AUTHENTICATION_BACKENDS = [
    'django.contrib.auth.backends.ModelBackend',
]

CORS_ALLOW_ALL_ORIGINS = DEBUG
CORS_ALLOWED_ORIGINS = [
    h.strip() for h in config('CORS_ALLOWED_ORIGINS', default='').split(',') if h.strip()
]

ROOT_URLCONF = 'backend.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'backend.wsgi.application'

DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME': config('DB_NAME'),
        'USER': config('DB_USER'),
        'PASSWORD': config('DB_PASSWORD'),
        'HOST': config('DB_HOST'),
        'PORT': config('DB_PORT'),
    }
}

AUTH_PASSWORD_VALIDATORS = [
    {'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator'},
    {'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator'},
    {'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator'},
    {'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator'},
]

LANGUAGE_CODE = 'en-us'
TIME_ZONE = 'UTC'
USE_I18N = True
USE_TZ = True

STATIC_URL = '/static/'
STATIC_ROOT = os.path.join(BASE_DIR, 'staticfiles')
DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'


# ------------------------------
# KEYCLOAK CONFIGURATION
# ------------------------------
# Nota: en desarrollo la URL del servidor Keycloak debe coincidir con la usada por el frontend
# (frontend/src/Keycloak.js). En producción preferible leer estos valores desde el .env.
KEYCLOAK_CONFIG = {
    # Alineado con frontend/src/Keycloak.js
    "KEYCLOAK_SERVER_URL": config('KEYCLOAK_SERVER_URL', default='https://172.16.4.40/auth/'),
    "KEYCLOAK_REALM": config('KEYCLOAK_REALM', default='PIM-PAM'),
    "KEYCLOAK_CLIENT_ID": config('KEYCLOAK_CLIENT_ID', default='methodologyAPI'),
    # Secret/credentials should be stored in .env for security
    "KEYCLOAK_CLIENT_SECRET_KEY": config('KEYCLOAK_CLIENT_SECRET_KEY', default=''),
    # KEYCLOAK_VERIFY: allow configuring TLS verification (use 'True' or 'False' in .env)
    "KEYCLOAK_VERIFY": config('KEYCLOAK_VERIFY', default='False').lower() in ('1', 'true', 'yes'),
    "KEYCLOAK_ADMIN_USER": config('KEYCLOAK_ADMIN_USER', default='admin'),
    "KEYCLOAK_ADMIN_PASSWORD": config('KEYCLOAK_ADMIN_PASSWORD', default='admin'),
    # URL alternativa para el servidor Keycloak (útil si el contenedor debe usar el proxy interno)
    "KEYCLOAK_SERVER_URL_ALT": config('KEYCLOAK_SERVER_URL_ALT', default=''),
    # URL alternativa para JWKS (opcional) - útil si el backend necesita una URL accesible internamente
    # Ejemplo: "https://172.16.5.11:8443/auth/realms/PIM-PAM/protocol/openid-connect/certs"
    "KEYCLOAK_JWKS_URL_ALT": config('KEYCLOAK_JWKS_URL_ALT', default=''),
    # Path local opcional a un jwks.json para fallback (opcional)
    "KEYCLOAK_JWKS_LOCAL_FILE": config('KEYCLOAK_JWKS_LOCAL_FILE', default=''),
    # Client credentials (opcional) para obtener token admin vía client_credentials
    "KEYCLOAK_ADMIN_CLIENT_ID": config('KEYCLOAK_ADMIN_CLIENT_ID', default=''),
    "KEYCLOAK_ADMIN_CLIENT_SECRET": config('KEYCLOAK_ADMIN_CLIENT_SECRET', default=''),
}

KEYCLOAK_REQUEST_TIMEOUT = int(config('KEYCLOAK_REQUEST_TIMEOUT', default='5'))

# ------------------------------
# REST FRAMEWORK + Keycloak
# ------------------------------
REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': (
        'api.authentication.KeycloakAuthentication',
    ),
    'DEFAULT_PERMISSION_CLASSES': (
        'rest_framework.permissions.IsAuthenticated',
    ),
}

SESSION_COOKIE_SAMESITE = "None"
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SAMESITE = "None"
CSRF_COOKIE_SECURE = True
