#!/bin/bash

if [ ! -f "./prepare.sh" ]; then
  echo "ERROR: no prepare.sh found! Please run this script from the root"
  exit 1
fi
./prepare.sh

echo "Check for existing build container..."
if ! docker ps --filter "status=exited" --filter "name=devstack-build" -q | grep -q .; then
  echo "There is no build version existing. 🛑"
  echo "Please run build.sh first."
  exit 0
else
  echo "Found existing build container ✅"
  echo "Check for existing build image..."
  if ! docker image ls | grep -q devstack:ready; then
    echo "Found existing build image ✅"
    if docker ps --filter "status=exited" --filter "name=devstack-ready" -q | grep -q .; then
      echo "There is already a stopped devstack container. Do you want to remove it and start a new one? [y/n]"
      read -r response
      if [ "$response" != "y" ]; then
        ./docker-compose rm
      fi
    fi
    echo "Starting Devstack..."
    ./docker-compose up
  else
    echo "No build image found. 🛑"
    echo "Please run build.sh first."
    exit 0
  fi
fi
