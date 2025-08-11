#!/bin/bash

echo "Starting MySQL database..."

# Create .env file if it doesn't exist
if [ ! -f .env ]; then
    cp .env.example .env
    echo ".env file created from template"
fi

# Start MySQL container
docker-compose up -d mysql

# Wait for MySQL to be ready
echo "Waiting for MySQL to start..."
sleep 15

# Check if MySQL is running
if docker-compose ps mysql | grep -q "Up"; then
    echo "MySQL is running successfully!"
    echo "Database: car_cash_offers"
    echo "User: car_user"
    echo "Password: password123"
    echo "Port: 3306"
else
    echo "MySQL failed to start. Check logs:"
    docker-compose logs mysql
fi