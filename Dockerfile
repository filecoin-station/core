FROM node:18-alpine
LABEL org.opencontainers.image.source https://github.com/filecoin-station/core
USER node
WORKDIR /usr/src/app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
CMD [ "./bin/station.js" ]