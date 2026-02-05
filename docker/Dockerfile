FROM node:24-alpine
WORKDIR /app

# Copy package files and install dependencies
COPY app/package*.json ./
RUN npm ci

# Copy application source
COPY app/ .

EXPOSE 3000
CMD ["node", "index.js"]
