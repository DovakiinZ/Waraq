import { Link, useParams } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { useStage, useSubjects } from '@/hooks/useQueryHooks';
import Layout from '@/components/layout/Layout';
import {
  Calculator, BookOpen, Beaker, Globe, Palette, Music,
  ArrowLeft, ArrowRight, ChevronLeft, ChevronRight, Loader2,
  GraduationCap, School
} from 'lucide-react';

const StageDetail = () => {
  const { stageId } = useParams();
  const { t, direction } = useLanguage();
  const { data: stage, isLoading: stageLoading } = useStage(stageId);
  // Filter subjects by the resolved uuid, never by the route param: the param
  // may be a slug (`/stages/primary`), and `subjects.stage_id` holds uuids.
  const { data: subjects = [], isLoading: subjectsLoading, error } = useSubjects(stage?.id);

  const ArrowIcon = direction === 'rtl' ? ArrowLeft : ArrowRight;
  const BackIcon = direction === 'rtl' ? ChevronRight : ChevronLeft;

  // Icon mapping helper (similar to Stages.tsx)
  const getSubjectIcon = (titleAr: string = '') => {
    if (titleAr.includes('عرب')) return BookOpen;
    if (titleAr.includes('رياضيات') || titleAr.includes('حساب')) return Calculator;
    if (titleAr.includes('علوم') || titleAr.includes('فيزياء') || titleAr.includes('كيمياء')) return Beaker;
    if (titleAr.includes('انجليزي') || titleAr.includes('عالم') || titleAr.includes('اجتماع')) return Globe;
    if (titleAr.includes('فنون') || titleAr.includes('رسم')) return Palette;
    if (titleAr.includes('نشيد') || titleAr.includes('موسيقى')) return Music;
    return BookOpen;
  };

  const isLoading = stageLoading || subjectsLoading;

  if (!isLoading && !stage) {
    return (
      <Layout>
        <div className="container-academic py-20 text-center">
          <GraduationCap className="w-16 h-16 text-muted-foreground mx-auto mb-4 opacity-20" />
          <h1 className="text-2xl font-bold">{t('المرحلة غير موجودة', 'Stage Not Found')}</h1>
          <Link to="/stages" className="text-primary hover:underline mt-4 inline-block">
            {t('العودة لكافة المراحل', 'Back to all stages')}
          </Link>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      {/* Header */}
      <section className="bg-secondary/30 py-12 md:py-16 border-b border-border">
        <div className="container-academic">
          <Link
            to="/stages"
            className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4 transition-colors"
          >
            <BackIcon className="w-4 h-4" />
            {t('جميع المراحل', 'All Stages')}
          </Link>

          {stageLoading ? (
            <div className="h-20 flex items-center">
              <div className="h-8 w-48 bg-muted animate-pulse rounded" />
            </div>
          ) : (
            <>
              <h1 className="text-foreground mb-4">
                {t(stage?.title_ar, stage?.title_en || stage?.title_ar)}
              </h1>
              <p className="text-muted-foreground max-w-2xl">
                {t(
                  'اختر المادة الدراسية للوصول إلى الدروس والمحتوى التعليمي',
                  'Select a subject to access lessons and educational content'
                )}
              </p>
            </>
          )}
        </div>
      </section>

      {/* Subjects Grid */}
      <section className="section-academic">
        <div className="container-academic">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
              <Loader2 className="w-10 h-10 animate-spin text-primary" />
              <p className="text-muted-foreground">{t('جاري تحميل المواد...', 'Loading subjects...')}</p>
            </div>
          ) : error ? (
            <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-6 text-center">
              <p className="text-destructive font-medium">{t('حدث خطأ أثناء تحميل المواد', 'Error loading subjects')}</p>
              <p className="text-sm text-muted-foreground mt-1">{error instanceof Error ? error.message : String(error)}</p>
            </div>
          ) : subjects.length === 0 ? (
            <div className="text-center py-20 bg-secondary/10 rounded-xl border-2 border-dashed border-border">
              <School className="w-16 h-16 text-muted-foreground mx-auto mb-4 opacity-20" />
              <h3 className="text-lg font-medium text-foreground">{t('لا توجد مواد دراسية حالياً', 'No subjects found')}</h3>
              <p className="text-muted-foreground mt-2">{t('سيتم إضافة المواد الدراسية لهذه المرحلة قريباً', 'Subjects for this stage will be added soon')}</p>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {subjects.map((subject: any) => {
                const Icon = getSubjectIcon(subject.title_ar);
                return (
                  <Link
                    key={subject.id}
                    to={`/stages/${stageId}/${subject.id}`}
                    className="academic-card hover:shadow-md transition-all group"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="w-12 h-12 rounded bg-primary/10 flex items-center justify-center group-hover:bg-primary/15 transition-colors">
                        <Icon className="w-6 h-6 text-primary" />
                      </div>
                      <ArrowIcon className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
                    </div>
                    <h3 className="text-lg font-semibold text-foreground mb-2">
                      {t(subject.title_ar, subject.title_en || subject.title_ar)}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {t(`${subject.lessons_count || 0} درساً`, `${subject.lessons_count || 0} Lessons`)}
                    </p>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </section>
    </Layout>
  );
};

export default StageDetail;
