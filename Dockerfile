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

# Public, build-time-inlined config (baked into the client bundle by Next.js).
# These are NOT secret — NEXT_PUBLIC_* values ship to the browser by design.
ARG NEXT_PUBLIC_APP_URL
ARG NEXT_PUBLIC_STACK_PROJECT_ID
ARG NEXT_PUBLIC_STACK_PUBLISHABLE_CLIENT_KEY
# Stripe price IDs are public identifiers (not credentials).
ARG STRIPE_PRICE_CREDITS_5
ARG STRIPE_PRICE_PRO_MONTHLY
ARG STRIPE_PRICE_UNLIMITED_MONTHLY

ENV NEXT_PUBLIC_APP_URL=$NEXT_PUBLIC_APP_URL
ENV NEXT_PUBLIC_STACK_PROJECT_ID=$NEXT_PUBLIC_STACK_PROJECT_ID
ENV NEXT_PUBLIC_STACK_PUBLISHABLE_CLIENT_KEY=$NEXT_PUBLIC_STACK_PUBLISHABLE_CLIENT_KEY
ENV STRIPE_PRICE_CREDITS_5=$STRIPE_PRICE_CREDITS_5
ENV STRIPE_PRICE_PRO_MONTHLY=$STRIPE_PRICE_PRO_MONTHLY
ENV STRIPE_PRICE_UNLIMITED_MONTHLY=$STRIPE_PRICE_UNLIMITED_MONTHLY

# Copy dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/package.json ./package.json
COPY --from=deps /app/package-lock.json ./package-lock.json

# Copy source code
COPY . .

# Build Next.js (standalone output).
#
# Real secrets are injected via BuildKit secret mounts, NOT ARG/ENV: they're
# readable only for this single RUN and are never persisted into image layers,
# history, or the final image (which is what `SecretsUsedInArgOrEnv` warns
# against). DATABASE_URL and STACK_SECRET_SERVER_KEY are needed at build time
# because db/client.ts and lib/auth/stack.ts instantiate their clients at module
# import, and Next.js imports route modules during the build. The others are
# mounted too so any build-time access keeps working.
RUN --mount=type=secret,id=DATABASE_URL \
    --mount=type=secret,id=OPENAI_API_KEY \
    --mount=type=secret,id=STRIPE_SECRET_KEY \
    --mount=type=secret,id=STRIPE_WEBHOOK_SECRET \
    --mount=type=secret,id=STACK_SECRET_SERVER_KEY \
    DATABASE_URL="$(cat /run/secrets/DATABASE_URL)" \
    OPENAI_API_KEY="$(cat /run/secrets/OPENAI_API_KEY)" \
    STRIPE_SECRET_KEY="$(cat /run/secrets/STRIPE_SECRET_KEY)" \
    STRIPE_WEBHOOK_SECRET="$(cat /run/secrets/STRIPE_WEBHOOK_SECRET)" \
    STACK_SECRET_SERVER_KEY="$(cat /run/secrets/STACK_SECRET_SERVER_KEY)" \
    npm run build

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

# Install Typst binary (checksum-pinned so a tampered/reuploaded artifact fails the build)
ADD --checksum=sha256:7d214bfeffc2e585dc422d1a09d2b144969421281e8c7f5d784b65fc69b5673f \
    https://github.com/typst/typst/releases/download/v0.13.1/typst-x86_64-unknown-linux-musl.tar.xz /tmp/typst.tar.xz
RUN tar xJf /tmp/typst.tar.xz --strip-components=1 -C /usr/local/bin typst-x86_64-unknown-linux-musl/typst && \
    rm /tmp/typst.tar.xz && \
    typst --version

# Bundle FontAwesome 6 webfonts so Typst can render @preview/fontawesome icons.
# Typst identifies fonts by their internal name, not filename — these TTFs
# register as "Font Awesome 6 Free", "Font Awesome 6 Free Solid", and
# "Font Awesome 6 Brands", which is exactly what the package expects.
COPY --from=builder /app/node_modules/@fortawesome/fontawesome-free/webfonts /app/fonts
ENV TYPST_FONT_PATH=/app/fonts

# Pre-populate the Typst package cache with @preview/fontawesome:0.5.0 so
# the compiler never needs outbound HTTPS to packages.typst.org at runtime
# (the VPS has been returning OpenSSL/TLS errors when the typst binary tries
# to negotiate TLS there). Docker's ADD directive uses the host daemon's
# TLS stack, so it works regardless of CA certs inside the image.
ADD --checksum=sha256:be58301b1aac00e31075e53c944cfc50aa6c1f8ff670c8e29c6ec21e94a2c07a \
    https://packages.typst.org/preview/fontawesome-0.5.0.tar.gz /tmp/fa-pkg.tar.gz
RUN mkdir -p /app/typst-cache/preview/fontawesome/0.5.0 && \
    tar xzf /tmp/fa-pkg.tar.gz -C /app/typst-cache/preview/fontawesome/0.5.0 && \
    rm /tmp/fa-pkg.tar.gz && \
    test -f /app/typst-cache/preview/fontawesome/0.5.0/typst.toml
ENV TYPST_PACKAGE_CACHE_PATH=/app/typst-cache

# Create non-root user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Copy standalone build output
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

USER nextjs

EXPOSE 3000

HEALTHCHECK --interval=10s --timeout=3s --start-period=15s --retries=3 \
  CMD node -e "fetch('http://localhost:3000/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "server.js"]
