export const queryKeys = {
  stages: {
    all: ['stages'] as const,
    detail: (id: string) => ['stages', id] as const,
  },
  subjects: {
    all: ['subjects'] as const,
    byStage: (stageId: string) => ['subjects', { stageId }] as const,
  },
  lessons: {
    all: ['lessons'] as const,
    bySubject: (subjectId: string) => ['lessons', { subjectId }] as const,
    detail: (id: string) => ['lesson', id] as const,
    blocks: (id: string) => ['lesson', id, 'blocks'] as const,
  },
  student: {
    progress: (userId: string) => ['student', userId, 'progress'] as const,
    dashboard: (userId: string) => ['student', userId, 'dashboard'] as const,
    teachers: (userId: string) => ['student', userId, 'teachers'] as const,
  },
  messages: {
    contacts: (userId: string) => ['messages', userId, 'contacts'] as const,
    thread: (userId: string, contactId: string) => ['messages', userId, contactId] as const,
  },
  quiz: {
    detail: (quizId: string) => ['quiz', quizId, 'detail'] as const,
    questions: (quizId: string) => ['quiz', quizId, 'questions'] as const,
  },
  admin: {
    stats: ['admin', 'stats'] as const,
    teachers: ['admin', 'teachers'] as const,
    invites: ['admin', 'invites'] as const,
    teachersAndInvites: ['admin', 'teachersAndInvites'] as const,
  },
  teacher: {
    stats: (userId: string) => ['teacher', userId, 'stats'] as const,
    lessons: (userId: string) => ['teacher', userId, 'lessons'] as const,
  },
  orders: {
    student: (userId: string) => ['orders', 'student', userId] as const,
    teacher: (userId: string) => ['orders', 'teacher', userId] as const,
    detail: (orderId: string) => ['orders', orderId] as const,
  },
  marketplace: {
    subjects: (stageId?: string) => ['marketplace', 'subjects', stageId] as const,
  },
  templates: ['templates'] as const,
  settings: ['settings'] as const,
  homepage: {
    all: ['homepage'] as const,
    stages: ['homepage', 'stages'] as const,
    featuredSubjects: ['homepage', 'featuredSubjects'] as const,
    featuredLessons: ['homepage', 'featuredLessons'] as const,
    featuredTeachers: ['homepage', 'featuredTeachers'] as const,
  },
} as const;
