FROM node:20

# set git sha and docker tag form build time arg to run time env in container
ARG GIT_SHA
ARG DOCKER_CHANNEL
ENV GIT_COMMIT=$GIT_SHA
ENV DOCKER_TAG=$DOCKER_CHANNEL

# Create and set the working directory
WORKDIR /rain-defillama
ADD . .
RUN npm install
CMD nodemon src/index.js