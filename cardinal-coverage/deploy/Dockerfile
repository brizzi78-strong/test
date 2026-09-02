# Cardinal Coverage — gated tools service.
#
# Zero dependencies: the four tools and the investor materials are self-contained
# HTML, and the server is a single Node file. No npm install, no build step.
#
#   docker build -f cardinal-coverage/deploy/Dockerfile -t cardinal-coverage .
#   docker run -p 8080:8080 -e CC_PASSWORD=... cardinal-coverage

FROM node:22-alpine

WORKDIR /srv

# Only what is served, plus the server itself. The public marketing page in
# site/ is deliberately NOT copied — it ships as a separate open static site.
COPY cardinal-coverage/app ./cardinal-coverage/app
COPY cardinal-coverage/deploy/server.mjs ./cardinal-coverage/deploy/server.mjs

ENV NODE_ENV=production
EXPOSE 8080

# Run unprivileged.
USER node

CMD ["node", "cardinal-coverage/deploy/server.mjs"]
