-- ================================================
-- PHASE 15: ATTENDANCE PHOTO CAPTURE
-- Run this SQL in Supabase SQL Editor
-- ================================================

-- 1. Add photo_url column to attendance_logs
ALTER TABLE attendance_logs 
ADD COLUMN IF NOT EXISTS photo_url TEXT;

-- 2. Create storage bucket for attendance photos (run in Supabase Dashboard -> Storage)
-- Bucket name: attendance-photos
-- Public: true

-- ================================================
-- END OF MIGRATION
-- ================================================
