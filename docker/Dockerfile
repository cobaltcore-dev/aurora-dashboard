FROM node:23-alpine 

# install git
RUN apk add --no-cache git  ca-certificates curl
RUN set -e; curl -fL http://aia.pki.co.sap.com/aia/SAP%20Global%20Root%20CA.crt | tr -d '\r' > /usr/local/share/ca-certificates/SAP_Global_Root_CA.crt \
  && update-ca-certificates;

# clone the repo
RUN npm i -g pnpm 
WORKDIR /app 
RUN git clone --branch main --single-branch https://github.com/cobaltcore-dev/aurora-dashboard.git .

# ADD ./apps/aurora-portal/aurora.config.json /app/apps/aurora-portal/aurora.config.json
RUN pnpm install && pnpm build 

WORKDIR /app/apps/aurora-portal

CMD ["pnpm","prod"]