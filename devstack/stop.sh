#!/bin/bash

if [ ! -f "./prepare.sh" ]; then
  echo "ERROR: no prepare.sh found! Please run this script from the root"
  exit 1
fi
./prepare.sh

echo "Check for existing build container..."
if ! docker ps | grep -q devstack-ready; then
  echo "There is no devstack running. 🛑"
  echo "Please run start.sh first."
  exit 0
else
  echo "Found existing devstack container ✅"
  # ask user if they want to remove the existing container
  echo "Do you want to stop the existing devstack? [y/n]"
  read -r response
  if [ "$response" != "y" ]; then
    echo "Exiting..."
    exit 0
  fi
  ./docker-compose stop
fi
