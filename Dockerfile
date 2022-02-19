### Build wombat ###
FROM node:16-alpine as builder

# Install deps (gettext is required for `envsubst`)
RUN apk add git gettext

COPY . /opt/womginx
WORKDIR /opt/womginx

# Generate nginx.conf using .env file
RUN env $(grep -v '^#' .env | xargs) envsubst '${PORT} ${SERVER_NAME} ${CERT_NAME} ${SSL}' < nginx_template.conf > nginx.conf

# For whatever reason, heroku doesn't copy the .git folder and the .gitmodules file, so we're
# approaching this assuming they will never exist
RUN rm -rf .git && git init
WORKDIR /opt/womginx/public
RUN rm -rf wombat && git submodule add https://github.com/webrecorder/wombat
WORKDIR /opt/womginx/public/wombat

# Wombat's latest version (as of January 4th, 2022; commit 72db794) breaks websocket functionality.
# Locking the version here temporarily until I can find a solution
RUN git checkout 78813ad

# Tries to install deps, if it fails (bufferutils doesn't have a prebuilt binary),
# then it installs the required build tools and runs again
RUN { npm install --legacy-peer-deps && npm run build-prod; } || { apk add python3 make gcc musl-dev libc-dev g++ && npm install --legacy-peer-deps && npm run build-prod; }

# Delete everything but the dist folder to save us an additional 50MB+
RUN mv dist .. && rm -rf * .git && mv ../dist/ .

# Modify nginx.conf
WORKDIR /opt/womginx
RUN ./docker-sed.sh

### Nginx ###
FROM nginx:stable-alpine

# Copy files
COPY --from=builder /opt/womginx /opt/womginx
RUN if [ ! -z $(ls /opt/womginx | grep letsencrypt) ]; then cp -r /opt/womginx/letsencrypt /etc/letsencrypt && rm -rf /opt/womginx/letsencrypt; fi

# Copy nginx config
RUN cp /opt/womginx/nginx.conf /etc/nginx/nginx.conf

RUN cat /etc/nginx/nginx.conf

# make sure nginx.conf works (mainly used for development)
RUN nginx -t

CMD /opt/womginx/docker-entrypoint.sh
