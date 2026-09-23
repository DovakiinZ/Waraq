-- 103_submit_quiz_attempt.sql
--
-- Server-side quiz grading.
--
-- Until now both clients graded locally: they read `quiz_options.is_correct`,
-- compared it to the student's picks, and inserted the resulting score into
-- `quiz_attempts` themselves. That means a student could submit any score they
-- liked. This function makes the score authoritative — it is computed in the
-- database from `quiz_options`, and the client's arithmetic is never trusted.
--
-- Additive and reversible: it creates one function and grants execute. To undo,
-- DROP FUNCTION public.submit_quiz_attempt(uuid, jsonb).
--
-- HOW TO APPLY: paste this file into the Supabase SQL editor and run it.
-- Do NOT use `supabase db push` on this project — the migrations folder still
-- contains 100_clean_rewrite.sql, which drops the entire public schema.
--
-- p_answers shape: {"<question_id>": ["<option_id>", ...], ...}
-- Returns:        {"score_percent": 80, "passed": true, "correct": 4, "total": 5}

CREATE OR REPLACE FUNCTION public.submit_quiz_attempt(
    p_quiz_id uuid,
    p_answers jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_student_id    uuid := auth.uid();
    v_passing_score int;
    v_attempts_allowed int;
    v_used_attempts int;
    v_total         int;
    v_correct       int;
    v_score         numeric;
    v_passed        boolean;
BEGIN
    IF v_student_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    SELECT passing_score, attempts_allowed
      INTO v_passing_score, v_attempts_allowed
      FROM quizzes
     WHERE id = p_quiz_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Quiz not found';
    END IF;

    v_passing_score := COALESCE(v_passing_score, 60);

    -- Enforce the attempt limit server-side too; the clients only hide the button.
    IF v_attempts_allowed IS NOT NULL AND v_attempts_allowed > 0 THEN
        SELECT count(*) INTO v_used_attempts
          FROM quiz_attempts
         WHERE quiz_id = p_quiz_id
           AND student_id = v_student_id
           AND completed_at IS NOT NULL;

        IF v_used_attempts >= v_attempts_allowed THEN
            RAISE EXCEPTION 'No attempts remaining';
        END IF;
    END IF;

    SELECT count(*) INTO v_total
      FROM quiz_questions
     WHERE quiz_id = p_quiz_id;

    IF v_total = 0 THEN
        RAISE EXCEPTION 'Quiz has no questions';
    END IF;

    -- A question counts as correct only when the submitted option ids match the
    -- is_correct set exactly, which is also what makes multi_select work.
    SELECT count(*) INTO v_correct
      FROM quiz_questions q
     WHERE q.quiz_id = p_quiz_id
       AND (
            SELECT COALESCE(array_agg(o.id::text ORDER BY o.id::text), ARRAY[]::text[])
              FROM quiz_options o
             WHERE o.question_id = q.id
               AND o.is_correct
       ) = (
            SELECT COALESCE(array_agg(picked ORDER BY picked), ARRAY[]::text[])
              FROM jsonb_array_elements_text(
                     COALESCE(p_answers -> q.id::text, '[]'::jsonb)
                   ) AS picked
       );

    v_score  := round((v_correct::numeric / v_total::numeric) * 100);
    v_passed := v_score >= v_passing_score;

    INSERT INTO quiz_attempts (quiz_id, student_id, score_percent, answers, passed, completed_at)
    VALUES (p_quiz_id, v_student_id, v_score, p_answers, v_passed, now());

    -- Mirror the XP award the clients used to do, so passing still counts.
    IF v_passed THEN
        BEGIN
            INSERT INTO student_xp (student_id, reason, amount, entity_id)
            VALUES (v_student_id, 'quiz_pass', 100, p_quiz_id);
        EXCEPTION WHEN OTHERS THEN
            -- XP is not worth failing a submitted attempt over.
            NULL;
        END;
    END IF;

    RETURN jsonb_build_object(
        'score_percent', v_score,
        'passed', v_passed,
        'correct', v_correct,
        'total', v_total
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.submit_quiz_attempt(uuid, jsonb) TO authenticated;
