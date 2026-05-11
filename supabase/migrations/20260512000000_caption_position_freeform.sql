-- Allow exact "Y,X" coordinates in caption position (was restricted to top/center/bottom)
ALTER TABLE public.captions DROP CONSTRAINT IF EXISTS captions_position_check;
