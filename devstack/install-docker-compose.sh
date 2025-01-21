#!/bin/bash -e

# Determine the OS type
OS=$(uname -s)
ARCH=$(uname -m)

source .env

# Set the download URL based on the OS
DOWNLOAD_URL="https://github.com/docker/compose/releases/download/${DOCKER_COMPOSE_VERSION}/docker-compose-${OS}-${ARCH}"

# Download Docker Compose
echo "Downloading Docker Compose from $DOWNLOAD_URL..."
curl -L "$DOWNLOAD_URL" -o ./docker-compose

# Set executable permissions
sudo chmod +x ./docker-compose

# Verify installation
./docker-compose --version

echo "Docker Compose installed successfully."
