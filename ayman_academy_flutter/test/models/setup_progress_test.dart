import 'package:flutter_test/flutter_test.dart';

import 'package:ayman_academy_app/shared/services/setup_progress.dart';

/// The setup guide's done-rules, one group per spec table row
/// (docs/superpowers/specs/2026-11-21-setup-guide.md).
void main() {
  SetupStep step(SetupProgress p, String key) => p.steps.firstWhere((s) => s.key == key);

  group('teacher', () {
    const empty = TeacherSetupInput(isActive: true);

    test('four steps in spec order, none done for a new teacher', () {
      final p = teacherSetup(empty);
      expect(p.steps.map((s) => s.key), ['profile', 'course', 'lesson', 'publish']);
      expect(p.completedCount, 0);
      expect(p.allComplete, isFalse);
      expect(p.nextStep!.key, 'profile');
      expect(p.counter, 1);
    });

    group('profile', () {
      test('needs bio AND both Sham Cash fields', () {
        final p = teacherSetup(const TeacherSetupInput(
          isActive: true,
          bioAr: 'معلّم رياضيات',
          shamcashAccountName: 'أحمد',
          shamcashAccountNumber: '0999',
        ));
        expect(step(p, 'profile').isDone, isTrue);
        expect(step(p, 'profile').summary, ('النبذة وحساب شام كاش: 2 من 2', 'Bio and Sham Cash: 2 of 2'));
      });

      test('bio only is in progress, 1 of 2', () {
        final p = teacherSetup(const TeacherSetupInput(isActive: true, bioAr: 'نبذة'));
        final s = step(p, 'profile');
        expect(s.isDone, isFalse);
        expect(s.subDone, 1);
        expect(s.subTotal, 2);
        expect(s.summary!.$1, 'النبذة وحساب شام كاش: 1 من 2');
      });

      test('Sham Cash name without number does not count', () {
        final p = teacherSetup(const TeacherSetupInput(
          isActive: true,
          bioAr: 'نبذة',
          shamcashAccountName: 'أحمد',
        ));
        expect(step(p, 'profile').subDone, 1);
        expect(step(p, 'profile').isDone, isFalse);
      });

      test('whitespace-only values are blank', () {
        final p = teacherSetup(const TeacherSetupInput(
          isActive: true,
          bioAr: '   ',
          shamcashAccountName: ' ',
          shamcashAccountNumber: '\n',
        ));
        expect(step(p, 'profile').subDone, 0);
        expect(step(p, 'profile').summary, isNull, reason: 'nothing started shows nothing');
      });
    });

    group('course', () {
      test('done with one subject, summary counts them', () {
        final p = teacherSetup(const TeacherSetupInput(isActive: false, subjects: [
          TeacherSubjectFact(id: 's1', isActive: false),
          TeacherSubjectFact(id: 's2', isActive: false),
        ]));
        expect(step(p, 'course').isDone, isTrue);
        expect(step(p, 'course').summary, ('موادك: 2', 'Your courses: 2'));
      });

      test('not done with no subjects', () {
        expect(step(teacherSetup(empty), 'course').isDone, isFalse);
        expect(step(teacherSetup(empty), 'course').summary, isNull);
      });
    });

    group('lesson', () {
      test('a lesson with no blocks does not count', () {
        final p = teacherSetup(const TeacherSetupInput(
          isActive: true,
          subjects: [TeacherSubjectFact(id: 's1', isActive: false)],
          lessons: [TeacherLessonFact(id: 'l1', subjectId: 's1', isPublished: false)],
        ));
        expect(step(p, 'lesson').isDone, isFalse);
      });

      test('a lesson with a block counts, published or not', () {
        final p = teacherSetup(const TeacherSetupInput(
          isActive: true,
          subjects: [TeacherSubjectFact(id: 's1', isActive: false)],
          lessons: [
            TeacherLessonFact(id: 'l1', subjectId: 's1', isPublished: false),
            TeacherLessonFact(id: 'l2', subjectId: 's1', isPublished: false),
          ],
          lessonIdsWithBlocks: {'l1'},
        ));
        expect(step(p, 'lesson').isDone, isTrue);
        expect(step(p, 'lesson').summary!.$1, 'دروس فيها محتوى: 1');
      });

      test('a lesson in someone else\'s subject does not count', () {
        final p = teacherSetup(const TeacherSetupInput(
          isActive: true,
          subjects: [TeacherSubjectFact(id: 's1', isActive: false)],
          lessons: [TeacherLessonFact(id: 'l9', subjectId: 'other', isPublished: true)],
          lessonIdsWithBlocks: {'l9'},
        ));
        expect(step(p, 'lesson').isDone, isFalse);
      });
    });

    group('publish', () {
      test('an active subject WITHOUT a published lesson is not live', () {
        final p = teacherSetup(const TeacherSetupInput(
          isActive: true,
          subjects: [TeacherSubjectFact(id: 's1', isActive: true)],
          lessons: [TeacherLessonFact(id: 'l1', subjectId: 's1', isPublished: false)],
          lessonIdsWithBlocks: {'l1'},
        ));
        expect(step(p, 'publish').isDone, isFalse);
      });

      test('a published lesson in an INACTIVE subject is not live', () {
        final p = teacherSetup(const TeacherSetupInput(
          isActive: true,
          subjects: [TeacherSubjectFact(id: 's1', isActive: false)],
          lessons: [TeacherLessonFact(id: 'l1', subjectId: 's1', isPublished: true)],
        ));
        expect(step(p, 'publish').isDone, isFalse);
      });

      test('an active subject with a published lesson is live', () {
        final p = teacherSetup(const TeacherSetupInput(
          isActive: true,
          subjects: [
            TeacherSubjectFact(id: 's1', isActive: true),
            TeacherSubjectFact(id: 's2', isActive: true),
          ],
          lessons: [
            TeacherLessonFact(id: 'l1', subjectId: 's1', isPublished: true),
            TeacherLessonFact(id: 'l2', subjectId: 's1', isPublished: true),
          ],
        ));
        expect(step(p, 'publish').isDone, isTrue);
        expect(step(p, 'publish').count, 1, reason: 'counts subjects, not lessons');
        expect(step(p, 'publish').summary!.$1, 'منشورة في المتجر: 1');
        expect(step(p, 'publish').blocked, isFalse);
      });

      test('a pending teacher with nothing live is blocked (text, no button)', () {
        final p = teacherSetup(const TeacherSetupInput(isActive: false));
        expect(step(p, 'publish').blocked, isTrue);
      });

      test('an approved teacher is never blocked', () {
        final p = teacherSetup(const TeacherSetupInput(isActive: true));
        expect(step(p, 'publish').blocked, isFalse);
      });

      test('a pending teacher whose course is already live is done, not blocked', () {
        final p = teacherSetup(const TeacherSetupInput(
          isActive: false,
          subjects: [TeacherSubjectFact(id: 's1', isActive: true)],
          lessons: [TeacherLessonFact(id: 'l1', subjectId: 's1', isPublished: true)],
        ));
        expect(step(p, 'publish').isDone, isTrue);
        expect(step(p, 'publish').blocked, isFalse);
      });
    });

    test('all four done is complete; counter caps at M', () {
      final p = teacherSetup(const TeacherSetupInput(
        isActive: true,
        bioAr: 'نبذة',
        shamcashAccountName: 'أحمد',
        shamcashAccountNumber: '0999',
        subjects: [TeacherSubjectFact(id: 's1', isActive: true)],
        lessons: [TeacherLessonFact(id: 'l1', subjectId: 's1', isPublished: true)],
        lessonIdsWithBlocks: {'l1'},
      ));
      expect(p.allComplete, isTrue);
      expect(p.completedCount, 4);
      expect(p.nextStep, isNull);
      expect(p.counter, 4);
    });
  });

  group('student', () {
    test('three steps in spec order, none done for a new student', () {
      final p = studentSetup(const StudentSetupInput());
      expect(p.steps.map((s) => s.key), ['choose', 'start', 'finish']);
      expect(p.completedCount, 0);
      expect(p.nextStep!.key, 'choose');
      expect(p.counter, 1);
      expect(step(p, 'choose').summary, isNull);
    });

    group('choose', () {
      test('a pending order alone is done, with the waiting summary', () {
        final p = studentSetup(const StudentSetupInput(orderStatuses: ['pending_payment']));
        final s = step(p, 'choose');
        expect(s.isDone, isTrue);
        expect(s.waitingForTeacher, isTrue);
        expect(s.summary, ('بانتظار تأكيد المعلّم للدفع', 'Waiting for the teacher to confirm payment'));
      });

      test('rejected and cancelled orders do not count', () {
        final p = studentSetup(const StudentSetupInput(orderStatuses: ['rejected', 'cancelled']));
        expect(step(p, 'choose').isDone, isFalse);
      });

      test('a pending order beside a rejected one is still waiting', () {
        final p = studentSetup(const StudentSetupInput(orderStatuses: ['rejected', 'pending_payment']));
        expect(step(p, 'choose').isDone, isTrue);
        expect(step(p, 'choose').waitingForTeacher, isTrue);
      });

      test('a paid order is done, plain summary', () {
        final p = studentSetup(const StudentSetupInput(orderStatuses: ['paid']));
        expect(step(p, 'choose').isDone, isTrue);
        expect(step(p, 'choose').waitingForTeacher, isFalse);
        expect(step(p, 'choose').summary, ('تم', 'Done'));
      });

      test('an enrolment alone is done (free course, no order)', () {
        final p = studentSetup(const StudentSetupInput(enrollmentCount: 1));
        expect(step(p, 'choose').isDone, isTrue);
        expect(step(p, 'choose').waitingForTeacher, isFalse);
      });

      test('a pending order plus an enrolment is not "waiting"', () {
        final p = studentSetup(const StudentSetupInput(
          orderStatuses: ['pending_payment'],
          enrollmentCount: 1,
        ));
        expect(step(p, 'choose').waitingForTeacher, isFalse);
      });

      test('progress alone is done (a free-preview lesson)', () {
        final p = studentSetup(const StudentSetupInput(
          progress: [StudentProgressFact(lessonId: 'l1')],
        ));
        expect(step(p, 'choose').isDone, isTrue);
        expect(step(p, 'choose').waitingForTeacher, isFalse);
      });
    });

    group('start', () {
      test('done on any progress row', () {
        final p = studentSetup(const StudentSetupInput(
          progress: [StudentProgressFact(lessonId: 'l1')],
        ));
        expect(step(p, 'start').isDone, isTrue);
        expect(step(p, 'start').summary, ('تم', 'Done'));
      });

      test('an enrolment without progress is not started', () {
        final p = studentSetup(const StudentSetupInput(enrollmentCount: 2));
        expect(step(p, 'start').isDone, isFalse);
        expect(p.nextStep!.key, 'start');
        expect(p.counter, 2);
      });
    });

    group('finish', () {
      test('needs completed_at, not just progress', () {
        final p = studentSetup(const StudentSetupInput(
          progress: [StudentProgressFact(lessonId: 'l1')],
        ));
        expect(step(p, 'finish').isDone, isFalse);
        expect(p.nextStep!.key, 'finish');
        expect(p.counter, 3);
      });

      test('done and counted', () {
        final p = studentSetup(const StudentSetupInput(progress: [
          StudentProgressFact(lessonId: 'l1', completed: true),
          StudentProgressFact(lessonId: 'l2', completed: true),
          StudentProgressFact(lessonId: 'l3'),
        ]));
        expect(step(p, 'finish').isDone, isTrue);
        expect(step(p, 'finish').summary, ('دروس مكتملة: 2', 'Lessons completed: 2'));
        expect(p.allComplete, isTrue);
        expect(p.counter, 3, reason: 'N = min(done + 1, M)');
      });
    });

    group('latestLessonId', () {
      test('null with no progress', () {
        expect(latestLessonId(const []), isNull);
      });

      test('picks the most recently updated lesson', () {
        expect(
          latestLessonId(const [
            StudentProgressFact(lessonId: 'old', updatedAt: '2026-11-01T10:00:00Z'),
            StudentProgressFact(lessonId: 'new', updatedAt: '2026-11-20T10:00:00Z'),
            StudentProgressFact(lessonId: 'mid', updatedAt: '2026-11-10T10:00:00Z'),
          ]),
          'new',
        );
      });

      test('a real timestamp beats a missing one', () {
        expect(
          latestLessonId(const [
            StudentProgressFact(lessonId: 'none'),
            StudentProgressFact(lessonId: 'dated', updatedAt: '2026-11-01T10:00:00Z'),
          ]),
          'dated',
        );
      });
    });
  });

  test('counter is min(done + 1, M) at every count', () {
    for (var done = 0; done <= 4; done++) {
      final steps = List.generate(
        4,
        (i) => SetupStep(key: 'k$i', state: i < done ? SetupStepState.done : SetupStepState.todo),
      );
      final p = SetupProgress(steps);
      expect(p.counter, done + 1 > 4 ? 4 : done + 1);
    }
  });

  test('every step key has copy', () {
    for (final key in ['profile', 'course', 'lesson', 'publish', 'choose', 'start', 'finish']) {
      expect(setupCopy[key], isNotNull, reason: key);
    }
  });
}
