#!/bin/bash
# MySQL Setup Script for Car Cash Offers App
# Based on DockChron-style containerized database setup

echo "🚀 Setting up MySQL for Car Cash Offers App..."

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed. Please install Docker first."
    exit 1
fi

# Check if Docker Compose is installed
if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose is not installed. Please install Docker Compose first."
    exit 1
fi

# Create .env file if it doesn't exist
if [ ! -f .env ]; then
    echo "📝 Creating .env file from template..."
    cp .env.mysql.example .env
    echo "✅ Created .env file. Please update it with your credentials."
else
    echo "✅ .env file already exists"
fi

# Start MySQL using Docker Compose
echo "🐳 Starting MySQL container..."
docker-compose -f docker-compose.mysql.yml up -d mysql

# Wait for MySQL to be ready
echo "⏳ Waiting for MySQL to start..."
sleep 30

# Check if MySQL is running
if docker-compose -f docker-compose.mysql.yml ps mysql | grep -q "Up"; then
    echo "✅ MySQL is running successfully!"
    
    # Display connection info
    echo ""
    echo "🔗 MySQL Connection Details:"
    echo "   Host: localhost"
    echo "   Port: 3306"
    echo "   Database: car_cash_offers"
    echo "   User: car_user"
    echo "   Password: (check your .env file)"
    echo ""
    
    # Optional: Start phpMyAdmin
    read -p "📊 Start phpMyAdmin for database management? (y/N): " start_phpmyadmin
    if [[ $start_phpmyadmin =~ ^[Yy]$ ]]; then
        docker-compose -f docker-compose.mysql.yml up -d phpmyadmin
        echo "✅ phpMyAdmin started at http://localhost:8080"
        echo "   Login: root / (your MySQL root password)"
    fi
    
    echo ""
    echo "🎉 MySQL setup complete!"
    echo "📁 Schema has been automatically created from mysql_schema.sql"
    echo "🚀 You can now start your application with: npm run dev"
    
else
    echo "❌ MySQL failed to start. Check the logs:"
    docker-compose -f docker-compose.mysql.yml logs mysql
    exit 1
fi