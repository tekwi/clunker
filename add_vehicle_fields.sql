
-- ALTER statements to add vehicle information fields to submissions table
-- Note: These fields already exist in the current schema, so these are for reference only

ALTER TABLE submissions 
ADD COLUMN vehicle_make VARCHAR(50),
ADD COLUMN vehicle_model VARCHAR(50), 
ADD COLUMN vehicle_year VARCHAR(4);

-- If you need to add them with specific positioning (after VIN column):
-- ALTER TABLE submissions 
-- ADD COLUMN vehicle_make VARCHAR(50) AFTER vin,
-- ADD COLUMN vehicle_model VARCHAR(50) AFTER vehicle_make,
-- ADD COLUMN vehicle_year VARCHAR(4) AFTER vehicle_model;
