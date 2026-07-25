# syntax = docker/dockerfile:1

# Fly.io + SvelteKit (adapter-node)
# https://fly.io/docs/js/frameworks/svelte/

ARG NODE_VERSION=22.14.0

FROM node:${NODE_VERSION}-slim AS base

LABEL fly_launch_runtime="Node.js"

WORKDIR /app

ENV NODE_ENV=production

# --- build ---
FROM base AS build

# Native modules (argon2) need compilers
RUN apt-get update -qq \
	&& apt-get install --no-install-recommends -y \
		build-essential \
		node-gyp \
		pkg-config \
		python-is-python3 \
	&& rm -rf /var/lib/apt/lists/*

# Install all deps (including dev) for the Vite/SvelteKit build
COPY package-lock.json package.json ./
RUN npm ci --include=dev

COPY . .

# Explicit env vars must exist at build; real values come from `fly secrets` at runtime
ARG DATABASE_URL=postgresql://build:build@127.0.0.1:5432/build
ARG ORIGIN=https://project12f.fly.dev
ARG BETTER_AUTH_SECRET=build-time-placeholder-change-me-32chars
ENV DATABASE_URL=$DATABASE_URL \
	ORIGIN=$ORIGIN \
	BETTER_AUTH_SECRET=$BETTER_AUTH_SECRET

RUN npm run build
RUN npm prune --omit=dev

# --- run ---
FROM base

COPY --from=build /app /app

ENV PORT=3000 \
	HOST=0.0.0.0

EXPOSE 3000

CMD ["npm", "run", "start"]
