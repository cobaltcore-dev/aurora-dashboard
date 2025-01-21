https://releases.openstack.org/

# devstack (containerized)

this is a containerized version of the devstack setup and was inspired by [containerized-devstack
](https://github.com/bobuhiro11/containerized-devstack). In this version, the devstack setup is run in one container and is built the images on the fly on the developer machine using docker-compose.

## build (manual)

0. `docker rm devstack`
1. `./docker-compose -f docker-compose.build.yaml build`
2. `./docker-compose -f docker-compose.build.yaml up`
3. `docker exec -it "devstack" /bin/bash -l -c "post-build"`
4. `./docker-compose -f docker-compose.build.yaml stop`
5. `docker commit devstack containerized-devstack:latest`
6. `docker rm devstack`

## run

## exec

- `docker exec -it --user stack devstack /bin/bash -l`
- `docker exec -it devstack /bin/bash -l`

## Development

### Syncing files

- `rsync -avz --delete -e ssh ./containerized-devstack/ user@VM_IP:~/containerized-devstack/ `
