https://releases.openstack.org/

# devstack (containerized)

This is a containerized version of the DevStack setup, inspired by [containerized-devstack
](https://github.com/bobuhiro11/containerized-devstack). In this version, the DevStack environment runs within a single container, and the images are built on-the-fly on the developer's machine using Docker Compose.

# Usage

0. copy the `.env.example` to `.env` and adjust the settings to your needs.
1. run `./build.sh` and wait until the build is complete, this can take a while. It will first build the base image and then run the whole devstack install process.
2. run `./start.sh` to start the devstack container.
3. if that is done you can exec into the container by running `docker exec -it devstack-ready /bin/bash -l` and run `openstack-status` to check the status of the services.
4. check also the openstack services by running `openstack service list`
5. you should be able to access the dashboard by going to `http://localhost:8080` in your browser.
6. to stop the container run `./stop.sh` or use `ctrl+c` in the terminal where you started the container.
7. to remove everything run `./clean.sh`

## build (manual)

0. `docker rm devstack-build`
1. `./docker-compose -f docker-compose.build.yaml build`
2. `./docker-compose -f docker-compose.build.yaml up`
3. `docker exec -it devstack-build /bin/bash -l -c "post-build"`
4. `docker exec -it devstack-build --user stack /bin/bash -l -c "test-devstack"`
5. `./docker-compose -f docker-compose.build.yaml stop`
6. `docker commit devstack-build devstack-build:latest`

## run (manual)

1. `./docker-compose up`

## exec

- `docker exec -it --user stack devstack-ready /bin/bash -l`
- `docker exec -it devstack-ready /bin/bash -l`
