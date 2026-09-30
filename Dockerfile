FROM node:22-alpine AS builder
WORKDIR /app
COPY package*.json ./
COPY prisma ./prisma/
# Install dependencies
RUN npm ci
# Generate Prisma Client
RUN npx prisma generate

# Copy all files
COPY . .
# Build the Next.js app
RUN npm run build

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

# Install openssl for Prisma 7 compatibility on alpine
RUN apk add --no-cache openssl

COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/next.config.mjs ./next.config.mjs
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules ./node_modules

EXPOSE 3000

# Push DB schema if needed and start the server
CMD ["sh", "-c", "npx prisma db push --accept-data-loss && node server.js"]
