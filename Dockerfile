FROM node:current
WORKDIR /usr
COPY package.json ./
COPY index.js ./
COPY .env ./
RUN npm install
CMD ["npm", "start"]