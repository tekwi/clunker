# MySQL Setup Guide - DockChron Style

This guide provides a complete MySQL setup for the Car Cash Offers App, following DockChron-style database containerization patterns.

## Quick Start

### 1. Automated Setup (Recommended)
```bash
./setup-mysql.sh
```

### 2. Manual Setup

#### Step 1: Configure Environment
```bash
cp .env.mysql.example .env
# Edit .env with your database credentials
```

#### Step 2: Start MySQL Container
```bash
docker-compose -f docker-compose.mysql.yml up -d mysql
```

#### Step 3: Verify Connection
```bash
docker-compose -f docker-compose.mysql.yml logs mysql
```

## Configuration Files

### Environment Variables
The app supports multiple environment variable formats:

**Primary (DockChron Style):**
- `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`

**Legacy MySQL:**
- `MYSQL_HOST`, `MYSQL_PORT`, `MYSQL_USER`, `MYSQL_PASSWORD`, `MYSQL_DATABASE`

**URL Format:**
- `DATABASE_URL=mysql://user:password@host:port/database`

### Database Schema
- **File**: `mysql_schema.sql`
- **Auto-loaded**: Schema automatically created on first container start
- **Tables**: submissions, pictures, offers
- **Features**: UUID generation, foreign keys, indexes

### Performance Configuration
- **File**: `mysql.cnf`
- **Settings**: Optimized for development/small production
- **Charset**: UTF8MB4 for full Unicode support

## Container Services

### MySQL Database
- **Image**: mysql:8.0
- **Port**: 3306
- **Volume**: Persistent data storage
- **Health Check**: Automatic monitoring

### phpMyAdmin (Optional)
- **URL**: http://localhost:8080
- **User**: root
- **Password**: Your MySQL root password

## Database Schema Details

### Tables Structure
```sql
submissions (
  id CHAR(36) PRIMARY KEY,
  vin VARCHAR(17) NOT NULL,
  owner_name VARCHAR(100) NOT NULL,
  email VARCHAR(150) NOT NULL,
  title_condition VARCHAR(50) NOT NULL,
  vehicle_condition VARCHAR(50),
  odometer_reading VARCHAR(20),
  latitude DECIMAL(10,8),
  longitude DECIMAL(11,8),
  address VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
)

pictures (
  id CHAR(36) PRIMARY KEY,
  submission_id CHAR(36) REFERENCES submissions(id),
  url TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
)

offers (
  id CHAR(36) PRIMARY KEY,
  submission_id CHAR(36) REFERENCES submissions(id),
  offer_price DECIMAL(10,2) NOT NULL,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
)
```

## Useful Commands

### Container Management
```bash
# Start services
docker-compose -f docker-compose.mysql.yml up -d

# Stop services
docker-compose -f docker-compose.mysql.yml down

# View logs
docker-compose -f docker-compose.mysql.yml logs mysql

# Restart MySQL
docker-compose -f docker-compose.mysql.yml restart mysql
```

### Database Operations
```bash
# Connect to MySQL CLI
docker exec -it car-cash-mysql mysql -u car_user -p

# Backup database
docker exec car-cash-mysql mysqldump -u root -p car_cash_offers > backup.sql

# Import SQL file
docker exec -i car-cash-mysql mysql -u root -p car_cash_offers < schema.sql

# Reset database (careful!)
docker-compose -f docker-compose.mysql.yml down -v
docker-compose -f docker-compose.mysql.yml up -d
```

## Troubleshooting

### Connection Issues
1. **Check container status**: `docker ps`
2. **Check logs**: `docker-compose -f docker-compose.mysql.yml logs mysql`
3. **Verify credentials**: Check .env file matches container environment
4. **Test connection**: Use phpMyAdmin or MySQL CLI

### Port Conflicts
If port 3306 is in use, modify `docker-compose.mysql.yml`:
```yaml
ports:
  - "3307:3306"  # Use port 3307 instead
```
Then update DB_PORT in .env to 3307.

### Data Persistence
Data is stored in Docker volume `mysql_data`. To reset:
```bash
docker-compose -f docker-compose.mysql.yml down -v  # Warning: deletes all data!
```

### Performance Issues
1. Check available memory
2. Adjust `mysql.cnf` settings
3. Monitor slow query log
4. Add indexes for frequent queries

## Production Considerations

### Security
- Change default passwords
- Use secrets management
- Restrict network access
- Enable SSL/TLS
- Regular security updates

### Backup Strategy
- Daily automated backups
- Point-in-time recovery setup
- Test restore procedures
- Offsite backup storage

### Monitoring
- Set up health checks
- Monitor disk usage
- Track query performance
- Alert on connection limits

### Scaling
- Connection pooling optimization
- Read replicas for scaling reads
- Partitioning for large datasets
- Load balancer configuration

## Integration with Replit

This setup is designed to work with Replit's development environment:
- Local development with Docker
- Environment variable management
- File system integration
- Port forwarding support

The configuration follows DockChron patterns for:
- Container orchestration
- Environment management
- Service discovery
- Development workflow