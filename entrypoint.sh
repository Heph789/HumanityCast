#!/bin/sh

# Wait for database to be ready
echo "Waiting for database to be ready..."
while ! nc -z postgres 5432; do
  sleep 1
done

# Run migrations
echo "Running database migrations..."
yarn prisma migrate deploy

# Start the application
echo "Starting the application..."
exec node server.js 