FROM node:18-alpine
LABEL org.opencontainers.image.source https://github.com/filecoin-station/core
WORKDIR /usr/src/app
COPY . .
RUN npm ci --omit=dev
USER node
CMD [ "./bin/station.js" ]
