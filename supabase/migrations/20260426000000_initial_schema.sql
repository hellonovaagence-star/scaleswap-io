-- Profiles (auto-created on signup via trigger)
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  display_name text,
  avatar_url text,
  created_at timestamptz default now()
);
alter table public.profiles enable row level security;
create policy "Users read own profile" on public.profiles for select using (auth.uid() = id);
create policy "Users update own profile" on public.profiles for update using (auth.uid() = id);

-- Projects
create table public.projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  source_url text,
  variant_count int default 5,
  status text default 'draft' check (status in ('draft','processing','ready','error')),
  metadata jsonb default '{}',
  created_at timestamptz default now()
);
alter table public.projects enable row level security;
create policy "Users CRUD own projects" on public.projects for all using (auth.uid() = user_id);

-- Project Groups
create table public.project_groups (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  created_at timestamptz default now()
);
alter table public.project_groups enable row level security;
create policy "Users CRUD own groups" on public.project_groups for all using (auth.uid() = user_id);

-- Project <-> Group (many-to-many)
create table public.project_group_members (
  project_id uuid references public.projects(id) on delete cascade,
  group_id uuid references public.project_groups(id) on delete cascade,
  primary key (project_id, group_id)
);
alter table public.project_group_members enable row level security;
create policy "Users manage own memberships" on public.project_group_members for all
  using (exists (select 1 from public.projects where id = project_id and user_id = auth.uid()));

-- Captions
create table public.captions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  text text not null,
  position text default 'bottom' check (position in ('top','center','bottom')),
  font_size int default 24,
  font_color text default '#FFFFFF',
  stroke_color text default '#000000',
  created_at timestamptz default now()
);
alter table public.captions enable row level security;
create policy "Users CRUD own captions" on public.captions for all using (auth.uid() = user_id);

-- Caption Groups
create table public.caption_groups (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  description text,
  created_at timestamptz default now()
);
alter table public.caption_groups enable row level security;
create policy "Users CRUD own caption groups" on public.caption_groups for all using (auth.uid() = user_id);

-- Caption <-> Group (many-to-many)
create table public.caption_group_members (
  caption_id uuid references public.captions(id) on delete cascade,
  group_id uuid references public.caption_groups(id) on delete cascade,
  primary key (caption_id, group_id)
);
alter table public.caption_group_members enable row level security;
create policy "Users manage own caption memberships" on public.caption_group_members for all
  using (exists (select 1 from public.captions where id = caption_id and user_id = auth.uid()));

-- Variants (generated video outputs)
create table public.variants (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  variant_index int not null,
  status text default 'pending' check (status in ('pending','processing','valid','invalid')),
  output_url text,
  hash text,
  created_at timestamptz default now()
);
alter table public.variants enable row level security;
create policy "Users CRUD own variants" on public.variants for all using (auth.uid() = user_id);

-- Trigger: auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, display_name)
  values (new.id, new.email, split_part(new.email, '@', 1));
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
