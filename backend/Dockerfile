# Use the official Node.js 20 image.
FROM node:20-slim

# Install curl for debugging purposes
RUN apt-get update && apt-get install -y curl

# Create and change to the app directory.
WORKDIR /usr/src/app

# Copy application dependency manifests to the container image.
# A wildcard is used to ensure both package.json AND package-lock.json are copied.
# Copying this first prevents re-running npm install on every code change.
COPY package*.json ./

# Install all dependencies, including dev dependencies.
RUN npm install

# Install sequelize-cli globally to have it available in the container
RUN npm install -g sequelize-cli

# Copy local code to the container image.
COPY . .

# Run the web service on container startup.
CMD [ "npm", "start" ]
