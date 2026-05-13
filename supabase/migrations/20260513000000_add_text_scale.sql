-- Save text_scale (resize zoom) separately from font_size (layout)
ALTER TABLE public.captions ADD COLUMN IF NOT EXISTS text_scale real DEFAULT 1.0;

-- Also drop the position check constraint if not already done
ALTER TABLE public.captions DROP CONSTRAINT IF EXISTS captions_position_check;
