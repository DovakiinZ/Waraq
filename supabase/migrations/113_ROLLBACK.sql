-- Reverses 113_teacher_publish_gate.sql.
drop trigger if exists trg_teacher_publish_gate on public.subjects;
drop function if exists public.enforce_teacher_publish_gate();
