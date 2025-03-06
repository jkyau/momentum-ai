FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package.json package-lock.json ./

# Install dependencies
RUN npm ci

# Copy application code
COPY . .

# Create .env.local file with necessary environment variables for build time
RUN echo "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_ZXhwZXJ0LWNyYXlmaXNoLTk3LmNsZXJrLmFjY291bnRzLmRldiQ" > .env.local && \
    echo "OLLAMA_API_URL=http://host.docker.internal:11434" >> .env.local && \
    echo "OLLAMA_MODEL=llama3" >> .env.local && \
    echo "DEFAULT_AI_PROVIDER=OLLAMA" >> .env.local

# Generate Prisma client
RUN npx prisma generate

# Build the application
RUN npm run build

# Install netcat for database connection check and PostgreSQL client tools
RUN apk add --no-cache netcat-openbsd postgresql-client util-linux

# Make start script executable
RUN chmod +x /app/start.sh

# Expose port
EXPOSE 3000

# Start the application with migrations
CMD ["/bin/sh", "/app/start.sh"] 