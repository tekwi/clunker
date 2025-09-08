
-- Create affiliates table
CREATE TABLE affiliates (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    name VARCHAR(100) NOT NULL,
    email VARCHAR(150) NOT NULL,
    phone VARCHAR(20) NULL,
    unique_code VARCHAR(20) NOT NULL UNIQUE,
    commission_rate DECIMAL(5, 4) DEFAULT 0.0500,
    is_active VARCHAR(5) DEFAULT 'true',
    total_earnings DECIMAL(10, 2) DEFAULT 0.00,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_affiliates_code (unique_code),
    INDEX idx_affiliates_active (is_active)
) ENGINE=InnoDB CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Create affiliate_submissions table
CREATE TABLE affiliate_submissions (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    affiliate_id CHAR(36) NOT NULL,
    submission_id CHAR(36) NOT NULL,
    commission_amount DECIMAL(10, 2) NULL,
    status VARCHAR(20) DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT fk_affiliate_submissions_affiliate 
        FOREIGN KEY (affiliate_id) 
        REFERENCES affiliates(id) 
        ON DELETE CASCADE 
        ON UPDATE CASCADE,
    
    CONSTRAINT fk_affiliate_submissions_submission 
        FOREIGN KEY (submission_id) 
        REFERENCES submissions(id) 
        ON DELETE CASCADE 
        ON UPDATE CASCADE,
    
    INDEX idx_affiliate_submissions_affiliate_id (affiliate_id),
    INDEX idx_affiliate_submissions_submission_id (submission_id),
    INDEX idx_affiliate_submissions_status (status)
) ENGINE=InnoDB CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Add affiliate_code column to submissions table
ALTER TABLE submissions 
ADD COLUMN affiliate_code VARCHAR(20) NULL AFTER address,
ADD INDEX idx_submissions_affiliate_code (affiliate_code);
