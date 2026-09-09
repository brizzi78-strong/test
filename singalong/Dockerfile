# Memory Care Music Program — container image for AWS App Runner.
#
# On Render this runs buildpack-style (runtime: node, no Dockerfile). AWS App
# Runner deploys from an ECR image, so this wraps the same zero-dependency
# server (singalong/publish-server.mjs) in a minimal image — no npm install,
# no build step, matching how it already runs.
FROM node:22-alpine

WORKDIR /app

COPY singalong ./singalong

RUN addgroup -S app && adduser -S app -G app && chown -R app /app
USER app

ENV NODE_ENV=production

CMD ["node", "singalong/publish-server.mjs"]
