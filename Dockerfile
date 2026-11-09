# ---- build stage ----
FROM node:20-bookworm-slim AS build
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --include=dev

COPY . .
# The npm "build" script asks for 8 GB heap; the VPS has 4 GB RAM + 4 GB swap.
ENV NODE_OPTIONS=--max-old-space-size=3072
RUN npx nest build && npx nest build motohub-batch \
 && npm prune --omit=dev

# ---- runtime stage ----
FROM node:20-bookworm-slim
ENV NODE_ENV=production
WORKDIR /app

COPY --from=build --chown=node:node /app/package.json ./
COPY --from=build --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/dist ./dist
RUN mkdir -p uploads && chown node:node uploads

USER node
EXPOSE 3007
CMD ["node", "dist/apps/moto-hub/main.js"]
