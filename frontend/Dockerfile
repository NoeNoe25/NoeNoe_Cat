# # Use official Node.js runtime as base image
# FROM node:18-alpine

# # Set working directory
# WORKDIR /app

# # Copy package.json and package-lock.json
# COPY package*.json ./

# # Install dependencies
# RUN npm install

# # Copy all source code
# COPY . .

# # Expose port
# EXPOSE 3000

# # Start the application
# CMD ["npm", "start"]

# Stage 1: build
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm install --silent
COPY . .
ENV NODE_ENV=production
RUN npm run build

# Stage 2: serve static build with nginx
FROM nginx:stable-alpine
COPY --from=builder /app/build /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]