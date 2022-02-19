# Womginx

> Fastest proxy using only nginx as the backend server

<a href="https://repl.it/github/binary-person/womginx"><img src="https://docs.replit.com/images/repls/run-on-replit.svg" alt="Replit" width="150"/></a>

**Before you deploy to Heroku, read the following: Heroku decided that this repository violates the ToS, so directly clicking the button below if you're in the main repository will result in an error. Forked repositories may work, though this is not guaranteed. Regardless, I am NOT responsible if your Heroku account gets suspended because of deploying this application. Proceed at your own risk.**

[![Deploy](https://www.herokucdn.com/deploy/button.svg)](https://heroku.com/deploy)

Demo: https://womginx.arph.org

~~Heroku Docker demo: https://womginx.herokuapp.com~~ taken down for now. If you need one, deploy one using the button above or use the demo link.

## Site compatibility

What works:
1. recaptcha
2. discord with actual login credentials (no qr code required)
3. websocket sites
4. sites that have cookies

What doesn't work:
1. react sites
2. sites that depend on window.location and are minified
3. YouTube UI (however, you can watch a video like https://proxysite.com/main/https://www.youtube.com/watch?v=vidid and it will work)

## Prerequisites

You need one thing and one thing only: nginx.

Ok maybe not just that, you'll need the following:
1. nginx
2. certbot
3. nodejs (for building wombat)
4. a (sub)domain
5. a vps

## Installation (more simple and contained)

1. [Install Docker](https://docs.docker.com/engine/install/ubuntu/)
2. [Install docker-compose](https://docs.docker.com/compose/install/)
3. Clone this repo by running `git clone https://github.com/binary-person/womginx`
4. `cd womginx` then edit go and edit `.env`
    - To disable safe browsing, delete the line that says `SAFE_BROWSING`
    - To change the port, edit `PORT=80` to `newport`
    - Copy ssl files to `womginx/letsencrypt/live/[your domain]` (if you want https) and set `SSL=ssl` and `CERT_NAME=[your domain]`. Make sure your ssl certs are named `fullchain.pem` and `privkey.pem`.
5. then run `sudo docker-compose up -d` to start it
6. `sudo docker-compose down` to stop
7. If you want to update womginx to the latest version, run `git pull && sudo docker-compose up -d --build`

## Installation (more complex, direct, and permanent)

```bash
# assuming you are on Ubuntu/Debian

## Part 1 of installation ##

# update your repo list
sudo apt update

# 1. install nginx
sudo apt install nginx

# 2. install certbot and the nginx plugin
sudo apt install certbot python3-certbot-nginx

# 3. install nodejs (skip if you already have it)
curl -sL https://deb.nodesource.com/setup_14.x | sudo -E bash -
sudo apt-get install nodejs

# 4. Get a (sub)domain with an A(AAA) record pointing to your VPS IP

# 5. Get an ssl certificate
sudo certbot --nginx certonly -n -d yourdomain.com

## Part 2 of installation ##

# 1. clone repo and wombat submodule
git clone --recursive https://github.com/binary-person/womginx

# 2. build wombat
cd womginx/public/wombat
npm install
npm run build-prod

cd .. # cd into public folder

# 3. edit `.env` to use the ports/server name/safe browsing settings you want
nano ../.env

# 3. generate the nginx.conf file
env $(grep -v '^#' .env | xargs) envsubst '${PORT} ${SERVER_NAME} ${CERT_NAME} ${SSL}' < ../nginx_template.conf > ../nginx.conf

# 5. replace '/home/binary/womginx/public' with your public folder
sed -i -e "s/\/home\/binary\/womginx\/public/$(pwd | sed -e 's/\//\\\//g')/g" ../nginx.conf

# 6. make backup of original nginx.conf
sudo cp /etc/nginx/nginx.conf /etc/nginx/nginx.conf.backup

# 7. copy womginx nginx.conf to /etc/nginx/nginx.conf
sudo cp ../nginx.conf /etc/nginx/nginx.conf

# 8. restart the nginx server
sudo service nginx restart
```

## Why did you want to use only nginx and burden yourself with nginx's "restrictive" and "esoteric" config?

I did it as a game, or, challenge, for myself to learn nginx and also to take advantage of nginx's resilience and speed for handling lots of requests, which is perfect for proxying.

It also was to deter nginx's restrictive reputation (in a community server I'm in).

## Contributing

Contributions are welcome. Send in a pull request and I'll be more than happy to take a look.

## Future plans

Make another client rewriting library similar to wombat but made with intent to be a proxy rewriting library and with the goal of ease of use for the server and the client.

## License

This project is licensed under the AGPL license.

Wombat uses AGPL, and under the terms of that license, this project, therefore, is also required to be licensed under AGPL.

## Credits

- Front page design by [voept](https://github.com/voept)
- Logo design by [kinglalu](https://github.com/kinglalu)
