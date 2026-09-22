import {
  LayoutDashboard,
  BookOpen,
  MessageSquare,
  User,
  Users,
  GraduationCap,
  BookMarked,
  FileText,
  Settings,
  ClipboardList,
  Type,
  CreditCard,
  Mail,
  Building2,
  Ticket,
  Award,
  Megaphone,
  Star,
  ShoppingCart,
  Receipt,
  Store,
  UserPlus,
  type LucideIcon,
} from 'lucide-react';

export interface NavItem {
  path: string;
  icon: LucideIcon;
  label: { ar: string; en: string };
  exact?: boolean;
}

export type UserRole = 'student' | 'teacher' | 'super_admin';

export const roleBasePath: Record<UserRole, string> = {
  student: '/student',
  teacher: '/teacher',
  super_admin: '/admin',
};

export const roleLabel: Record<UserRole, { ar: string; en: string }> = {
  student: { ar: 'طالب', en: 'Student' },
  teacher: { ar: 'معلم', en: 'Teacher' },
  super_admin: { ar: 'مدير النظام', en: 'Super Admin' },
};

const studentNav: NavItem[] = [
  { path: '/student', icon: LayoutDashboard, label: { ar: 'لوحة التحكم', en: 'Dashboard' }, exact: true },
  { path: '/student/marketplace', icon: Store, label: { ar: 'المتجر', en: 'Marketplace' } },
  { path: '/student/subjects', icon: BookOpen, label: { ar: 'موادي', en: 'My Subjects' } },
  { path: '/student/teachers', icon: Users, label: { ar: 'المعلمون', en: 'My Teachers' } },
  { path: '/student/certificates', icon: Award, label: { ar: 'شهاداتي', en: 'My Certificates' } },
  { path: '/student/messages', icon: MessageSquare, label: { ar: 'الرسائل', en: 'Messages' } },
  { path: '/student/profile', icon: User, label: { ar: 'ملفي الشخصي', en: 'My Profile' } },
];

const teacherNav: NavItem[] = [
  { path: '/teacher', icon: LayoutDashboard, label: { ar: 'لوحة التحكم', en: 'Dashboard' }, exact: true },
  { path: '/teacher/orders', icon: Receipt, label: { ar: 'الطلبات', en: 'Orders' } },
  { path: '/teacher/subjects', icon: BookMarked, label: { ar: 'موادي', en: 'My Subjects' } },
  { path: '/teacher/lessons', icon: BookOpen, label: { ar: 'دروسي', en: 'My Lessons' } },
  { path: '/teacher/quizzes', icon: ClipboardList, label: { ar: 'الاختبارات', en: 'Quizzes' } },
  { path: '/teacher/announcements', icon: Megaphone, label: { ar: 'الإعلانات', en: 'Announcements' } },
  { path: '/teacher/reviews', icon: Star, label: { ar: 'التقييمات والآراء', en: 'Ratings & Feedback' } },
  { path: '/teacher/certificates', icon: Award, label: { ar: 'الشهادات', en: 'Certificates' } },
  { path: '/teacher/messages', icon: MessageSquare, label: { ar: 'الرسائل', en: 'Messages' } },
  { path: '/teacher/profile', icon: User, label: { ar: 'ملفي الشخصي', en: 'My Profile' } },
];

const adminNav: NavItem[] = [
  { path: '/admin', icon: LayoutDashboard, label: { ar: 'لوحة التحكم', en: 'Dashboard' }, exact: true },
  { path: '/admin/homepage', icon: LayoutDashboard, label: { ar: 'الصفحة الرئيسية', en: 'Homepage' } },
  { path: '/admin/templates', icon: Type, label: { ar: 'القوالب والنصوص', en: 'Templates' } },
  { path: '/admin/applications', icon: UserPlus, label: { ar: 'طلبات المعلمين', en: 'Applications' } },
  { path: '/admin/orders', icon: Receipt, label: { ar: 'الطلبات', en: 'Orders' } },
  { path: '/admin/teachers', icon: Users, label: { ar: 'المعلمون', en: 'Teachers' } },
  { path: '/admin/students', icon: GraduationCap, label: { ar: 'الطلاب', en: 'Students' } },
  { path: '/admin/stages', icon: GraduationCap, label: { ar: 'المراحل', en: 'Stages' } },
  { path: '/admin/subjects', icon: BookMarked, label: { ar: 'المواد', en: 'Subjects' } },
  { path: '/admin/lessons', icon: FileText, label: { ar: 'الدروس', en: 'Lessons' } },
  { path: '/admin/plans', icon: CreditCard, label: { ar: 'الخطط', en: 'Plans' } },
  { path: '/admin/subscriptions', icon: CreditCard, label: { ar: 'الاشتراكات', en: 'Subscriptions' } },
  { path: '/admin/invites', icon: Mail, label: { ar: 'الدعوات', en: 'Invites' } },
  { path: '/admin/organizations', icon: Building2, label: { ar: 'المؤسسات', en: 'Organizations' } },
  { path: '/admin/coupons', icon: Ticket, label: { ar: 'الكوبونات', en: 'Coupons' } },
  { path: '/admin/settings', icon: Settings, label: { ar: 'الإعدادات', en: 'Settings' } },
];

export const roleNavItems: Record<UserRole, NavItem[]> = {
  student: studentNav,
  teacher: teacherNav,
  super_admin: adminNav,
};

/** Bottom nav shows at most 4 items for students */
export const studentBottomNavItems = studentNav;
