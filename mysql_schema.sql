-- Car Cash Offer App - MySQL Database Schema
-- Created for migrating from PostgreSQL to MySQL
-- Run this script on your MySQL database to create the required tables

-- Create database (optional - uncomment if needed)
-- CREATE DATABASE car_cash_offers CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
-- USE car_cash_offers;

-- Enable UUID() function support
SET sql_mode = '';

-- Create submissions table
CREATE TABLE submissions (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    vin VARCHAR(17) NOT NULL,
    owner_name VARCHAR(100) NOT NULL,
    email VARCHAR(150) NOT NULL,
    phone_number VARCHAR(20) NOT NULL,
    title_condition VARCHAR(50) NOT NULL,
    vehicle_condition VARCHAR(50) NULL,
    odometer_reading VARCHAR(20) NULL,
    latitude DECIMAL(10, 8) NULL,
    longitude DECIMAL(11, 8) NULL,
    address VARCHAR(255) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    -- Add indexes for better performance
    INDEX idx_submissions_vin (vin),
    INDEX idx_submissions_email (email),
    INDEX idx_submissions_created_at (created_at)
) ENGINE=InnoDB CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Create pictures table
CREATE TABLE pictures (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    submission_id CHAR(36) NOT NULL,
    url TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Foreign key constraint
    CONSTRAINT fk_pictures_submission 
        FOREIGN KEY (submission_id) 
        REFERENCES submissions(id) 
        ON DELETE CASCADE 
        ON UPDATE CASCADE,
    
    -- Add index for foreign key
    INDEX idx_pictures_submission_id (submission_id)
) ENGINE=InnoDB CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Create offers table
CREATE TABLE offers (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    submission_id CHAR(36) NOT NULL,
    offer_price DECIMAL(10, 2) NOT NULL,
    notes TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Foreign key constraint
    CONSTRAINT fk_offers_submission 
        FOREIGN KEY (submission_id) 
        REFERENCES submissions(id) 
        ON DELETE CASCADE 
        ON UPDATE CASCADE,
    
    -- Add index for foreign key
    INDEX idx_offers_submission_id (submission_id),
    INDEX idx_offers_price (offer_price)
) ENGINE=InnoDB CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Insert sample data (optional - for testing)
-- You can uncomment these lines to add sample data

/*
INSERT INTO submissions (id, vin, owner_name, email, title_condition, vehicle_condition, odometer_reading, address) 
VALUES 
    (UUID(), '1HGBH41JXMN109186', 'John Smith', 'john@example.com', 'Clean', 'Good', '85000', '123 Main St, Anytown, USA'),
    (UUID(), '1G1BC5SM8F7123456', 'Jane Doe', 'jane@example.com', 'Salvage', 'Fair', '120000', '456 Oak Ave, Another City, USA');

-- Note: Replace with actual submission IDs when inserting pictures and offers
-- INSERT INTO pictures (submission_id, url) VALUES ('submission-id-here', 'https://example.com/photo1.jpg');
-- INSERT INTO offers (submission_id, offer_price, notes) VALUES ('submission-id-here', 5500.00, 'Fair condition, minor cosmetic issues');
*/

-- Display table information
SHOW TABLES;
DESCRIBE submissions;
DESCRIBE pictures;
DESCRIBE offers;