import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import 'package:ayman_academy_app/brand/widgets/arcade.dart';
import 'package:ayman_academy_app/core/router/routes.dart';
import 'package:ayman_academy_app/features/auth/providers/auth_provider.dart';
import 'package:ayman_academy_app/features/setup/providers/setup_providers.dart';
import 'package:ayman_academy_app/features/setup/widgets/setup_widgets.dart';
import 'package:ayman_academy_app/features/teacher/lessons/screens/lesson_editor_screen.dart';
import 'package:ayman_academy_app/shared/providers/language_provider.dart';
import 'package:ayman_academy_app/shared/services/setup_progress.dart';
import 'package:ayman_academy_app/shared/student_stages.dart';

/// The setup guide («ابدأ هنا») — `/teacher/start` and `/student/start`.
///
/// A checklist, not a wizard: each step's work happens on the normal screen
/// for it, and the guide has one button that goes there. Done-ness comes from
/// real data (`shared/services/setup_progress.dart`); nothing is stored.
/// Spec: docs/superpowers/specs/2026-11-21-setup-guide.md.
class SetupGuideScreen extends ConsumerStatefulWidget {
  final SetupRole role;
  const SetupGuideScreen({super.key, required this.role});

  @override
  ConsumerState<SetupGuideScreen> createState() => _SetupGuideScreenState();
}

/// The two roles' data, flattened to what the view needs.
class _GuideData {
  final SetupProgress progress;
  final bool isPending;
  final String? latestSubjectId;
  final String? resumePath;
  const _GuideData(this.progress, {this.isPending = false, this.latestSubjectId, this.resumePath});
}

class _SetupGuideScreenState extends ConsumerState<SetupGuideScreen> {
  /// The one open step. Null = all closed.
  String? _openKey;

  /// The current step opens by itself exactly once, on first data. A refetch
  /// never re-opens or moves anything.
  bool _autoOpened = false;

  bool get _isTeacher => widget.role == SetupRole.teacher;

  void _refresh() {
    if (_isTeacher) {
      ref.invalidate(teacherSetupProvider);
    } else {
      ref.invalidate(studentSetupProvider);
    }
  }

  Future<void> _push(String location) async {
    await context.push(location);
    if (mounted) _refresh();
  }

  void _leave() {
    if (Navigator.of(context).canPop()) {
      Navigator.of(context).pop();
    } else {
      context.go(_isTeacher ? Routes.teacherHome : Routes.studentHome);
    }
  }

  Future<void> _onStep(SetupStep step, _GuideData data) async {
    switch (step.key) {
      case 'profile':
        return _push(Routes.teacherProfile);
      case 'course':
      case 'publish':
        return _push(Routes.teacherSubjects);
      case 'lesson':
        final subjectId = data.latestSubjectId;
        // The new-lesson screen is not a go_router route — it is pushed with
        // its subject, exactly as TeacherLessonsScreen does. Without a subject
        // there is nowhere to put a lesson, so go to the course list.
        if (subjectId == null) return _push(Routes.teacherSubjects);
        await Navigator.of(context).push(MaterialPageRoute(
          builder: (_) => LessonEditorScreen(subjectId: subjectId),
        ));
        if (mounted) _refresh();
        return;
      case 'choose':
        return _push(Routes.marketplace);
      case 'start':
        return _push(Routes.mySubjects);
      case 'finish':
        return _push(data.resumePath ?? Routes.mySubjects);
    }
  }

  @override
  Widget build(BuildContext context) {
    final lang = ref.watch(languageProvider);
    final t = ref.read(languageProvider.notifier).t;
    final arc = context.arc;

    final AsyncValue<_GuideData> snapshot = _isTeacher
        ? ref.watch(teacherSetupProvider).whenData(
              (d) => _GuideData(d.progress, isPending: d.isPending, latestSubjectId: d.latestSubjectId))
        : ref.watch(studentSetupProvider).whenData((d) => _GuideData(d.progress, resumePath: d.resumePath));

    final data = snapshot.valueOrNull;
    if (data != null && !_autoOpened) {
      _autoOpened = true;
      _openKey = data.progress.nextStep?.key;
    }

    Widget body;
    if (data != null && !snapshot.hasError) {
      body = _buildGuide(data, t, arc);
    } else if (snapshot.hasError) {
      body = ListView(
        physics: const AlwaysScrollableScrollPhysics(),
        children: [
          ArcadeEmpty(
            key: const Key('setup_error'),
            icon: Icons.cloud_off_rounded,
            title: t('تعذّر تحميل خطوات الإعداد', 'Could not load your setup steps'),
            subtitle: t('تحقّق من اتصالك ثم أعد المحاولة.', 'Check your connection and try again.'),
            action: ArcadeButton(
              key: const Key('setup_retry'),
              onPressed: _refresh,
              label: t('أعد المحاولة', 'Try again'),
            ),
          ),
        ],
      );
    } else {
      body = const _GuideSkeleton();
    }

    return Directionality(
      textDirection: lang.languageCode == 'ar' ? TextDirection.rtl : TextDirection.ltr,
      child: Scaffold(
        appBar: AppBar(
          leading: IconButton(
            icon: const Icon(Icons.close_rounded),
            tooltip: t('إغلاق', 'Close'),
            onPressed: _leave,
          ),
          title: Text(t('ابدأ هنا', 'Start here')),
        ),
        body: RefreshIndicator(
          color: arc.mid,
          onRefresh: () async => _refresh(),
          child: body,
        ),
      ),
    );
  }

  Widget _buildGuide(_GuideData data, String Function(String, String) t, Arc arc) {
    final progress = data.progress;
    return ListView(
      physics: const AlwaysScrollableScrollPhysics(),
      padding: const EdgeInsets.fromLTRB(16, 12, 16, 32),
      children: [
        _Hero(progress: progress, isTeacher: _isTeacher, t: t),
        const SizedBox(height: 16),
        _prerequisite(data, t, arc),
        const SizedBox(height: 16),
        if (progress.allComplete)
          _DoneCard(
            isTeacher: _isTeacher,
            t: t,
            onPrimary: () => context.go(_isTeacher ? Routes.teacherHome : Routes.mySubjects),
            onSecondary: () => _push(_isTeacher ? Routes.teacherOrders : Routes.marketplace),
          )
        else
          for (var i = 0; i < progress.steps.length; i++) ...[
            if (i > 0) const SizedBox(height: 10),
            _StepTile(
              index: i,
              step: progress.steps[i],
              isCurrent: identical(progress.steps[i], progress.nextStep),
              open: _openKey == progress.steps[i].key,
              t: t,
              onToggle: () => setState(() {
                final key = progress.steps[i].key;
                _openKey = _openKey == key ? null : key;
              }),
              onAction: () => _onStep(progress.steps[i], data),
            ),
          ],
        const SizedBox(height: 20),
        Text(
          t('يمكنك المغادرة والعودة في أي وقت؛ تقدّمك محفوظ.',
              'You can leave and come back any time; your progress is saved.'),
          textAlign: TextAlign.center,
          style: TextStyle(fontSize: 13, color: arc.inkSoft, height: 1.5),
        ),
      ],
    );
  }

  Widget _prerequisite(_GuideData data, String Function(String, String) t, Arc arc) {
    final style = TextStyle(fontSize: 13.5, fontWeight: FontWeight.w600, color: arc.ink, height: 1.5);

    if (_isTeacher) {
      return ArcadeCard(
        key: const Key('setup_prerequisite'),
        flat: true,
        fill: arc.wash,
        padding: const EdgeInsets.all(12),
        child: Row(
          children: [
            Icon(data.isPending ? Icons.hourglass_top_rounded : Icons.verified_rounded, size: 20, color: arc.mid),
            const SizedBox(width: 10),
            Expanded(
              child: Text(
                data.isPending
                    ? t('حسابك قيد المراجعة — ابنِ موادك الآن، والنشر يُفتح بعد الموافقة.',
                        "Your account is under review — build now; publishing opens once you're approved.")
                    : t('حسابك معتمد.', 'Your account is approved.'),
                style: style,
              ),
            ),
          ],
        ),
      );
    }

    final stageKey = ref.watch(authProvider).profile?.studentStage;
    String? stageLabel;
    for (final s in kStages) {
      if (s.key == stageKey) stageLabel = t(s.ar, s.en);
    }
    return ArcadeCard(
      key: const Key('setup_prerequisite'),
      flat: true,
      fill: arc.wash,
      padding: const EdgeInsetsDirectional.fromSTEB(12, 4, 4, 4),
      child: Row(
        children: [
          Icon(Icons.school_rounded, size: 20, color: arc.mid),
          const SizedBox(width: 10),
          Expanded(
            child: Text(
              t('مرحلتك: ${stageLabel ?? stageKey ?? '—'}', 'Your stage: ${stageLabel ?? stageKey ?? '—'}'),
              style: style,
            ),
          ),
          TextButton(
            key: const Key('setup_change_stage'),
            onPressed: () => _push(Routes.studentProfile),
            child: Text(t('تغيير', 'Change'), style: TextStyle(color: arc.mid, fontWeight: FontWeight.w700)),
          ),
        ],
      ),
    );
  }
}

class _Hero extends StatelessWidget {
  final SetupProgress progress;
  final bool isTeacher;
  final String Function(String, String) t;
  const _Hero({required this.progress, required this.isTeacher, required this.t});

  @override
  Widget build(BuildContext context) {
    final arc = context.arc;
    return Container(
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        gradient: arc.gradient,
        border: Border.all(color: arc.line, width: Arc.borderWidth),
        boxShadow: arc.hard(Arc.cardRest),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            t('أهلاً بك في ورق', 'Welcome to Waraq'),
            style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: arc.onInkMuted),
          ),
          const SizedBox(height: 10),
          ArcadeChip(
            key: const Key('setup_counter'),
            filled: true,
            label: t('الخطوة ${progress.counter} من ${progress.total}',
                'Step ${progress.counter} of ${progress.total}'),
          ),
          const SizedBox(height: 10),
          Text(
            t('ابدأ هنا', 'Start here'),
            style: TextStyle(fontSize: 28, fontWeight: FontWeight.w700, color: arc.onInk, height: 1.25),
          ),
          const SizedBox(height: 8),
          Text(
            isTeacher
                ? t('أربع خطوات، نحو 15 دقيقة. بعدها تظهر مادتك في المتجر ويستطيع الطلاب شراءها.',
                    'Four steps, about 15 minutes. After that your course is in the marketplace and students can buy it.')
                : t('ثلاث خطوات قصيرة: اختر مادة، افتح درساً، وأكمله.',
                    'Three short steps: pick a course, open a lesson, and finish it.'),
            style: TextStyle(fontSize: 14, color: arc.onInkMuted, height: 1.6),
          ),
          const SizedBox(height: 16),
          SetupRouteBar(progress: progress, onDark: true),
        ],
      ),
    );
  }
}

class _StepTile extends StatelessWidget {
  final int index;
  final SetupStep step;
  final bool isCurrent;
  final bool open;
  final String Function(String, String) t;
  final VoidCallback onToggle;
  final VoidCallback onAction;

  const _StepTile({
    required this.index,
    required this.step,
    required this.isCurrent,
    required this.open,
    required this.t,
    required this.onToggle,
    required this.onAction,
  });

  @override
  Widget build(BuildContext context) {
    final arc = context.arc;
    final copy = setupCopy[step.key]!;
    final summary = step.summary;
    final title = t(copy.title.$1, copy.title.$2);
    final stateLabel = step.isDone ? t('مكتملة', 'Done') : t('لم تكتمل', 'Not done');

    return ArcadeCard(
      key: Key('setup_step_${step.key}'),
      flat: !open,
      padding: EdgeInsets.zero,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Semantics(
            button: true,
            expanded: open,
            label: '$title, $stateLabel',
            excludeSemantics: true,
            child: GestureDetector(
              key: Key('setup_step_header_${step.key}'),
              behavior: HitTestBehavior.opaque,
              onTap: onToggle,
              child: Padding(
                padding: const EdgeInsets.all(12),
                child: Row(
                  children: [
                    Container(
                      width: 32,
                      height: 32,
                      alignment: Alignment.center,
                      decoration: BoxDecoration(
                        color: step.isDone ? arc.accent : (isCurrent ? arc.wash : arc.surface),
                        border: Border.all(color: arc.line, width: Arc.borderWidth),
                      ),
                      child: step.isDone
                          ? Icon(Icons.check_rounded, size: 18, color: arc.onAccent)
                          : Text(
                              '${index + 1}',
                              style: TextStyle(
                                fontSize: 14,
                                fontWeight: FontWeight.w700,
                                color: isCurrent ? arc.ink : arc.inkSoft,
                              ),
                            ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            title,
                            style: TextStyle(
                              fontSize: 15,
                              fontWeight: FontWeight.w700,
                              color: step.isDone && !open ? arc.inkSoft : arc.ink,
                              height: 1.4,
                            ),
                          ),
                          if (!open && summary != null) ...[
                            const SizedBox(height: 2),
                            Text(
                              t(summary.$1, summary.$2),
                              key: Key('setup_summary_${step.key}'),
                              style: TextStyle(fontSize: 12.5, color: arc.mid, fontWeight: FontWeight.w600),
                            ),
                          ],
                        ],
                      ),
                    ),
                    const SizedBox(width: 8),
                    Icon(open ? Icons.expand_less_rounded : Icons.expand_more_rounded, color: arc.inkSoft),
                  ],
                ),
              ),
            ),
          ),
          if (open)
            Padding(
              padding: const EdgeInsets.fromLTRB(12, 0, 12, 14),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Text(
                    t(copy.why.$1, copy.why.$2),
                    style: TextStyle(fontSize: 14, color: arc.inkSoft, height: 1.6),
                  ),
                  const SizedBox(height: 14),
                  // Never a disabled button: a step that cannot be done yet
                  // says why instead.
                  if (step.blocked)
                    Container(
                      key: const Key('setup_publish_blocked'),
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: arc.wash,
                        border: Border.all(color: arc.line, width: Arc.borderWidth),
                      ),
                      child: Row(
                        children: [
                          Icon(Icons.lock_clock_rounded, size: 20, color: arc.mid),
                          const SizedBox(width: 10),
                          Expanded(
                            child: Text(
                              t(setupPublishBlocked.$1, setupPublishBlocked.$2),
                              style: TextStyle(
                                  fontSize: 13.5, fontWeight: FontWeight.w600, color: arc.ink, height: 1.5),
                            ),
                          ),
                        ],
                      ),
                    )
                  else
                    ArcadeButton.nav(
                      key: Key('setup_action_${step.key}'),
                      onPressed: onAction,
                      variant: step.isDone ? ArcadeVariant.outline : ArcadeVariant.solid,
                      expand: true,
                      label: t(copy.button.$1, copy.button.$2),
                    ),
                ],
              ),
            ),
        ],
      ),
    );
  }
}

class _DoneCard extends StatelessWidget {
  final bool isTeacher;
  final String Function(String, String) t;
  final VoidCallback onPrimary;
  final VoidCallback onSecondary;

  const _DoneCard({
    required this.isTeacher,
    required this.t,
    required this.onPrimary,
    required this.onSecondary,
  });

  @override
  Widget build(BuildContext context) {
    final arc = context.arc;
    return ArcadeCard(
      key: const Key('setup_done'),
      fill: arc.wash,
      padding: const EdgeInsets.all(18),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Align(
            alignment: AlignmentDirectional.centerStart,
            child: Container(
              width: 44,
              height: 44,
              alignment: Alignment.center,
              decoration: BoxDecoration(
                color: arc.accent,
                border: Border.all(color: arc.line, width: Arc.borderWidth),
              ),
              child: Icon(Icons.check_rounded, size: 26, color: arc.onAccent),
            ),
          ),
          const SizedBox(height: 12),
          Text(
            isTeacher ? t('اكتمل الإعداد', 'Setup complete') : t('أحسنت! أكملت أول درس', 'Well done — you finished your first lesson'),
            style: TextStyle(fontSize: 20, fontWeight: FontWeight.w700, color: arc.ink, height: 1.4),
          ),
          if (isTeacher) ...[
            const SizedBox(height: 6),
            Text(
              t('مادتك في المتجر الآن.', 'Your course is in the marketplace.'),
              style: TextStyle(fontSize: 14, color: arc.inkSoft, height: 1.5),
            ),
          ],
          const SizedBox(height: 16),
          ArcadeButton.nav(
            key: const Key('setup_done_primary'),
            onPressed: onPrimary,
            variant: ArcadeVariant.solid,
            expand: true,
            label: isTeacher ? t('لوحة التحكم', 'Dashboard') : t('تابع التعلّم', 'Continue learning'),
          ),
          const SizedBox(height: 12),
          ArcadeButton.nav(
            key: const Key('setup_done_secondary'),
            onPressed: onSecondary,
            expand: true,
            label: isTeacher ? t('الطلبات', 'Orders') : t('المتجر', 'Marketplace'),
          ),
        ],
      ),
    );
  }
}

class _GuideSkeleton extends StatelessWidget {
  const _GuideSkeleton();

  @override
  Widget build(BuildContext context) {
    return ListView(
      key: const Key('setup_loading'),
      physics: const AlwaysScrollableScrollPhysics(),
      padding: const EdgeInsets.fromLTRB(16, 12, 16, 32),
      children: const [
        ArcadeSkeleton(height: 170),
        SizedBox(height: 16),
        ArcadeSkeleton(height: 44),
        SizedBox(height: 16),
        ArcadeSkeleton(height: 60),
        SizedBox(height: 10),
        ArcadeSkeleton(height: 60),
        SizedBox(height: 10),
        ArcadeSkeleton(height: 60),
      ],
    );
  }
}
