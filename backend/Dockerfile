# Obraz backendu na serwer. Budowany z głównego folderu projektu (docker-compose.prod.yml).
FROM node:24-alpine
WORKDIR /app
COPY package.json package-lock.json ./
COPY shared/package.json shared/
COPY backend/package.json backend/
COPY frontend/package.json frontend/
COPY mockups/package.json mockups/
RUN npm ci --workspace @app/backend --include-workspace-root=false
COPY shared shared
COPY backend backend
ENV NODE_ENV=production
EXPOSE 3001
CMD ["npm", "run", "start", "-w", "@app/backend"]
