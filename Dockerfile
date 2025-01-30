FROM node:20-slim
LABEL org.opencontainers.image.source=https://github.com/CheckerNetwork/core
USER node
WORKDIR /usr/src/app
COPY . .
RUN npm ci --omit=dev
ENV DEPLOYMENT_TYPE=docker
CMD [ "./bin/station.js" ]
