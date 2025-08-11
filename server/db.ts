import mysql from 'mysql2/promise';
import { drizzle } from 'drizzle-orm/mysql2';
import * as schema from "@shared/schema";

// MySQL connection configuration
const connectionConfig = {
  host: process.env.MYSQL_HOST || 'localhost',
  port: parseInt(process.env.MYSQL_PORT || '3306'),
  user: process.env.MYSQL_USER || 'root',
  password: process.env.MYSQL_PASSWORD || '',
  database: process.env.MYSQL_DATABASE || 'car_cash_offers',
  charset: 'utf8mb4',
};

// Support both individual config and DATABASE_URL format
if (process.env.DATABASE_URL) {
  // Parse DATABASE_URL format: mysql://user:password@host:port/database
  const url = new URL(process.env.DATABASE_URL);
  connectionConfig.host = url.hostname;
  connectionConfig.port = parseInt(url.port) || 3306;
  connectionConfig.user = url.username;
  connectionConfig.password = url.password;
  connectionConfig.database = url.pathname.slice(1); // Remove leading slash
}

// Create connection pool
export const pool = mysql.createPool({
  ...connectionConfig,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

export const db = drizzle(pool, { schema, mode: 'default' });