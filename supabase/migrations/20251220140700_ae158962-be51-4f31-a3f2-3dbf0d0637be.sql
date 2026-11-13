-- Add thumbnail_url column to online_sessions table
ALTER TABLE public.online_sessions
ADD COLUMN thumbnail_url TEXT;