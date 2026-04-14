-- ============================================================
-- Migration: 20260415000000_add_deleted_at.sql
-- Adds deleted_at column to exam_sessions for soft-delete.
-- Session history deletion sets deleted_at instead of
-- hard-deleting, preserving all data (sessions, submissions,
-- answer keys, storage files).
-- ============================================================

ALTER TABLE public.exam_sessions
  ADD COLUMN deleted_at TIMESTAMPTZ DEFAULT NULL;

-- Replace the existing active-sessions index to also exclude soft-deleted rows
DROP INDEX IF EXISTS idx_exam_sessions_active;

CREATE INDEX idx_exam_sessions_active
  ON public.exam_sessions (user_id)
  WHERE archived_at IS NULL AND deleted_at IS NULL;

-- Partial index for archived (but not deleted) sessions (session history query)
CREATE INDEX idx_exam_sessions_archived
  ON public.exam_sessions (user_id, archived_at DESC)
  WHERE archived_at IS NOT NULL AND deleted_at IS NULL;
