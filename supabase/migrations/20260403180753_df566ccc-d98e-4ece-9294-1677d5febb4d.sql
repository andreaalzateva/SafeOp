
-- Enum for surgery status
CREATE TYPE public.surgery_status AS ENUM ('programada', 'sign-in', 'time-out', 'sign-out', 'completada');

-- Enum for user roles
CREATE TYPE public.app_role AS ENUM ('coordinador', 'encargado', 'consulta');

-- Profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- User roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  UNIQUE (user_id, role)
);

-- Surgeries table
CREATE TABLE public.surgeries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient TEXT NOT NULL,
  procedure_name TEXT NOT NULL,
  room TEXT NOT NULL,
  date DATE NOT NULL,
  time TIME NOT NULL,
  status surgery_status NOT NULL DEFAULT 'programada',
  surgeon TEXT NOT NULL,
  anesthesiologist TEXT NOT NULL,
  checklist_owner TEXT NOT NULL,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Checklist phases (sign-in, time-out, sign-out)
CREATE TABLE public.checklist_phases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  surgery_id UUID REFERENCES public.surgeries(id) ON DELETE CASCADE NOT NULL,
  phase TEXT NOT NULL CHECK (phase IN ('sign-in', 'time-out', 'sign-out')),
  completed_at TIMESTAMPTZ,
  completed_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (surgery_id, phase)
);

-- Checklist answers
CREATE TABLE public.checklist_answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phase_id UUID REFERENCES public.checklist_phases(id) ON DELETE CASCADE NOT NULL,
  question_id TEXT NOT NULL,
  question_text TEXT NOT NULL,
  answer TEXT CHECK (answer IN ('si', 'no')),
  answered_by TEXT,
  answered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Instruments count
CREATE TABLE public.instruments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  surgery_id UUID REFERENCES public.surgeries(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  initial_count INT NOT NULL DEFAULT 0,
  final_count INT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Checklist signatures
CREATE TABLE public.checklist_signatures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  surgery_id UUID REFERENCES public.surgeries(id) ON DELETE CASCADE NOT NULL UNIQUE,
  signer_name TEXT NOT NULL,
  signer_role TEXT NOT NULL,
  start_time TEXT NOT NULL,
  end_time TEXT NOT NULL,
  accepted BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.surgeries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.checklist_phases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.checklist_answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.instruments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.checklist_signatures ENABLE ROW LEVEL SECURITY;

-- Security definer function for role checks
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

-- Profiles: users can read all profiles, update own
CREATE POLICY "Anyone authenticated can read profiles" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

-- User roles: authenticated can read
CREATE POLICY "Authenticated can read roles" ON public.user_roles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Coordinadores can manage roles" ON public.user_roles FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'coordinador'));

-- Surgeries: all authenticated can read, coordinador/encargado can insert/update
CREATE POLICY "Authenticated can read surgeries" ON public.surgeries FOR SELECT TO authenticated USING (true);
CREATE POLICY "Coordinador can manage surgeries" ON public.surgeries FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'coordinador'));
CREATE POLICY "Encargado can insert surgeries" ON public.surgeries FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'encargado'));
CREATE POLICY "Encargado can update surgeries" ON public.surgeries FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'encargado'));

-- Checklist phases, answers, instruments, signatures: authenticated can read, encargado/coordinador can write
CREATE POLICY "Authenticated can read phases" ON public.checklist_phases FOR SELECT TO authenticated USING (true);
CREATE POLICY "Encargado/Coord can manage phases" ON public.checklist_phases FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'encargado') OR public.has_role(auth.uid(), 'coordinador'));

CREATE POLICY "Authenticated can read answers" ON public.checklist_answers FOR SELECT TO authenticated USING (true);
CREATE POLICY "Encargado/Coord can manage answers" ON public.checklist_answers FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'encargado') OR public.has_role(auth.uid(), 'coordinador'));

CREATE POLICY "Authenticated can read instruments" ON public.instruments FOR SELECT TO authenticated USING (true);
CREATE POLICY "Encargado/Coord can manage instruments" ON public.instruments FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'encargado') OR public.has_role(auth.uid(), 'coordinador'));

CREATE POLICY "Authenticated can read signatures" ON public.checklist_signatures FOR SELECT TO authenticated USING (true);
CREATE POLICY "Encargado/Coord can manage signatures" ON public.checklist_signatures FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'encargado') OR public.has_role(auth.uid(), 'coordinador'));

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, name, email)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'name', NEW.email), NEW.email);
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
