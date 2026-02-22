FROM node:24-alpine

WORKDIR /workspace

COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
COPY packages/shared-types/package.json packages/shared-types/package.json
COPY packages/ui/package.json packages/ui/package.json

RUN npm ci

COPY . .

EXPOSE 4000

CMD ["npm", "run", "dev", "-w", "@ttii/api"]
