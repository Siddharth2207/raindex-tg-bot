# Use the official Node.js image as the base image
FROM node:20

# Set build-time arguments for Git SHA and Docker tag
ARG GIT_SHA
ARG DOCKER_CHANNEL

# Set them as environment variables in the running container
ENV GIT_COMMIT=$GIT_SHA
ENV DOCKER_TAG=$DOCKER_CHANNEL

# Set the working directory inside the container
WORKDIR /rain-defillama

# Copy package.json and package-lock.json first (for better caching)
COPY package*.json ./

# Install dependencies (use npm ci if deploying for production)
RUN npm install

# Copy the rest of the application code
COPY . .

# Install ts-node globally (if ts-node is used)
RUN npm install -g ts-node

# Command to run the application
CMD ["ts-node", "index.ts"]
