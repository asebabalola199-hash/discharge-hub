# The Discharge Hub — single-image build (API serves the built frontend).
FROM node:20-slim AS build
WORKDIR /app
COPY package*.json ./
COPY backend/package.json backend/package.json
COPY frontend/package.json frontend/package.json
RUN npm install
COPY . .
RUN npm run build

FROM node:20-slim
WORKDIR /app
ENV NODE_ENV=production
# Persist the SQLite database outside the image layer.
ENV DB_DIR=/data
VOLUME /data
COPY --from=build /app .
EXPOSE 3001
CMD ["npm", "start"]
