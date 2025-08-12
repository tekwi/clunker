import { defineConfig } from "drizzle-kit";

export default defineConfig({
  out: "./migrations",
  schema: "./shared/schema.ts",
  dialect: "mysql",
  dbCredentials: {
    host: process.env.DB_HOST || process.env.MYSQL_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || process.env.MYSQL_PORT || '3306'),
    user: process.env.DB_USER || process.env.MYSQL_USER || 'car_user',
    password: process.env.DB_PASSWORD || process.env.MYSQL_PASSWORD || 'password123',
    database: process.env.DB_NAME || process.env.MYSQL_DATABASE || 'clunker',
  },
});
