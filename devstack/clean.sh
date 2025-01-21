#!/bin/bash

echo ""
echo "Check for existing build container...👀"
if docker ps -a --filter "name=devstack-build" -q | grep -q .; then
  # ask user if they want to remove the existing container
  echo "There is a build version existing. Do you want to remove it and build everything from scratch? [y/n]"
  read -r response
  if [ "$response" != "y" ]; then
    echo "Exiting..."
    exit 10
  fi
  echo "Removing existing container...💀"
  docker stop devstack-build 2>/dev/null
  docker rm devstack-build 2>/dev/null
  docker stop devstack-ready 2>/dev/null
  docker rm devstack-ready 2>/dev/null
  docker network rm devstack_management_network 2>/dev/null
fi
