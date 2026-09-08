# Not pinned to $BUILDPLATFORM: that needs BuildKit and would break plain
# `docker build` locally. Zola runs emulated for the non-native arch instead,
# which costs seconds on a site this size.
FROM ghcr.io/getzola/zola:v0.23.4 AS build
WORKDIR /project
COPY . .
RUN ["/zola", "build"]

FROM nginxinc/nginx-unprivileged:1.27-alpine AS runtime
COPY --from=build /project/public /usr/share/nginx/html
# Statiq served the RSS feed at /feed/index.rss; Zola cannot name a template .rss.
COPY --from=build /project/public/feed/rss.xml /usr/share/nginx/html/feed/index.rss
COPY deploy/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 8080
