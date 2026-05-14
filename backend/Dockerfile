FROM node:20-alpine

RUN apk add --no-cache openssl openssl-dev

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .
RUN npx prisma generate
RUN npx tsc

RUN mkdir -p /app/uploads

EXPOSE 3001

CMD ["sh", "-c", "npx prisma db push --accept-data-loss && node dist/prisma/seed.js && node dist/src/index.js"]
