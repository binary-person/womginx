FROM ubuntu:18.04

# install nginx, git, and curl
RUN apt-get update && apt-get install -y nginx git curl

# install nodejs
RUN curl -sL https://deb.nodesource.com/setup_14.x | bash - && apt-get install -y nodejs

# clone repo
RUN git clone --recursive https://github.com/binary-person/womginx /opt/womginx

# build womginx, modify nginx.conf, and copy it to /etc/nginx/nginx.conf
RUN cd /opt/womginx/public/wombat && npm install && npm run build-prod && cd ..\
    && sed -i -e "s/\/home\/binary\/womginx\/public/$(pwd | sed -e 's/\//\\\//g')/g" ../nginx.conf\
    && cp ../nginx.conf /etc/nginx/nginx.conf

# remove all ssl entries and replace 'listen 80' with 'listen $PORT'
CMD sed -i '/ssl_certificate/d' /etc/nginx/nginx.conf\
    && sed -i '/listen 443/d' /etc/nginx/nginx.conf\
    && sed -i -e "s/listen 80/listen $PORT/" /etc/nginx/nginx.conf\
    && nginx -g "daemon off;"