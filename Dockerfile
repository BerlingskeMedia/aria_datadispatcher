FROM ubuntu:18.04

LABEL authors="Daniel Kokott <dako@berlingskemedia.dk>"

# Installing wget - needed to download node.js
RUN apt-get update && apt-get install -y wget

# Using latest LTS release.
ENV NODE_VERSION v10.15.3

# Downloading and installing Node.
RUN wget -O - https://nodejs.org/dist/$NODE_VERSION/node-$NODE_VERSION-linux-x64.tar.gz \
    | tar xzf - --strip-components=1 --exclude="README.md" --exclude="LICENSE" \
    --exclude="ChangeLog" -C "/usr/local"

# Set the working directory.
WORKDIR /app

ADD . /app

RUN npm i --production

RUN env
# To be using in a GET {API}/version
# https://docs.docker.com/v17.12/docker-cloud/builds/advanced/
#RUN echo $CACHE_TAG > /app/server/version

# Exposing our endpoint to Docker.
EXPOSE 9000

# When starting a container with our image, this command will be run.
CMD ["node", "server/index.js"]
