-- Run this in Supabase SQL Editor (Dashboard > SQL Editor > New query)
-- This creates a cron job that deletes files older than 24h from the "videos" bucket
-- Acts as a safety net in case client-side cleanup fails

-- Enable pg_cron extension (already enabled on Pro plan)
create extension if not exists pg_cron;

-- Create the cleanup function
create or replace function cleanup_old_storage_files()
returns void
language plpgsql
security definer
as $$
begin
  delete from storage.objects
  where bucket_id = 'videos'
    and created_at < now() - interval '24 hours';
end;
$$;

-- Schedule it to run every hour
select cron.schedule(
  'cleanup-old-videos',
  '0 * * * *',
  'select cleanup_old_storage_files()'
);
