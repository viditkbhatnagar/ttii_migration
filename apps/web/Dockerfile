FROM node:24-alpine AS build

WORKDIR /workspace

COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
COPY packages/shared-types/package.json packages/shared-types/package.json
COPY packages/frontend-core/package.json packages/frontend-core/package.json
COPY packages/ui/package.json packages/ui/package.json

RUN npm ci

COPY . .

RUN npm run build -w @ttii/shared-types && \
    npm run build -w @ttii/frontend-core && \
    npm run build -w @ttii/ui && \
    npm run build -w @ttii/web

FROM node:24-alpine

RUN npm i -g serve

COPY --from=build /workspace/apps/web/dist /app

EXPOSE 5173

CMD ["serve", "-s", "/app", "-l", "5173"]
