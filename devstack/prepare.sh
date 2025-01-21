#!/bin/bash

if [ ! "$(command -v docker)" ]; then
  echo "command \"docker\" does not exists on the system! Please install it first ⚡"
  exit 1
fi

if [ ! -f "./docker-compose" ]; then
  echo "No docker-compose found ⚡"
  ./install-docker-compose.sh
  curl -L https://raw.githubusercontent.com/docker/compose/1.29.2/scripts/run/run.sh >docker-compose
fi

if [ ! -f "./docker-compose" ]; then
  echo "ERROR: docker-compose not found. 👎"
  exit 1
fi
