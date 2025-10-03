
-- Create admin_settings table
CREATE TABLE admin_settings (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    setting_key VARCHAR(100) NOT NULL UNIQUE,
    setting_value VARCHAR(255) NOT NULL,
    setting_type VARCHAR(50) NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_setting_key (setting_key)
) ENGINE=InnoDB CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Insert default settings
INSERT INTO admin_settings (setting_key, setting_value, setting_type, description) VALUES
('margin_type', 'percentage', 'string', 'Type of margin: percentage or fixed'),
('margin_value', '10', 'number', 'Margin value (percentage or fixed dollar amount)'),
('service_charge', '50', 'number', 'Service charge per car in dollars');
