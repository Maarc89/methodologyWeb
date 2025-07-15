# Desarrollo
FROM node:20

WORKDIR /app

COPY package.json package-lock.json* ./

RUN npm install

COPY . .

EXPOSE 5173

# Producción

# FROM node:20

# WORKDIR /app

# COPY package.json package-lock.json* ./

# RUN npm install

# COPY . .

# RUN npm run build

# EXPOSE 5173