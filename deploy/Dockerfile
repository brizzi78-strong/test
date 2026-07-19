# Shared base image for the Cardinal HR Node services.
#
# Every module is a zero-dependency TypeScript project run directly under Node's
# built-in type stripping (no build step, no npm install). The specific service
# and port are set per-container in docker-compose.yml.
#
# Node 22 (>= 22.18) is required for both TS type stripping and node:sqlite.
FROM node:22-alpine

WORKDIR /app

# Copy only the HR service modules (the .dockerignore excludes everything else).
COPY hirecheck ./hirecheck
COPY myhr ./myhr
COPY recruiting ./recruiting
COPY training ./training
COPY benefits ./benefits
COPY payroll ./payroll
COPY directory ./directory
COPY timeoff ./timeoff
COPY offboarding ./offboarding
COPY orchestrator ./orchestrator
COPY booking ./booking
COPY portal ./portal
COPY gateway ./gateway

# Durable SQLite databases live here; mounted as a volume per service.
RUN mkdir -p /data && addgroup -S app && adduser -S app -G app && chown -R app /app /data
USER app

ENV NODE_ENV=production

# Default command (overridden per service in compose). Chosen so a bare
# `docker run` still starts something sensible.
CMD ["node", "directory/src/index.ts"]
