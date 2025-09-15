
-- Create vehicle_makes table
CREATE TABLE vehicle_makes (
    id VARCHAR(36) PRIMARY KEY,
    make VARCHAR(100) NOT NULL UNIQUE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_make (make),
    INDEX idx_active (is_active)
) ENGINE=InnoDB CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Create vehicle_models table
CREATE TABLE vehicle_models (
    id VARCHAR(36) PRIMARY KEY,
    make_id VARCHAR(36) NOT NULL,
    model VARCHAR(100) NOT NULL,
    year VARCHAR(4) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_make_id (make_id),
    INDEX idx_model (model),
    INDEX idx_year (year),
    INDEX idx_active (is_active),
    INDEX idx_make_model_year (make_id, model, year),
    FOREIGN KEY (make_id) REFERENCES vehicle_makes(id) ON DELETE CASCADE
) ENGINE=InnoDB CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
