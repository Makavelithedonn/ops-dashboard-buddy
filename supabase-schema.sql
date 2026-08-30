-- =====================================================================
-- Insurance Ops Dashboard — full schema for a fresh Supabase project
-- Run this once in Supabase SQL Editor.
-- =====================================================================

-- 1. ROLES ------------------------------------------------------------
DO $$ BEGIN
  CREATE TYPE public.app_role AS ENUM ('admin', 'user');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.user_roles (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role       public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL    ON public.user_roles TO service_role;

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read their own roles" ON public.user_roles;
CREATE POLICY "Users can read their own roles"
  ON public.user_roles FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- Security-definer role check (avoids RLS recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Auto-grant admin to your email on signup
CREATE OR REPLACE FUNCTION public.bootstrap_first_admin()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF lower(NEW.email) = 'jacobyousef771@gmail.com' THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'admin')
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS on_auth_user_created_bootstrap_admin ON auth.users;
CREATE TRIGGER on_auth_user_created_bootstrap_admin
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.bootstrap_first_admin();


-- 2. TRACKED SESSIONS (the live funnel table) -------------------------
CREATE TABLE IF NOT EXISTS public.tracked_sessions (
  session_id        text PRIMARY KEY,

  -- customer identity
  national_id       text,
  phone             text,
  country           text,
  ip_address        text,

  -- vehicle
  serial_number     text,
  vehicle_make      text,
  vehicle_model     text,
  model_year        integer,
  declared_value    numeric,

  -- insurer selection
  insurer_company   text,
  insurer_offer_sar numeric,

  -- funnel state
  current_page      text NOT NULL DEFAULT 'quote_landing',
  state             text NOT NULL DEFAULT 'live',
  submission        jsonb NOT NULL DEFAULT '{}'::jsonb,

  -- admin gate
  awaiting_approval boolean NOT NULL DEFAULT false,
  requested_page    text,
  admin_directive   text,
  directive_nonce   text,
  directive_at      timestamptz,

  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, UPDATE, DELETE ON public.tracked_sessions TO authenticated;
GRANT ALL ON public.tracked_sessions TO service_role;

ALTER TABLE public.tracked_sessions ENABLE ROW LEVEL SECURITY;

-- Only admins can read/write from the browser.
-- The public site writes via the server API using the service role key.
DROP POLICY IF EXISTS "admins can read sessions"   ON public.tracked_sessions;
DROP POLICY IF EXISTS "admins can update sessions" ON public.tracked_sessions;
DROP POLICY IF EXISTS "admins can delete sessions" ON public.tracked_sessions;

CREATE POLICY "admins can read sessions"
  ON public.tracked_sessions FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "admins can update sessions"
  ON public.tracked_sessions FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "admins can delete sessions"
  ON public.tracked_sessions FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.tracked_sessions_touch_updated_at()
RETURNS trigger
LANGUAGE plpgsql SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_tracked_sessions_touch ON public.tracked_sessions;
CREATE TRIGGER trg_tracked_sessions_touch
  BEFORE UPDATE ON public.tracked_sessions
  FOR EACH ROW EXECUTE FUNCTION public.tracked_sessions_touch_updated_at();

-- helpful indexes for the dashboard queries
CREATE INDEX IF NOT EXISTS idx_tracked_sessions_updated_at
  ON public.tracked_sessions (updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_tracked_sessions_state
  ON public.tracked_sessions (state);
CREATE INDEX IF NOT EXISTS idx_tracked_sessions_awaiting
  ON public.tracked_sessions (awaiting_approval) WHERE awaiting_approval;

-- =====================================================================
-- Done. Next: create your admin user in Authentication → Users
-- with email jacobyousef771@gmail.com (the trigger grants admin).
-- =====================================================================
