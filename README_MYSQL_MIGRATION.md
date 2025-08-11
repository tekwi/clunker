# MySQL Migration Guide

This guide helps you migrate the Car Cash Offer App from PostgreSQL to MySQL.

## 1. Database Schema Setup

Run the `mysql_schema.sql` file on your MySQL database:

```sql
mysql -u username -p database_name < mysql_schema.sql
```

Or import it using your MySQL client (phpMyAdmin, MySQL Workbench, etc.)

## 2. Environment Configuration

Create a `.env` file in the root directory with your MySQL credentials:

```env
# Option 1: Use DATABASE_URL (recommended)
DATABASE_URL=mysql://username:password@host:port/database_name

# Option 2: Use individual variables
MYSQL_HOST=localhost
MYSQL_PORT=3306
MYSQL_USER=root
MYSQL_PASSWORD=your_password
MYSQL_DATABASE=car_cash_offers
```

## 3. Key Changes Made

### Database Schema Changes
- Changed from PostgreSQL UUID to MySQL CHAR(36) with UUID() function
- Updated timestamp defaults to use `CURRENT_TIMESTAMP`
- Added proper foreign key constraints with CASCADE options
- Added performance indexes on frequently queried columns

### Code Changes
- Updated `shared/schema.ts` to use MySQL table definitions
- Modified `server/db.ts` to use mysql2 driver instead of Neon
- Added support for both DATABASE_URL and individual env variables

### Dependencies
- Added `mysql2` package for MySQL connectivity
- Removed dependency on `@neondatabase/serverless`

## 4. Database Tables Created

1. **submissions** - Main car submission data
   - VIN, owner details, location, condition info
   - Automatic UUID generation and timestamps

2. **pictures** - Vehicle photos
   - Links to cloud storage URLs
   - Foreign key to submissions table

3. **offers** - Cash offers from admins
   - Offer price and notes
   - Foreign key to submissions table

## 5. Testing the Migration

1. Start the application: `npm run dev`
2. Submit a test car form to verify database connection
3. Upload photos to test file storage integration
4. Check that all data is properly saved to MySQL

## 6. Production Deployment Notes

- Ensure MySQL server has UTF8MB4 charset support
- Set up proper database user permissions
- Configure connection pooling for performance
- Set up regular database backups
- Monitor query performance and add indexes as needed

## 7. Troubleshooting

### Connection Issues
- Verify MySQL server is running
- Check firewall settings allow connection
- Confirm database and user exist
- Test credentials manually with MySQL client

### Schema Issues
- Ensure UTF8MB4 charset is supported
- Check UUID() function is available
- Verify foreign key constraints are enabled

### Migration from Existing Data
If you have existing PostgreSQL data, you'll need to:
1. Export data from PostgreSQL
2. Convert UUID formats if necessary
3. Import into MySQL following the new schema
4. Update any application references to work with MySQL data types