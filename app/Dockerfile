FROM node:22-slim
WORKDIR /app
COPY package*.json ./
RUN npm ci
# Chromium for Saathi's sandboxed errand browser
ENV PLAYWRIGHT_BROWSERS_PATH=/ms-playwright
RUN npx playwright-core install --with-deps chromium
COPY . .
RUN npm run build
ENV NODE_ENV=production PORT=3000
EXPOSE 3000
CMD ["npx", "tsx", "server/index.ts"]
