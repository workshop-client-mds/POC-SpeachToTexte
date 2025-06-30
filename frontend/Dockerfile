FROM node:20-slim

WORKDIR /app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install all dependencies, including dev dependencies needed for 'vite'
RUN npm install

# The source code will be mounted via docker-compose, so no need to COPY it here.
# The command will be overridden by docker-compose, so no CMD is needed.

EXPOSE 3000
