ALTER TABLE projects ADD COLUMN type TEXT NOT NULL DEFAULT 'video' CHECK (type IN ('video', 'image'));
