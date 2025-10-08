
#!/bin/bash

# This script builds and starts the API Health Checker application using Docker Compose.

echo "Starting API Health Checker..."

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
  echo "Error: Docker does not seem to be running. Please start Docker and try again." >&2
  exit 1
fi

echo "Building and starting services with Docker Compose..."

docker compose up --build -d

if [ $? -eq 0 ]; then
  echo ""
  echo "Application started successfully!"
  echo "You can access it at: http://localhost:5102"
else
  echo ""
  echo "Error: Failed to start the application with Docker Compose." >&2
  echo "Please check the output above for errors." >&2
  exit 1
fi
