# Minimal settings for running app tests in CI/local without external DB/Keycloak
SECRET_KEY = 'test-secret-key'
DEBUG = True
ALLOWED_HOSTS = ['*']

INSTALLED_APPS = [
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'rest_framework',
    'api',
]

MIDDLEWARE = [
    'django.middleware.common.CommonMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
]

ROOT_URLCONF = 'backend.test_urls'

DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.sqlite3',
        'NAME': ':memory:',
    }
}

PASSWORD_HASHERS = [
    'django.contrib.auth.hashers.MD5PasswordHasher',
]

# Minimal settings to avoid importing Keycloak-specific config
KEYCLOAK_CONFIG = {
    'KEYCLOAK_SERVER_URL': 'https://example/',
    'KEYCLOAK_REALM': 'test',
    'KEYCLOAK_CLIENT_ID': 'test-client',
    'KEYCLOAK_VERIFY': False,
}

# REST framework minimal
REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': (),
    'DEFAULT_PERMISSION_CLASSES': (),
}

# Timezone
USE_TZ = True

# Static
STATIC_URL = '/static/'

