# Root Dockerfile so container hosts (Koyeb, Fly, etc.) auto-detect and build
# the Cardinal social app, which lives in social/. Node 22 for the built-in SQLite.
# The host injects PORT; the app reads it (defaults to 4000). The SQLite database
# defaults to /app/nest.db inside the container.
FROM node:22-slim
WORKDIR /app
COPY social/ ./
EXPOSE 4000
CMD ["node", "server.mjs"]
