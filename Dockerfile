FROM node:16-alpine as builder

# build wombat
RUN apk add git
COPY . /opt/womginx

WORKDIR /opt/womginx
# for whatever reason, heroku doesn't copy the .git folder and the .gitmodules file, so we're
# approaching this assuming they don't exist
RUN git init
WORKDIR /opt/womginx/public
RUN rm -rf wombat && git submodule add https://github.com/webrecorder/wombat
WORKDIR /opt/womginx/public/wombat
# wombat's latest version (as of January 4th, 2022; commit 72db794) breaks websocket functionality.
# Locking the version here temporarily until I can find a solution
RUN git checkout 78813ad

WORKDIR /opt/womginx/public/wombat
RUN npm install --legacy-peer-deps && npm run build-prod

# modify nginx.conf
WORKDIR /opt/womginx

# change public dir to appropriate path
RUN sed -i "s/\/home\/binary\/womginx\/public/\/opt\/womginx\/public/g" nginx.conf

# disable ssl (since we're running this behind a reverse proxy like heroku)
RUN sed -i '/ssl_certificate/d' nginx.conf
RUN sed -i '/listen 443/d' nginx.conf

# prevent reverse proxy headers from being sent to destination site (heroku headers, for example)
RUN sed -i $"s/proxy_set_header Accept-Encoding/proxy_set_header x-request-id '';\
proxy_set_header x-forwarded-for '';\
proxy_set_header x-forwarded-proto '';\
proxy_set_header x-forwarded-port '';\
proxy_set_header via '';\
proxy_set_header connect-time '';\
proxy_set_header x-request-start '';\
proxy_set_header total-route-time '';\
proxy_set_header Accept-Encoding/" nginx.conf

# use x-forwarded-for instead of remote client ip since client ip would be our reverse proxy's, not our
# client's (heroku, for example)
RUN sed -i "s/binary_remote_addr/http_x_forwarded_for/g" nginx.conf

# pipe logs to stdout/stderr instead of the default /var/log/nginx/ location
RUN sed -i 's/http {/http {access_log \/dev\/stdout; error_log stderr;/' nginx.conf

# disable daemon mode for nginx
RUN sed -i '1i daemon off;' nginx.conf


FROM nginx:stable-alpine

# default environment variables in case a normal user doesn't specify it
ENV PORT=80
# set SAFE_BROWSING to any value to enable it
#ENV SAFE_BROWSING=1

COPY --from=builder /opt/womginx /opt/womginx
RUN cp /opt/womginx/nginx.conf /etc/nginx/nginx.conf

# make sure nginx.conf works (mainly used for development)
RUN nginx -t

CMD /opt/womginx/docker-entrypoint.sh
