# Desarrollo
FROM node:20

WORKDIR /app

COPY package.json package-lock.json* ./

RUN npm install

COPY . .

# Solo para producción
# RUN npm run build

EXPOSE 5173