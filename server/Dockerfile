# Use an official Node.js LTS image as the base
FROM node:20-alpine AS build

# Set the working directory
WORKDIR /app

# Copy package.json and package-lock.json (or yarn.lock)
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy the rest of the app source code
COPY . .

# Expose port (optional, depends on your app)
EXPOSE 3000

# Command to run your app
CMD ["npm", "start"]