ALTER TABLE public.projects ADD COLUMN batch_id uuid;
CREATE INDEX idx_projects_batch_id ON public.projects(batch_id);
