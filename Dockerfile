# syntax=docker/dockerfile:1.7

FROM node:22 AS frontend-build
WORKDIR /app/frontend
COPY --from=frontend-src package.json package-lock.json ./
RUN npm ci
COPY --from=frontend-src index.html postcss.config.js tailwind.config.js tsconfig.json tsconfig.node.json vite.config.ts ./
COPY --from=frontend-src public ./public
COPY --from=frontend-src src ./src
RUN npm run build

FROM gradle:8-jdk21 AS build
WORKDIR /app
COPY . .
RUN gradle installDist --no-daemon

FROM eclipse-temurin:21-jre
WORKDIR /app
COPY --from=build /app/build/install/souz-proxy ./
COPY --from=frontend-build /app/frontend/dist ./public

EXPOSE 8080
CMD ["./bin/souz-proxy"]
