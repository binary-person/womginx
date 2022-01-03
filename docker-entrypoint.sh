#!/bin/sh

set -e

# environment variables are set at runtime, so modify the conf only when it starts
sed -i "s/listen 80/listen $PORT/" /etc/nginx/nginx.conf

if [ ! -z "$SAFE_BROWSING" ]; then
    sed -i "s/1.1.1.1/1.1.1.3/" /etc/nginx/nginx.conf
fi


# default.conf makes docker listen to 80, and
# heroku's non-root user running this won't like it at all
rm /etc/nginx/conf.d/default.conf

nginx
