#!/bin/sh

set -e

export $(grep -v '^#' .env | xargs)

if [ ! -z "$SAFE_BROWSING" ]; then
    sed -i "s/1.1.1.1/1.1.1.3/" /etc/nginx/nginx.conf
fi


# default.conf makes docker listen to 80, and
# heroku's non-root user running this won't like it at all
rm -f /etc/nginx/conf.d/default.conf

nginx
