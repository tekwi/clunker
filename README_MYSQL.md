# MySQL Database Setup

## Quick Start

1. **Start MySQL:**
   ```bash
   ./start-mysql.sh
   ```

2. **Start the application:**
   ```bash
   npm run dev
   ```

## Manual Setup

### 1. Environment Configuration
```bash
cp .env.example .env
```

### 2. Start MySQL Container
```bash
docker-compose up -d mysql
```

### 3. Connect to Database
```bash
docker exec -it car_cash_mysql mysql -u car_user -p
```

## Database Schema

The following tables will be automatically created:

- **submissions** - Vehicle submission data
- **pictures** - Photo storage URLs
- **offers** - Admin cash offers

## Configuration

### Environment Variables
- `MYSQL_HOST` - Database host (default: localhost)
- `MYSQL_PORT` - Database port (default: 3306)
- `MYSQL_USER` - Database user (default: car_user)
- `MYSQL_PASSWORD` - Database password (default: password123)
- `MYSQL_DATABASE` - Database name (default: car_cash_offers)

### Default Credentials
- **User:** car_user
- **Password:** password123
- **Database:** car_cash_offers
- **Root Password:** root123

## Troubleshooting

### Connection Issues
```bash
# Check container status
docker-compose ps

# Check logs
docker-compose logs mysql

# Restart MySQL
docker-compose restart mysql
```

### Reset Database
```bash
# Warning: This will delete all data
docker-compose down -v
docker-compose up -d mysql
```