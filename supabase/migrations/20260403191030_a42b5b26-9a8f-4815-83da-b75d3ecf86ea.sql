ALTER TABLE public.surgeries DROP CONSTRAINT IF EXISTS surgeries_created_by_fkey;
ALTER TABLE public.surgeries
ADD CONSTRAINT surgeries_created_by_fkey
FOREIGN KEY (created_by)
REFERENCES auth.users(id)
ON DELETE SET NULL;