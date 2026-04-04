
ALTER TABLE public.surgeries ADD COLUMN clinic_id uuid REFERENCES public.clinics(id) ON DELETE SET NULL;
