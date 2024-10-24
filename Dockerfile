FROM node:20

# Set git sha and docker tag from build-time args to runtime env variables in the container
ARG GIT_SHA
ARG DOCKER_CHANNEL
ENV GIT_COMMIT=$GIT_SHA
ENV DOCKER_TAG=$DOCKER_CHANNEL

# Set the working directory
WORKDIR /rain-defillama

# Add all files from the current directory to the container
ADD . .

# Install dependencies
RUN npm install

# Build the TypeScript files (transpile TypeScript to JavaScript)
RUN npm run build

# Specify the command to run the application
CMD node dist/index.js
