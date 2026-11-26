FROM node:20-alpine

WORKDIR /app

COPY apps/web/package.json ./
RUN npm install

COPY apps/web ./

ENV NEXT_PUBLIC_API_MODE=mock
ENV HOSTNAME=0.0.0.0

EXPOSE 3000

CMD ["npm", "run", "dev", "--", "--hostname", "0.0.0.0"]
