FROM node:22-alpine AS build

WORKDIR /usr/src/app
COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile --non-interactive --network-timeout 1000000
COPY . .
RUN yarn build

FROM node:22-alpine AS runtime

RUN apk add --no-cache curl

ENV NODE_ENV=production \
    PORT=4000
EXPOSE 4000

WORKDIR /usr/src/app
COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile --non-interactive --production --ignore-scripts \
  --network-timeout 1000000
COPY --from=build /usr/src/app/dist ./dist

HEALTHCHECK --start-period=30s \
  CMD curl -s -f http://localhost:4000/health || exit 1

CMD ["node", "dist/main.js"]
