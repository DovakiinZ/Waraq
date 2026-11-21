/// The setup guide («ابدأ هنا») rules — data in, steps out.
///
/// Spec: docs/superpowers/specs/2026-11-21-setup-guide.md. The web twin is
/// `src/lib/setupProgress.ts`; the two must describe the same rules.
///
/// Pure Dart on purpose: no Flutter, no Supabase. The providers fetch the
/// minimum rows and hand them here, so every done-rule is unit-testable
/// (`test/models/setup_progress_test.dart`). Nothing about progress is
/// stored — a step is done because real data says so.
library;

enum SetupStepState { done, todo }

/// One step of the guide.
class SetupStep {
  /// Stable key from the spec (`profile`, `course`, `lesson`, `publish`,
  /// `choose`, `start`, `finish`).
  final String key;
  final SetupStepState state;

  /// In-progress sub-count, e.g. the profile step's "1 of 2". Null when the
  /// step has no sub-parts.
  final int? subDone;
  final int? subTotal;

  /// The count shown in a done summary («موادك: N»). Null when the step's
  /// summary is not a count.
  final int? count;

  /// Student step 1 only: the only evidence is an order still waiting for the
  /// teacher to confirm payment.
  final bool waitingForTeacher;

  /// Teacher publish step only: the account is pending and nothing is
  /// published yet, so the step explains why instead of offering a button.
  /// The guide never shows a disabled button.
  final bool blocked;

  const SetupStep({
    required this.key,
    required this.state,
    this.subDone,
    this.subTotal,
    this.count,
    this.waitingForTeacher = false,
    this.blocked = false,
  });

  bool get isDone => state == SetupStepState.done;

  /// The one-line summary a closed step shows: the result if done, the
  /// sub-count if in progress, otherwise null (nothing). `(ar, en)`.
  ///
  /// Counts are label-first so Arabic never needs plural agreement.
  (String, String)? get summary {
    switch (key) {
      case 'profile':
        if (subDone == null || subTotal == null) return null;
        if (!isDone && subDone == 0) return null;
        return (
          'النبذة وحساب شام كاش: $subDone من $subTotal',
          'Bio and Sham Cash: $subDone of $subTotal',
        );
      case 'course':
        return isDone ? ('موادك: $count', 'Your courses: $count') : null;
      case 'lesson':
        return isDone ? ('دروس فيها محتوى: $count', 'Lessons with content: $count') : null;
      case 'publish':
        return isDone ? ('منشورة في المتجر: $count', 'Live in the marketplace: $count') : null;
      case 'choose':
        if (!isDone) return null;
        return waitingForTeacher
            ? ('بانتظار تأكيد المعلّم للدفع', 'Waiting for the teacher to confirm payment')
            : ('تم', 'Done');
      case 'start':
        return isDone ? ('تم', 'Done') : null;
      case 'finish':
        return isDone ? ('دروس مكتملة: $count', 'Lessons completed: $count') : null;
    }
    return null;
  }
}

/// A role's whole guide.
class SetupProgress {
  final List<SetupStep> steps;
  const SetupProgress(this.steps);

  int get total => steps.length;
  int get completedCount => steps.where((s) => s.isDone).length;
  bool get allComplete => steps.isNotEmpty && completedCount == total;

  /// The first step that is not done (`current`), or null when complete.
  SetupStep? get nextStep {
    for (final s in steps) {
      if (!s.isDone) return s;
    }
    return null;
  }

  /// `N` in «الخطوة N من M»: `min(done + 1, M)`.
  int get counter {
    final n = completedCount + 1;
    return n > total ? total : n;
  }
}

// ── Teacher ────────────────────────────────────────────────────────────────

class TeacherSubjectFact {
  final String id;
  final bool isActive;
  const TeacherSubjectFact({required this.id, required this.isActive});
}

class TeacherLessonFact {
  final String id;
  final String subjectId;
  final bool isPublished;
  const TeacherLessonFact({required this.id, required this.subjectId, required this.isPublished});
}

class TeacherSetupInput {
  final String? bioAr;
  final String? shamcashAccountName;
  final String? shamcashAccountNumber;

  /// `profiles.is_active`. False = pending review: may build, may not publish.
  final bool isActive;

  /// The teacher's own subjects (`subjects.teacher_id = me`).
  final List<TeacherSubjectFact> subjects;

  /// Lessons in those subjects.
  final List<TeacherLessonFact> lessons;

  /// Lesson ids that have at least one `lesson_blocks` row.
  final Set<String> lessonIdsWithBlocks;

  const TeacherSetupInput({
    this.bioAr,
    this.shamcashAccountName,
    this.shamcashAccountNumber,
    required this.isActive,
    this.subjects = const [],
    this.lessons = const [],
    this.lessonIdsWithBlocks = const {},
  });

  bool get isPending => !isActive;
}

bool _filled(String? s) => s != null && s.trim().isNotEmpty;

SetupProgress teacherSetup(TeacherSetupInput i) {
  // 1. Profile: bio AND both Sham Cash fields. Sub-count of 2.
  final bioDone = _filled(i.bioAr);
  final shamDone = _filled(i.shamcashAccountName) && _filled(i.shamcashAccountNumber);
  final profileSub = (bioDone ? 1 : 0) + (shamDone ? 1 : 0);

  // 2. Course: at least one subject of mine.
  final subjectIds = {for (final s in i.subjects) s.id};
  final courseCount = subjectIds.length;

  // 3. Lesson: a lesson in one of my subjects with at least one block.
  final myLessons = i.lessons.where((l) => subjectIds.contains(l.subjectId)).toList();
  final lessonsWithContent =
      myLessons.where((l) => i.lessonIdsWithBlocks.contains(l.id)).length;

  // 4. Publish: an is_active subject of mine with a published lesson.
  final subjectsWithPublished = {
    for (final l in myLessons)
      if (l.isPublished) l.subjectId,
  };
  final liveCount =
      i.subjects.where((s) => s.isActive && subjectsWithPublished.contains(s.id)).length;
  final publishDone = liveCount > 0;

  return SetupProgress([
    SetupStep(
      key: 'profile',
      state: profileSub == 2 ? SetupStepState.done : SetupStepState.todo,
      subDone: profileSub,
      subTotal: 2,
    ),
    SetupStep(
      key: 'course',
      state: courseCount > 0 ? SetupStepState.done : SetupStepState.todo,
      count: courseCount,
    ),
    SetupStep(
      key: 'lesson',
      state: lessonsWithContent > 0 ? SetupStepState.done : SetupStepState.todo,
      count: lessonsWithContent,
    ),
    SetupStep(
      key: 'publish',
      state: publishDone ? SetupStepState.done : SetupStepState.todo,
      count: liveCount,
      blocked: i.isPending && !publishDone,
    ),
  ]);
}

// ── Student ────────────────────────────────────────────────────────────────

class StudentProgressFact {
  final String lessonId;
  final bool completed;

  /// `lesson_progress.updated_at`, ISO-8601. Used to find the lesson to resume.
  final String? updatedAt;

  const StudentProgressFact({required this.lessonId, this.completed = false, this.updatedAt});
}

class StudentSetupInput {
  /// `orders.status` of every order of mine.
  final List<String> orderStatuses;

  /// Number of `student_subjects` rows of mine.
  final int enrollmentCount;

  /// My `lesson_progress` rows.
  final List<StudentProgressFact> progress;

  const StudentSetupInput({
    this.orderStatuses = const [],
    this.enrollmentCount = 0,
    this.progress = const [],
  });
}

const _deadOrderStatuses = {'rejected', 'cancelled'};

SetupProgress studentSetup(StudentSetupInput i) {
  final liveOrders = i.orderStatuses.where((s) => !_deadOrderStatuses.contains(s)).toList();
  final hasProgress = i.progress.isNotEmpty;
  final hasEnrollment = i.enrollmentCount > 0;

  // 1. Choose: any live order, enrolment or progress.
  final chooseDone = liveOrders.isNotEmpty || hasEnrollment || hasProgress;
  // Waiting only when a pending_payment order is the ONLY evidence.
  final waiting = chooseDone &&
      !hasEnrollment &&
      !hasProgress &&
      liveOrders.every((s) => s == 'pending_payment');

  // 3. Finish: completed_at set on any progress row.
  final completed = i.progress.where((p) => p.completed).length;

  return SetupProgress([
    SetupStep(
      key: 'choose',
      state: chooseDone ? SetupStepState.done : SetupStepState.todo,
      waitingForTeacher: waiting,
    ),
    SetupStep(
      key: 'start',
      state: hasProgress ? SetupStepState.done : SetupStepState.todo,
    ),
    SetupStep(
      key: 'finish',
      state: completed > 0 ? SetupStepState.done : SetupStepState.todo,
      count: completed,
    ),
  ]);
}

/// The most recently touched lesson, for «تابع التعلّم». Null when there is
/// no progress at all. Rows with an unparseable timestamp lose to any row
/// with a real one.
String? latestLessonId(List<StudentProgressFact> progress) {
  String? best;
  DateTime? bestAt;
  for (final p in progress) {
    final at = p.updatedAt == null ? null : DateTime.tryParse(p.updatedAt!);
    if (best == null) {
      best = p.lessonId;
      bestAt = at;
      continue;
    }
    if (at != null && (bestAt == null || at.isAfter(bestAt))) {
      best = p.lessonId;
      bestAt = at;
    }
  }
  return best;
}

// ── Copy ───────────────────────────────────────────────────────────────────

/// Title and "why" for a step, `(ar, en)` each. Kept beside the rules so the
/// guide page and the dashboard card describe a step from one source.
class SetupStepCopy {
  final (String, String) title;
  final (String, String) why;
  final (String, String) button;
  const SetupStepCopy({required this.title, required this.why, required this.button});
}

const setupCopy = <String, SetupStepCopy>{
  'profile': SetupStepCopy(
    title: ('جهّز ملفك للطلاب', 'Get your profile ready for students'),
    why: (
      'الطلاب يقرؤون نبذتك قبل الشراء، ويدفعون لك على حساب شام كاش.',
      'Students read your bio before buying, and pay you through your Sham Cash account.',
    ),
    button: ('افتح ملفي الشخصي', 'Open my profile'),
  ),
  'course': SetupStepCopy(
    title: ('أنشئ مادتك الأولى', 'Create your first course'),
    why: (
      'الطالب يشتري مادة، والدروس بداخلها. ابدأ بالعنوان والمرحلة والسعر.',
      'Students buy a course; lessons live inside it. Start with a title, stage and price.',
    ),
    button: ('أنشئ مادة', 'Create a course'),
  ),
  'lesson': SetupStepCopy(
    title: ('اكتب أول درس', 'Write your first lesson'),
    why: (
      'الصق درساً كتبته من قبل أو اكتبه مباشرة، ويمكنك نشره لاحقاً.',
      'Paste a lesson you already wrote or type it in; you can publish it later.',
    ),
    button: ('اكتب درساً', 'Write a lesson'),
  ),
  'publish': SetupStepCopy(
    title: ('انشر مادتك للطلاب', 'Publish your course'),
    why: (
      'تظهر المادة في المتجر عندما تكون منشورة وفيها درس منشور واحد على الأقل.',
      'A course appears in the marketplace once it is published and has at least one published lesson.',
    ),
    button: ('افتح موادي', 'Open my courses'),
  ),
  'choose': SetupStepCopy(
    title: ('اختر مادتك الأولى', 'Pick your first course'),
    why: (
      'تصفّح مواد مرحلتك. المجانية تبدأ فوراً، والمدفوعة تدفع ثمنها للمعلّم عبر شام كاش.',
      'Browse your stage\'s courses. Free ones start right away; for paid ones you pay the teacher through Sham Cash.',
    ),
    button: ('افتح المتجر', 'Open the marketplace'),
  ),
  'start': SetupStepCopy(
    title: ('افتح أول درس', 'Open your first lesson'),
    why: (
      'ابدأ بالدرس الأول، أو جرّب درس «معاينة مجانية» قبل الشراء.',
      'Start with the first lesson, or try a "Free preview" lesson before buying.',
    ),
    button: ('اذهب إلى موادي', 'Go to my courses'),
  ),
  'finish': SetupStepCopy(
    title: ('أكمل درساً حتى النهاية', 'Finish a lesson'),
    why: (
      'اقرأ الدرس حتى آخره واضغط «إكمال الدرس»، فيُحسب تقدّمك وتقترب من الشهادة.',
      'Read to the end and press "Complete lesson"; your progress counts toward the certificate.',
    ),
    button: ('تابع التعلّم', 'Continue learning'),
  ),
};

/// Shown instead of a button on the teacher publish step while pending.
const setupPublishBlocked = (
  'يُفتح النشر بعد موافقة الإدارة على حسابك.',
  'Publishing opens once an admin approves your account.',
);
