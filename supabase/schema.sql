
-- =============================================================================
-- SkillSprint Complete Database Schema
-- Covers: Auth, Roles, Gamification, Content, AI Caching, Storage, RLS
-- =============================================================================

-- 1. CLEANUP & EXTENSIONS
-- -----------------------------------------------------------------------------
-- Un-comment the next line if you need to do a full hard reset (Data Loss Warning!)
-- drop schema public cascade; create schema public;

create extension if not exists "uuid-ossp";
create extension if not exists "moddatetime"; -- Auto-update updated_at columns

-- 2. ENUMS & TYPES
-- -----------------------------------------------------------------------------
create type public.user_role as enum ('MEMBER', 'PREMIUM', 'MODERATOR', 'ADMIN');
create type public.question_type as enum ('mcq', 'true_false', 'input', 'info');
create type public.difficulty_level as enum ('BEGINNER', 'INTERMEDIATE', 'ADVANCED');

-- 3. CORE TABLES
-- -----------------------------------------------------------------------------

-- PROFILES
-- Extends the auth.users table with app-specific data
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  username text unique not null,
  full_name text,
  avatar_url text,
  role public.user_role not null default 'MEMBER',
  bio text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- USER STATS (Secure Table)
-- Critical game data. No direct writes from client. 
-- Only Deno Edge Functions (service_role) can update this.
create table public.user_stats (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  xp integer not null default 0,
  streak_days integer not null default 0,
  level integer not null default 1,
  last_active_date timestamptz default now(),
  total_sprints_completed integer default 0,
  updated_at timestamptz not null default now()
);

-- 4. GAMIFICATION (Badges)
-- -----------------------------------------------------------------------------

-- BADGE DEFINITIONS
create table public.badges (
  id text primary key, -- e.g., 'early-bird', 'streak-master-30'
  name text not null,
  description text not null,
  icon_url text not null, -- Path in storage or generic URL
  xp_bonus integer default 0,
  created_at timestamptz default now()
);

-- USER BADGES
-- Which user has which badge. Secure table.
create table public.user_badges (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  badge_id text not null references public.badges (id) on delete cascade,
  awarded_at timestamptz default now(),
  unique(user_id, badge_id) -- User can't have same badge twice
);

-- 5. CONTENT MANAGEMENT (LMS)
-- -----------------------------------------------------------------------------

-- TRACKS
create table public.tracks (
  id uuid primary key default uuid_generate_v4(),
  slug text unique, -- for pretty URLs
  title text not null,
  description text,
  icon text, -- Lucide icon name or image URL
  color_gradient text, -- CSS class string e.g., 'from-blue-500 to-cyan-500'
  difficulty public.difficulty_level default 'BEGINNER',
  is_premium boolean default false,
  is_published boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- LESSONS
create table public.lessons (
  id uuid primary key default uuid_generate_v4(),
  track_id uuid not null references public.tracks (id) on delete cascade,
  title text not null,
  content jsonb not null, -- Rich text/Markdown content blocks
  "order" integer not null, -- Sequencing
  xp_reward integer default 10,
  created_at timestamptz default now()
);

-- QUESTIONS
create table public.questions (
  id uuid primary key default uuid_generate_v4(),
  lesson_id uuid not null references public.lessons (id) on delete cascade,
  type public.question_type not null,
  question text not null,
  options jsonb, -- Array of strings for MCQ
  answer jsonb not null, -- The correct answer value or index
  explanation text, -- Shown after answering
  created_at timestamptz default now()
);

-- 6. PROGRESS TRACKING & AI CACHING
-- -----------------------------------------------------------------------------

-- USER PROGRESS
-- Granular tracking of specific lessons
create table public.user_progress (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  lesson_id uuid not null references public.lessons (id) on delete cascade,
  is_completed boolean default false,
  score integer default 0,
  completed_at timestamptz,
  unique(user_id, lesson_id)
);

-- DAILY SPRINTS (AI Caching)
-- Stores the generated sprint for a user for a specific day.
-- Prevents re-querying Gemini if the user reloads the page.
create table public.daily_sprints (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  date date not null default current_date,
  content jsonb not null, -- The entire generated JSON of cards/questions
  is_completed boolean default false,
  xp_earned integer default 0,
  created_at timestamptz default now(),
  unique(user_id, date)
);

-- 7. STORAGE BUCKETS (System)
-- -----------------------------------------------------------------------------
-- Note: You usually create buckets via UI, but this SQL creates the entries if system triggers exist.
-- We will handle pertasks via Policies below.

insert into storage.buckets (id, name, public) 
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public) 
values ('track-assets', 'track-assets', true)
on conflict (id) do nothing;

-- 8. ROW LEVEL SECURITY (RLS) & POLICIES
-- -----------------------------------------------------------------------------

-- Enable RLS on everything
alter table public.profiles enable row level security;
alter table public.user_stats enable row level security;
alter table public.badges enable row level security;
alter table public.user_badges enable row level security;
alter table public.tracks enable row level security;
alter table public.lessons enable row level security;
alter table public.questions enable row level security;
alter table public.user_progress enable row level security;
alter table public.daily_sprints enable row level security;

-- PROFILES
-- Public can view username/avatar. Only owner can update.
create policy "Profiles are viewable by everyone" on public.profiles for select using (true);
create policy "Users can update own profile" on public.profiles for update using (auth.uid() = id);

-- USER STATS (The "Deno Wall")
-- Users can VIEW their own stats, but NEVER insert/update directly.
create policy "Users view own stats" on public.user_stats for select using (auth.uid() = user_id);
-- No insert/update policies for public/authenticated roles = implicitly denied.

-- TRACKS / LESSONS / QUESTIONS
-- Readable by everyone. Writable only by ADMIN/MODERATOR.
create policy "Public read tracks" on public.tracks for select using (is_published = true or (select role from public.profiles where id = auth.uid()) in ('ADMIN', 'MODERATOR'));
create policy "Public read lessons" on public.lessons for select using (true);
create policy "Public read questions" on public.questions for select using (true);

-- ADMIN/MODERATOR Write Access Helper Logic
-- (For simplicity in pure SQL, we often just check the subquery or use service_role in a dashboard)
create policy "Admins manage tracks" on public.tracks for all using ((select role from public.profiles where id = auth.uid()) = 'ADMIN');

-- BADGES
create policy "Public read badges" on public.badges for select using (true);
create policy "Users view own badges" on public.user_badges for select using (auth.uid() = user_id);

-- USER PROGRESS
-- Users manage their own progress records.
create policy "Users manage own progress" on public.user_progress for all using (auth.uid() = user_id);

-- DAILY SPRINTS
-- Users can read their own sprints.
-- Updating completion status is allowed (or restricted to Edge Functions depending on strictness).
-- Let's allow read/update for owner.
create policy "Users manage own sprints" on public.daily_sprints for all using (auth.uid() = user_id);

-- STORAGE POLICIES
-- Avatars: Public read, User upload
create policy "Avatar Public Read" on storage.objects for select using (bucket_id = 'avatars');
create policy "Avatar User Upload" on storage.objects for insert with check (bucket_id = 'avatars' and auth.uid() = owner);
create policy "Avatar User Update" on storage.objects for update using (bucket_id = 'avatars' and auth.uid() = owner);

-- 9. TRIGGERS & AUTOMATION
-- -----------------------------------------------------------------------------

-- Auto-create Profile & Stats on Sign Up
create or replace function public.handle_new_user()
returns trigger as $$
begin
  -- 1. Create Profile
  insert into public.profiles (id, username, full_name, avatar_url, role)
  values (
    new.id, 
    coalesce(new.raw_user_meta_data->>'username', 'user_' || substr(new.id::text, 1, 8)),
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'avatar_url',
    'MEMBER'
  );
  
  -- 2. Create Empty Stats
  insert into public.user_stats (user_id)
  values (new.id);
  
  return new;
end;
$$ language plpgsql security definer;

-- Trigger definition
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Auto-update `updated_at` timestamps
create trigger handle_updated_at before update on public.profiles
  for each row execute procedure moddatetime (updated_at);

create trigger handle_updated_at before update on public.user_stats
  for each row execute procedure moddatetime (updated_at);

-- 10. SEED DATA (Optional Starter Data)
-- -----------------------------------------------------------------------------
-- insert into public.tracks (title, description, is_published, icon, color_gradient) values
-- ('React Mastery', 'Master the ecosystem.', true, 'atom', 'from-blue-500 to-cyan-500');

