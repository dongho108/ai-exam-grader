-- ============================================================
-- Migration: 20260217000000_create_exam_tables.sql
-- Creates exam_sessions and submissions tables with RLS,
-- indexes, updated_at triggers, and storage bucket setup.
-- ============================================================

-- ------------------------------------------------------------
-- 1. exam_sessions table
-- ------------------------------------------------------------
CREATE TABLE public.exam_sessions (
  id                      TEXT PRIMARY KEY,
  user_id                 UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title                   TEXT NOT NULL DEFAULT 'New Exam',
  status                  TEXT NOT NULL DEFAULT 'idle' CHECK (status IN ('idle', 'ready')),
  created_at              BIGINT NOT NULL,
  answer_key_file_name    TEXT,
  answer_key_file_size    INTEGER,
  answer_key_storage_path TEXT,
  answer_key_structure    JSONB,
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ------------------------------------------------------------
-- 2. submissions table
-- ------------------------------------------------------------
CREATE TABLE public.submissions (
  id               TEXT PRIMARY KEY,
  session_id       TEXT NOT NULL REFERENCES public.exam_sessions(id) ON DELETE CASCADE,
  user_id          UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  student_name     TEXT NOT NULL,
  file_name        TEXT NOT NULL,
  storage_path     TEXT,
  status           TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'graded')),
  score_correct    INTEGER,
  score_total      INTEGER,
  score_percentage DOUBLE PRECISION,
  results          JSONB,
  uploaded_at      BIGINT NOT NULL,
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ------------------------------------------------------------
-- 3. Indexes
-- ------------------------------------------------------------
CREATE INDEX idx_exam_sessions_user_id ON public.exam_sessions (user_id);
CREATE INDEX idx_submissions_session_id ON public.submissions (session_id);
CREATE INDEX idx_submissions_user_id ON public.submissions (user_id);

-- ------------------------------------------------------------
-- 4. updated_at trigger function + triggers
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_exam_sessions_updated_at
  BEFORE UPDATE ON public.exam_sessions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER trg_submissions_updated_at
  BEFORE UPDATE ON public.submissions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ------------------------------------------------------------
-- 5. Row Level Security
-- ------------------------------------------------------------

-- exam_sessions
ALTER TABLE public.exam_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "exam_sessions_select"
  ON public.exam_sessions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "exam_sessions_insert"
  ON public.exam_sessions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "exam_sessions_update"
  ON public.exam_sessions FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "exam_sessions_delete"
  ON public.exam_sessions FOR DELETE
  USING (auth.uid() = user_id);

-- submissions
ALTER TABLE public.submissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "submissions_select"
  ON public.submissions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "submissions_insert"
  ON public.submissions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "submissions_update"
  ON public.submissions FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "submissions_delete"
  ON public.submissions FOR DELETE
  USING (auth.uid() = user_id);

-- ------------------------------------------------------------
-- 6. Storage bucket
-- ------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public)
VALUES ('exam-files', 'exam-files', false);

-- ------------------------------------------------------------
-- 7. Storage RLS policies
-- Storage path convention: {user_id}/{session_id}/...
-- (storage.foldername(name))[1] extracts the first path segment
-- ------------------------------------------------------------
CREATE POLICY "Users can manage their own files"
  ON storage.objects FOR ALL
  USING (
    bucket_id = 'exam-files'
    AND auth.uid()::text = (storage.foldername(name))[1]
  )
  WITH CHECK (
    bucket_id = 'exam-files'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );
