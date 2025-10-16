
-- Blog Posts Table for SEO-Optimized Content
CREATE TABLE IF NOT EXISTS blog_posts (
  id VARCHAR(36) PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  slug VARCHAR(255) NOT NULL UNIQUE,
  content TEXT NOT NULL,
  excerpt TEXT,
  
  -- SEO Fields
  meta_title VARCHAR(255),
  meta_description TEXT,
  og_title VARCHAR(255),
  og_description TEXT,
  og_image VARCHAR(500),
  
  -- URL Structure Fields
  post_type ENUM('blog', 'sell-my-car', 'junk-car-removal') NOT NULL DEFAULT 'blog',
  vehicle_make VARCHAR(100),
  vehicle_model VARCHAR(100),
  state_name VARCHAR(100),
  city_name VARCHAR(100),
  
  -- Featured Image
  featured_image VARCHAR(500),
  
  -- Publishing
  status ENUM('draft', 'published', 'archived') DEFAULT 'draft',
  published_at TIMESTAMP NULL,
  
  -- Metadata
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  INDEX idx_slug (slug),
  INDEX idx_post_type (post_type),
  INDEX idx_vehicle (vehicle_make, vehicle_model),
  INDEX idx_location (state_name, city_name),
  INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
