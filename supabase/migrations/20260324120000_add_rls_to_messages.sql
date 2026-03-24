ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read" ON public.messages
  FOR SELECT
  USING (true);
