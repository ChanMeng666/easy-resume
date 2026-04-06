# Vitex Web Service Dockerfile
# Multi-stage build with Next.js standalone output

# --- Stage 1: Install dependencies ---
FROM node:22-bookworm-slim AS deps

WORKDIR /app

COPY package*.json ./

RUN npm ci --legacy-peer-deps

# --- Stage 2: Build the application ---
FROM node:22-bookworm-slim AS builder

WORKDIR /app

# Build arguments for environment variables required at build time
ARG NEXT_PUBLIC_APP_URL
ARG NEXT_PUBLIC_STACK_PROJECT_ID
ARG NEXT_PUBLIC_STACK_PUBLISHABLE_CLIENT_KEY
ARG DATABASE_URL
ARG OPENAI_API_KEY
ARG STRIPE_SECRET_KEY
ARG STRIPE_WEBHOOK_SECRET
ARG STRIPE_PRICE_CREDITS_5
ARG STRIPE_PRICE_PRO_MONTHLY
ARG STRIPE_PRICE_UNLIMITED_MONTHLY
ARG KV_REST_API_URL
ARG KV_REST_API_TOKEN
ARG CLOUDINARY_CLOUD_NAME
ARG CLOUDINARY_API_KEY
ARG CLOUDINARY_API_SECRET
ARG STACK_SECRET_SERVER_KEY

ENV NEXT_PUBLIC_APP_URL=$NEXT_PUBLIC_APP_URL
ENV NEXT_PUBLIC_STACK_PROJECT_ID=$NEXT_PUBLIC_STACK_PROJECT_ID
ENV NEXT_PUBLIC_STACK_PUBLISHABLE_CLIENT_KEY=$NEXT_PUBLIC_STACK_PUBLISHABLE_CLIENT_KEY
ENV DATABASE_URL=$DATABASE_URL
ENV OPENAI_API_KEY=$OPENAI_API_KEY
ENV STRIPE_SECRET_KEY=$STRIPE_SECRET_KEY
ENV STRIPE_WEBHOOK_SECRET=$STRIPE_WEBHOOK_SECRET
ENV STRIPE_PRICE_CREDITS_5=$STRIPE_PRICE_CREDITS_5
ENV STRIPE_PRICE_PRO_MONTHLY=$STRIPE_PRICE_PRO_MONTHLY
ENV STRIPE_PRICE_UNLIMITED_MONTHLY=$STRIPE_PRICE_UNLIMITED_MONTHLY
ENV KV_REST_API_URL=$KV_REST_API_URL
ENV KV_REST_API_TOKEN=$KV_REST_API_TOKEN
ENV CLOUDINARY_CLOUD_NAME=$CLOUDINARY_CLOUD_NAME
ENV CLOUDINARY_API_KEY=$CLOUDINARY_API_KEY
ENV CLOUDINARY_API_SECRET=$CLOUDINARY_API_SECRET
ENV STACK_SECRET_SERVER_KEY=$STACK_SECRET_SERVER_KEY

# Copy dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/package.json ./package.json
COPY --from=deps /app/package-lock.json ./package-lock.json

# Copy source code
COPY . .

# Build Next.js (standalone output)
RUN npm run build

# --- Stage 3: Production runner ---
FROM node:22-bookworm-slim AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# Install fonts and xz-utils (needed to extract Typst tarball)
RUN apt-get update && apt-get install -y --no-install-recommends \
    xz-utils fonts-liberation fonts-dejavu-core && \
    rm -rf /var/lib/apt/lists/*

# Install Typst binary
ADD https://github.com/typst/typst/releases/download/v0.13.1/typst-x86_64-unknown-linux-musl.tar.xz /tmp/typst.tar.xz
RUN tar xJf /tmp/typst.tar.xz --strip-components=1 -C /usr/local/bin typst-x86_64-unknown-linux-musl/typst && \
    rm /tmp/typst.tar.xz && \
    typst --version

# Create non-root user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Copy standalone build output
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

USER nextjs

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "fetch('http://localhost:3000/').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "server.js"]
