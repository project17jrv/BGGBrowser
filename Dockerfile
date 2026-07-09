# --- Stage 1: Build Stage ---
FROM node:24-alpine AS builder
WORKDIR /app

# Copy package files and install all dependencies (including devDependencies)
COPY package*.json ./
RUN npm install --legacy-peer-deps

# Copy codebase
COPY . .

# Generate Prisma Client
RUN npx prisma generate

# Build Next.js application
RUN npm run build

# --- Stage 2: Runner Stage ---
FROM node:24-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Copy package files and install only production dependencies
COPY package*.json ./
RUN npm install --only=production --legacy-peer-deps

# Copy Prisma schema and migrations
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/scripts ./scripts

# Regenerate Prisma client in production node_modules
RUN npx prisma generate

# Copy next built assets and public folder
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public

# Install Prisma CLI globally in runner to execute migration commands
RUN npm install -g prisma

# Ensure downloaded images directory exists
RUN mkdir -p public/images/games

EXPOSE 3000

# Execute database migrations and start the Next.js server
CMD ["sh", "-c", "prisma migrate deploy && npm run start"]
