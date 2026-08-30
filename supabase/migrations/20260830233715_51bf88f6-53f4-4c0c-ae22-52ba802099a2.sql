CREATE TABLE public.otps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id text NOT NULL,
  phone_number text,
  otp_code text NOT NULL,
  source text,
  read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.otps TO authenticated;
GRANT ALL ON public.otps TO service_role;

ALTER TABLE public.otps ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read OTPs"
  ON public.otps FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update OTPs"
  ON public.otps FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE INDEX idx_otps_created_at ON public.otps (created_at DESC);
CREATE INDEX idx_otps_session_id ON public.otps (session_id);

ALTER PUBLICATION supabase_realtime ADD TABLE public.otps;