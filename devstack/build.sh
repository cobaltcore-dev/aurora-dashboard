#!/bin/bash -e

if [ ! -f "./prepare.sh" ]; then
  echo "ERROR: no prepare.sh found! Please run this script from the root"
  exit 1
fi
./prepare.sh

# https://github.com/openstack/devstack/branches/active
# this version is used in docker-compose.build.yaml
DEVSTACK_VERSION=$1
if [ -z "$DEVSTACK_VERSION" ]; then
  source ".env"
fi
# Public IP of the host machine set in docker-compose.build.yaml
PUBLIC_IP=$2
if [ -z "$PUBLIC_IP" ]; then
  source ".env"
fi

CONTAINER_NAME="devstack-build"

# Build the container
./clean.sh
if [[ $? -eq 10 ]]; then
  exit 1 # Exit the parent script if cleaning was not confirmed
fi

./docker-compose -f docker-compose.build.yaml build &&
  ./docker-compose -f docker-compose.build.yaml up -d

FILE_PATH="/opt/stack/setup-devstack-done"

while true; do
  # Check if the file exists in the container
  if docker exec "$CONTAINER_NAME" [ -f "$FILE_PATH" ]; then
    echo "Build done 😊"
    echo "Running post-build tasks...please wait"
    docker exec -it "$CONTAINER_NAME" /bin/bash -l -c "post-build" &&
      docker exec -it --user stack "$CONTAINER_NAME" /bin/bash -l -c "test-devstack" &&
      ./docker-compose -f docker-compose.build.yaml stop &&
      docker commit $CONTAINER_NAME devstack-build:latest &&
      echo "Containerized Devstack is ready to use 👍 Run 'start.sh' to start the devstack"
    exit 0
  else
    echo "Build in progress..."
    ./docker-compose -f docker-compose.build.yaml logs -t --tail=100
    sleep 3
  fi

done
