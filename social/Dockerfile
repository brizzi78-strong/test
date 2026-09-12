# The Cardinal (social network) — container image.
# Node 22 for the built-in SQLite database. Data lives on a mounted volume at /data.
FROM node:22-slim
WORKDIR /app
COPY . .
ENV PORT=4000 \
    NEST_DB=/data/nest.db
VOLUME ["/data"]
EXPOSE 4000
CMD ["node", "server.mjs"]
