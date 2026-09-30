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
COPY accounting ./accounting
COPY verify ./verify
COPY booking ./booking
COPY schedule ./schedule
COPY book ./book
COPY books ./books
COPY timeclock ./timeclock
COPY runpay ./runpay
COPY portal ./portal
COPY gateway ./gateway
COPY trading ./trading
COPY invest ./invest
COPY taxfile ./taxfile
COPY expenses ./expenses
# The Render all-in-one trading service starts both trading/ and invest/ from
# this small entrypoint. Keep it in the shared image alongside those modules.
COPY deploy/allinone-trading.ts ./deploy/allinone-trading.ts

# Durable SQLite databases live here; mounted as a volume per service.
RUN mkdir -p /data && addgroup -S app && adduser -S app -G app && chown -R app /app /data
USER app

ENV NODE_ENV=production

# Default command (overridden per service in compose). Chosen so a bare
# `docker run` still starts something sensible.
CMD ["node", "directory/src/index.ts"]
