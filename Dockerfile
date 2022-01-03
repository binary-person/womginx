FROM node:16-alpine as builder

# build wombat
RUN apk add git
COPY . /opt/womginx

WORKDIR /opt/womginx
RUN git submodule update --init

WORKDIR /opt/womginx/public/wombat
RUN npm install && npm run build-prod

# modify nginx.conf
WORKDIR /opt/womginx

# change public dir to appropriate path
RUN sed -i -e "s/\/home\/binary\/womginx\/public/\/opt\/womginx\/public/g" nginx.conf

# disable ssl (since we're running this behind a reverse proxy like heroku)
RUN sed -i '/ssl_certificate/d' nginx.conf
RUN sed -i '/listen 443/d' nginx.conf

# prevent reverse proxy headers from being sent to destination site (heroku headers, for example)
RUN sed -i -e $"s/proxy_set_header Accept-Encoding/proxy_set_header x-request-id '';\
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
RUN sed -i -e "s/binary_remote_addr/http_x_forwarded_for/g" nginx.conf

# disable daemon mode for nginx
RUN sed -i '1idaemon off;' nginx.conf


FROM nginx:stable-alpine

# default environment variables in case a normal user doesn't specify it
ENV PORT=80
# set SAFE_BROWSING to any value to enable it
#ENV SAFE_BROWSING=1


COPY --from=builder /opt/womginx /opt/womginx
RUN cp /opt/womginx/nginx.conf /etc/nginx/nginx.conf

# make sure nginx.conf works (mainly used for development)
RUN nginx -t

# environment variables are set at runtime, so modify the conf only when it starts
CMD sed -i -e "s/listen 80/listen $PORT/" /etc/nginx/nginx.conf &&\
    [[ ! -z "$SAFE_BROWSING" ]] && sed -i -e "s/1.1.1.1/1.1.1.3/" /etc/nginx/nginx.conf || true &&\
    nginx
