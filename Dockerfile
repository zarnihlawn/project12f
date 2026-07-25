# syntax = docker/dockerfile:1

# Fly.io + SvelteKit (adapter-node)
# https://fly.io/docs/js/frameworks/svelte/
#
# Env safety:
# - `.env` is excluded via `.dockerignore` (never bake secrets into the image)
# - Private vars in `src/env.ts` are dynamic (`static: false`) and optional during `vite build`
# - Real values come from Fly secrets / runtime `-e` when the container starts
# - Do NOT pass DATABASE_URL / BETTER_AUTH_SECRET as build-args

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

# No secret ENV/ARG here — build must succeed without runtime credentials
RUN npm run build
RUN npm prune --omit=dev

# --- run ---
FROM base

COPY --from=build /app /app

ENV PORT=3000 \
	HOST=0.0.0.0

EXPOSE 3000

CMD ["npm", "run", "start"]
