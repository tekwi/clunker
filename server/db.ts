import mysql from 'mysql2/promise';
import { drizzle } from 'drizzle-orm/mysql2';
import * as schema from "@shared/schema";

// Database configuration with fallback to environment variables
const dbConfig = {
  host: process.env.DB_HOST || process.env.MYSQL_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || process.env.MYSQL_PORT || '3306'),
  user: process.env.DB_USER || process.env.MYSQL_USER || 'root',
  password: process.env.DB_PASSWORD || process.env.MYSQL_PASSWORD || '',
  database: process.env.DB_NAME || process.env.MYSQL_DATABASE || 'car_cash_offers',
  charset: 'utf8mb4',
  timezone: 'Z',
};

// Parse DATABASE_URL if provided (format: mysql://user:password@host:port/database)
if (process.env.DATABASE_URL) {
  try {
    const url = new URL(process.env.DATABASE_URL);
    dbConfig.host = url.hostname;
    dbConfig.port = parseInt(url.port) || 3306;
    dbConfig.user = url.username;
    dbConfig.password = url.password;
    dbConfig.database = url.pathname.slice(1);
  } catch (error) {
    console.warn('Invalid DATABASE_URL format, using individual config variables');
  }
}

// Create MySQL connection pool
export const pool = mysql.createPool({
  ...dbConfig,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

// Initialize Drizzle ORM
export const db = drizzle(pool, { schema, mode: 'default' });

// Test database connection on startup
pool.getConnection()
  .then(connection => {
    console.log('✅ MySQL database connected successfully');
    connection.release();
  })
  .catch(error => {
    console.error('❌ MySQL connection failed:', error.message);
    console.log('Please check your database configuration:');
    console.log(`- Host: ${dbConfig.host}:${dbConfig.port}`);
    console.log(`- Database: ${dbConfig.database}`);
    console.log(`- User: ${dbConfig.user}`);
  });