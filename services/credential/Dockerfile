FROM node:20-alpine

WORKDIR /app

COPY services/credential/package*.json ./
RUN npm install

COPY services/credential/ ./
RUN npm run build

ENV PORT=4000
EXPOSE 4000

CMD ["npm", "start"]
