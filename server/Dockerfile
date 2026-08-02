# Build
FROM node:22-alpine AS build
WORKDIR /app
COPY package*.json tsconfig.json ./
RUN npm ci
COPY src ./src
RUN npm run build

# Run
FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force
COPY --from=build /app/dist ./dist

# Most hosts inject PORT; config.ts reads it.
ENV PORT=8080
EXPOSE 8080

# Don't run as root.
USER node
CMD ["node", "dist/index.js"]
