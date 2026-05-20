# --- Stage 1: Build ---
FROM node:20-alpine3.21 AS builder

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

ARG NEXT_PUBLIC_SUPABASE_URL
ARG NEXT_PUBLIC_SUPABASE_ANON_KEY

# Fail fast if Supabase env vars are missing (NEXT_PUBLIC_* must be inlined at build time)
RUN test -n "$NEXT_PUBLIC_SUPABASE_URL" \
    || (echo "❌ NEXT_PUBLIC_SUPABASE_URL is not set — add it as a build-time variable" && exit 1)
RUN test -n "$NEXT_PUBLIC_SUPABASE_ANON_KEY" \
    || (echo "❌ NEXT_PUBLIC_SUPABASE_ANON_KEY is not set — add it as a build-time variable" && exit 1)

# Write .env.production so Next.js always picks up the vars at build time
RUN printf "NEXT_PUBLIC_SUPABASE_URL=%s\nNEXT_PUBLIC_SUPABASE_ANON_KEY=%s\n" \
    "$NEXT_PUBLIC_SUPABASE_URL" "$NEXT_PUBLIC_SUPABASE_ANON_KEY" > .env.production

RUN npm run build

# --- Stage 2: Runtime ---
FROM node:20-alpine3.21

# Install FFmpeg + Chromium
# PINNED to Alpine 3.21 → FFmpeg 7.x. Alpine 3.23 ships FFmpeg 8.0 which breaks
# libx264 encoder initialization with our filter_complex pipeline.
RUN apk add --no-cache ffmpeg chromium

ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV CHROME_PATH=/usr/bin/chromium-browser

# Supabase env vars needed at runtime for middleware & API routes
ARG NEXT_PUBLIC_SUPABASE_URL
ARG NEXT_PUBLIC_SUPABASE_ANON_KEY
ENV NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL
ENV NEXT_PUBLIC_SUPABASE_ANON_KEY=$NEXT_PUBLIC_SUPABASE_ANON_KEY

WORKDIR /app

COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public

EXPOSE 3000

CMD ["npm", "run", "start"]
