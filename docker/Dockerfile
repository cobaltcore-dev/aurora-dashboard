FROM node:23-alpine 

# install git
RUN apk add --no-cache git  ca-certificates

# clone the repo
RUN npm i -g pnpm 
WORKDIR /app 
RUN git clone --branch main --single-branch https://github.com/cobaltcore-dev/aurora-dashboard.git .

RUN pnpm install && pnpm build 

WORKDIR /app/apps/aurora-portal

CMD ["pnpm","prod"]