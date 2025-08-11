import mysql from 'mysql2/promise';
import { drizzle } from 'drizzle-orm/mysql2';
import * as schema from "@shared/schema";

// Database configuration - AWS RDS setup
const dbConfig = {
  host: process.env.DB_HOST || process.env.MYSQL_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || process.env.MYSQL_PORT || '3306'),
  user: process.env.DB_USER || process.env.MYSQL_USER || 'car_user',
  password: process.env.DB_PASSWORD || process.env.MYSQL_PASSWORD || 'password123',
  database: process.env.DB_NAME || process.env.MYSQL_DATABASE || 'clunker',
  charset: 'utf8mb4',
};

// Create MySQL connection pool
export const pool = mysql.createPool({
  ...dbConfig,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

// Initialize Drizzle ORM
export const db = drizzle(pool, { schema, mode: 'default' });

// Database connection test
async function testConnection() {
  try {
    const connection = await pool.getConnection();
    console.log('MySQL database connected successfully');
    connection.release();
  } catch (error) {
    console.error('MySQL connection failed:', error.message);
    console.log('Database config:', {
      host: dbConfig.host,
      port: dbConfig.port,
      database: dbConfig.database,
      user: dbConfig.user
    });
  }
}

// Test connection on startup
testConnection();