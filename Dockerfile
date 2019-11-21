FROM node:10.17-alpine

LABEL authors="Daniel Kokott <dako@berlingskemedia.dk>"

# Set the working directory.
WORKDIR /app

ADD . /app

RUN npm i --production

# To be using in a GET {API}/version
# https://docs.docker.com/v17.12/docker-cloud/builds/advanced/
#RUN echo $CACHE_TAG > /app/server/version
RUN echo Build date `date +%Y-%m-%d` > server/version

# Exposing our endpoint to Docker.
EXPOSE 9000

# When starting a container with our image, this command will be run.
CMD ["node", "server/index.js"]
