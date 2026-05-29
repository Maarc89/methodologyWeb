# PIM-PAM

Aplicación web para crear, gestionar y analizar evaluaciones. El proyecto combina un backend en Django con un frontend en React para cubrir el ciclo completo: autenticación, administración de usuarios, trabajo con evaluaciones y visualización de resultados.

## Funcionalidades

- Creación y edición de evaluaciones.
- Importación y exportación de evaluaciones.
- Gestión de usuarios, perfiles y permisos.
- Consulta de detalles de evaluaciones y respuestas.
- Análisis de resultados con paneles y gráficos.

## Tecnologias

### Backend

- Django 5.2
- Django REST Framework
- Django Token Authentication
- PostgreSQL

### Frontend

- React 19
- Vite 6
- TailwindCSS
- Axios
- Framer Motion

### Infraestructura

- Docker / Docker Compose
- Nginx

## Requisitos

- Python 3.12+
- Node.js 20+
- PostgreSQL 15+
- Docker y Docker Compose, si quieres levantar todo con contenedores

## Configuracion

El backend usa variables de entorno para conectarse a la base de datos y arrancar Django. Como minimo necesitas definir:

- `SECRET_KEY`
- `ALLOWED_HOSTS`
- `DB_NAME`
- `DB_USER`
- `DB_PASSWORD`
- `DB_HOST`
- `DB_PORT`

El frontend necesita la URL base del API:

- `VITE_API_BASE`

## Ejecucion local

### Opcion 1: con Docker Compose

1. Crea los ficheros `.env` necesarios para backend, frontend y base de datos.
2. Lanza los contenedores con:

```bash
docker compose up --build
```

3. Abre las aplicaciones en:

- Frontend: `http://localhost:5173`
- Backend: `http://localhost:8001`

### Opcion 2: sin Docker

#### Backend

```bash
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
python manage.py migrate
python manage.py runserver 0.0.0.0:8000
```

#### Frontend

```bash
cd frontend
npm install
npm run dev
```

## Scripts utiles

### Frontend

- `npm run dev`: arranca Vite en modo desarrollo.
- `npm run build`: genera la compilacion de produccion.
- `npm run lint`: ejecuta ESLint.
- `npm test`: ejecuta la suite de tests de frontend con Vitest.
- `npm run preview`: previsualiza la build localmente.

## Estructura resumida

- `backend/`: proyecto Django y API REST.
- `frontend/`: aplicacion React con Vite.
- `nginx/`: configuracion del proxy web.
- `docker-compose.yml`: orquestacion local con backend, frontend y PostgreSQL.

## Notas

- El frontend espera una API accesible mediante `VITE_API_BASE`.
- En desarrollo, el backend usa autenticacion por token de Django y CORS esta habilitado para facilitar la integracion con el frontend.
