#!/bin/bash

set -e

DIR=$(pwd)
ESCAPED_DIR=$(echo $DIR | sed -e 's/\//\\\//g')

git pull

# install and build wombat or just update if the folder already exists
if [ ! -d $DIR/public/wombat/dist ]; then
    git submodule update --init --recursive
    cd $DIR/public/wombat
    npm install && npm run build-prod
fi

cd $DIR

# modify replit-nginx.conf without modifying nginx.conf to avoid git pull conflict message
rm -rf replit-nginx-temp
mkdir replit-nginx-temp
cp nginx.conf replit-nginx-temp/
cd replit-nginx-temp
../docker-sed.sh

# replace with appropriate public dir path
sed -i "s/\/opt\/womginx\/public/$ESCAPED_DIR\/public/g" nginx.conf

# add missing mime.types
curl https://raw.githubusercontent.com/nginx/nginx/master/conf/mime.types -o mime.types
sed -i "s/\/etc\/nginx\/mime.types/$ESCAPED_DIR\/replit-nginx-temp\/mime.types/g" nginx.conf

# for some reason, the 1.1.1.1 and 8.8.8.8 dns doesn't work
sed -i "s/1.1.1.1/1.1.1.3/" nginx.conf

# point cache folders to writable directories
rm -rf /tmp/womginx-cache
mkdir /tmp/womginx-cache
CACHE_DIR="\/tmp\/womginx-cache"
sed -i $"s/http {/http {\
client_body_temp_path $CACHE_DIR\/client_body;\
      proxy_temp_path $CACHE_DIR\/proxy;\
    fastcgi_temp_path $CACHE_DIR\/fastcgi;\
      uwsgi_temp_path $CACHE_DIR\/uwsgi;\
       scgi_temp_path $CACHE_DIR\/scgi;\
/" nginx.conf

nginx -c $DIR/replit-nginx-temp/nginx.conf -g 'error_log stderr;'
