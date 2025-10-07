
-- Add reminderSentAt field to offers table for tracking reminder emails

ALTER TABLE offers 
ADD COLUMN reminder_sent_at TIMESTAMP NULL AFTER accepted_at;

-- Add index for better query performance when checking for reminders
CREATE INDEX idx_offers_reminder_sent_at ON offers(reminder_sent_at);

-- Add index on status for better filtering of pending offers
CREATE INDEX idx_offers_status ON offers(status);
