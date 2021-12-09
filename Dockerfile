FROM node:16

WORKDIR /opt/app

COPY package*.json .

RUN npm install

COPY . .

EXPOSE 80

CMD [ "npm", "run", "start" ]