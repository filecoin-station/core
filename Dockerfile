FROM node:20
LABEL org.opencontainers.image.source https://github.com/filecoin-station/core
WORKDIR /usr/src/app
COPY --chown=node:node . .
USER node
RUN npm ci --omit=dev
ENV DEPLOYMENT_TYPE=docker
CMD [ "./bin/station.js" ]
