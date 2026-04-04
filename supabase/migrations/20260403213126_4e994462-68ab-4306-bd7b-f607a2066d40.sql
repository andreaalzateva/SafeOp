
-- Create clinics table
CREATE TABLE public.clinics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  nit text NOT NULL,
  address text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.clinics ENABLE ROW LEVEL SECURITY;

-- Add clinic_id and is_super_admin to profiles
ALTER TABLE public.profiles ADD COLUMN clinic_id uuid REFERENCES public.clinics(id) ON DELETE SET NULL;
ALTER TABLE public.profiles ADD COLUMN is_super_admin boolean NOT NULL DEFAULT false;

-- RLS policies for clinics
CREATE POLICY "Authenticated can read clinics" ON public.clinics FOR SELECT TO authenticated USING (true);

CREATE POLICY "Super admin can manage clinics" ON public.clinics FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_super_admin = true)
);
