FROM node:22-alpine

WORKDIR /home/node/fsk-traffic
COPY package*.json ./

RUN npm ci
COPY . .

EXPOSE 6000
CMD [ "node", "index.mjs" ]
