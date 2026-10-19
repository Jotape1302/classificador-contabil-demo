FROM node:20-alpine AS build

WORKDIR /build
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY . .
RUN npm run build

FROM nginx:1.27-alpine AS runtime

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /build/dist /usr/share/nginx/html

EXPOSE 80

HEALTHCHECK --interval=20s --timeout=5s --start-period=5s --retries=5 \
    CMD ["wget", "--quiet", "--tries=1", "--spider", "http://127.0.0.1/healthz"]

CMD ["nginx", "-g", "daemon off;"]
