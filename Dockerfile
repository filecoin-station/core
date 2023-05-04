FROM node:18
LABEL org.opencontainers.image.source https://github.com/filecoin-station/core
USER node
WORKDIR /usr/src/app
COPY . .
RUN npm ci --omit=dev
CMD [ "./bin/station.js" ]
