import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTeacherFeedback } from '@/hooks/useQueryHooks';
import { 
  Star, 
  MessageSquare, 
  Users, 
  BarChart3, 
  TrendingDown, 
  AlertTriangle, 
  CheckCircle,
  Loader2,
  ChevronRight,
  ChevronLeft,
  Award
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import CourseHealthPanel from '@/components/teacher/CourseHealthPanel';
import { format } from 'date-fns';
import { ar, enUS } from 'date-fns/locale';

export default function TeacherReviews() {
  const { user } = useAuth();
  const { t, direction } = useLanguage();
  const { data: feedback, isLoading } = useTeacherFeedback(user?.id);
  const locale = direction === 'rtl' ? ar : enUS;

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <p className="text-muted-foreground">{t('جاري تحميل التقييمات...', 'Loading reviews...')}</p>
      </div>
    );
  }

  const { stats, reviews, subjects, systemRemarks } = feedback || { 
    stats: { averageRating: 0, totalReviews: 0 }, 
    reviews: [], 
    subjects: [],
    systemRemarks: []
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Header & Stats Overview */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            {t('التقييمات والآراء', 'Ratings & Feedback')}
          </h1>
          <p className="text-muted-foreground mt-2 max-w-lg">
            {t(
              'اطلع على انطباعات طلابك وأداء موادك التعليمية لتحسين جودة المحتوى.',
              'View student impressions and course performance to improve content quality.'
            )}
          </p>
        </div>

        <div className="flex items-center gap-4 bg-background border border-border rounded-2xl p-4 shadow-sm">
          <div className="flex flex-col items-center px-4 border-e border-border">
            <div className="flex items-center gap-1 text-2xl font-bold text-yellow-500">
              <Star className="w-6 h-6 fill-yellow-500" />
              {stats.averageRating}
            </div>
            <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">
              {t('متوسط التقييم', 'Avg Rating')}
            </span>
          </div>
          <div className="flex flex-col items-center px-4">
            <div className="text-2xl font-bold text-foreground">
              {stats.totalReviews}
            </div>
            <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">
              {t('إجمالي الآراء', 'Total Reviews')}
            </span>
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-12 gap-8">
        {/* Left: Detailed Reviews List */}
        <div className="lg:col-span-7 space-y-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <MessageSquare className="w-5 h-5 text-primary" />
            </div>
            <h2 className="text-xl font-bold text-foreground">
              {t('آراء الطلاب الأخيرة', 'Recent Student Feedback')}
            </h2>
          </div>

          {reviews.length === 0 ? (
            <div className="bg-card rounded-2xl border border-border p-12 text-center shadow-sm">
              <MessageSquare className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
              <p className="text-muted-foreground">
                {t('لا توجد تقييمات مكتوبة بعد من قبل الطلاب.', 'No written reviews from students yet.')}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {reviews.map((review: any) => (
                <div key={review.id} className="bg-card rounded-2xl border border-border p-5 shadow-sm hover:shadow-md transition-shadow group">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center overflow-hidden border border-border">
                        {review.user?.avatar_url ? (
                          <img src={review.user.avatar_url} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <Users className="w-5 h-5 text-muted-foreground" />
                        )}
                      </div>
                      <div>
                        <h4 className="font-bold text-sm text-foreground">
                          {review.user?.full_name || t('طالب 익명', 'Anonymous Student')}
                        </h4>
                        <div className="flex items-center gap-1 mt-0.5">
                          {[1, 2, 3, 4, 5].map((s) => (
                            <Star 
                              key={s} 
                              className={`w-3 h-3 ${s <= review.stars ? 'fill-yellow-400 text-yellow-400' : 'text-border'}`}
                            />
                          ))}
                        </div>
                      </div>
                    </div>
                    <span className="text-[10px] text-muted-foreground bg-secondary px-2 py-1 rounded-full">
                      {format(new Date(review.created_at), 'PPP', { locale })}
                    </span>
                  </div>
                  
                  {review.comment && (
                    <p className="text-sm text-foreground leading-relaxed italic bg-secondary/30 rounded-xl p-3 mb-3">
                      "{review.comment}"
                    </p>
                  )}

                  <div className="flex items-center gap-2 pt-2 border-t border-border/50">
                    {review.lesson && (
                      <Badge variant="outline" className="text-[10px] font-normal py-0">
                        {t('الدرس:', 'Lesson:')} {t(review.lesson.title_ar, review.lesson.title_en || review.lesson.title_ar)}
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* New: Certificate Activity (Historical Feedback) */}
          <div className="pt-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center">
                <Award className="w-5 h-5 text-amber-600" />
              </div>
              <h2 className="text-xl font-bold text-foreground">
                {t('نشاط الشهادات التاريخي', 'Historical Certificate Activity')}
              </h2>
            </div>

            {systemRemarks.length === 0 ? (
              <div className="bg-card/50 rounded-2xl border border-dashed border-border p-8 text-center">
                <p className="text-sm text-muted-foreground">
                  {t('لا توجد ملاحظات نظام مسجلة حالياً.', 'No system remarks recorded at this time.')}
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {systemRemarks.map((remark: any) => (
                  <div key={remark.id} className="bg-secondary/20 rounded-2xl border border-border p-4 shadow-sm relative overflow-hidden">
                    <div className="absolute top-0 start-0 w-1 h-full bg-amber-500/50" />
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="text-[10px] uppercase tracking-wider h-5">
                          {t('ملاحظة النظام', 'System Remark')}
                        </Badge>
                        <h4 className="text-sm font-bold">{remark.student_name}</h4>
                      </div>
                      <span className="text-[10px] text-muted-foreground">
                        {format(new Date(remark.created_at), 'PPP', { locale })}
                      </span>
                    </div>
                    <p className="text-sm text-foreground/80 italic leading-relaxed">
                      "{remark.comment}"
                    </p>
                    {remark.subject && (
                      <div className="mt-2 flex items-center gap-1.5 opacity-60">
                        <ChevronRight className={`w-3 h-3 ${direction === 'rtl' ? 'rotate-180' : ''}`} />
                        <span className="text-[10px] font-medium">
                          {t('المادة:', 'Subject:')} {t(remark.subject.title_ar, remark.subject.title_en || remark.subject.title_ar)}
                        </span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right: Course Health & Automated Insights */}
        <div className="lg:col-span-5 space-y-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-orange-500/10 flex items-center justify-center">
              <BarChart3 className="w-5 h-5 text-orange-600" />
            </div>
            <h2 className="text-xl font-bold text-foreground">
              {t('رؤى الأداء الذكية', 'Smart Performance Insights')}
            </h2>
          </div>

          <p className="text-sm text-muted-foreground -mt-4">
            {t(
              'تحليل تلقائي لجودة الدروس بناءً على تفاعل الطلاب ونتائج الاختبارات.',
              'Automatic quality analysis based on student interaction and quiz results.'
            )}
          </p>

          <div className="space-y-6">
            {subjects.length === 0 ? (
              <div className="bg-card rounded-2xl border border-dashed border-border p-10 text-center">
                <p className="text-xs text-muted-foreground">
                  {t('بمجرد أن يبدأ الطلاب في دراسة موادك، ستظهر البيانات هنا.', 'Data will appear here once students start studying your courses.')}
                </p>
              </div>
            ) : (
              subjects.map((subject: any) => (
                <CourseHealthPanel 
                  key={subject.id} 
                  subjectId={subject.id} 
                  subjectName={t(subject.title_ar, subject.title_en || subject.title_ar)} 
                />
              ))
            )}
          </div>
          
          {/* Proactive Tip */}
          <div className="bg-primary/5 rounded-2xl border border-primary/10 p-5 mt-4">
            <div className="flex items-center gap-2 mb-2 text-primary">
              <AlertTriangle className="w-4 h-4" />
              <h4 className="text-sm font-bold uppercase tracking-wider">{t('نصيحة لتحسين التفاعل', 'Engagement Tip')}</h4>
            </div>
            <p className="text-xs text-foreground leading-relaxed">
              {t(
                'الدروس التي تحتوي على اختبارات قصيرة بعد أول 5 دقائق تحقق تفاعلاً بنسبة أعلى بـ 40%. جرب تقسيم الدروس الطويلة إلى مقاطع أقصر.',
                'Lessons with short quizzes after the first 5 minutes achieve 40% higher engagement. Try spliting long lessons into shorter segments.'
              )}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
