import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import Layout from '@/components/layout/Layout';
import { ChevronLeft, ChevronRight, FileText, Download, CheckCircle, Clock, Lock, Loader2, Play, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useLesson } from '@/hooks/useQueryHooks';
import { LessonBlock, LessonSection } from '@/types/database';
import { LessonContentRenderer } from '@/components/shared/LessonContentRenderer';
import { LessonLocked } from '@/components/shared/LessonLocked';
import { isLessonContentWithheld } from '@/lib/lessonAccess';

// Helper to extract YouTube ID
const getYoutubeId = (url: string) => {
    if (!url) return null;
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
};

const LessonPage = () => {
  const { lessonId } = useParams();
  const { t, direction } = useLanguage();
  const { isAuthenticated } = useAuth();
  const BackIcon = direction === 'rtl' ? ChevronRight : ChevronLeft;

  const { data: currentLessonData, isLoading: loading, error } = useLesson(lessonId);
  const lesson = currentLessonData?.lesson || null;

  const [isExpanded, setIsExpanded] = useState(false);

  if (loading) {
      return (
          <Layout>
              <div className="h-[60vh] flex items-center justify-center">
                  <div className="flex flex-col items-center gap-4">
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                    <p className="text-muted-foreground animate-pulse text-sm">
                      {t('جاري تحميل الدرس...', 'Loading lesson...')}
                    </p>
                  </div>
              </div>
          </Layout>
      );
  }

  if (error || !lesson) {
      return (
          <Layout>
              <div className="min-h-[60vh] flex flex-col items-center justify-center text-center p-6">
                  <div className="w-16 h-16 bg-destructive/10 text-destructive rounded-full flex items-center justify-center mb-4">
                    <Lock className="w-8 h-8" />
                  </div>
                  <h2 className="text-xl font-bold text-foreground mb-2">
                    {t('تعذر الوصول للدرس', 'Access Denied or Not Found')}
                  </h2>
                  <p className="text-muted-foreground max-w-sm mb-6 text-sm">
                    {error 
                      ? t('حدث خطأ في النظام أثناء جلب البيانات', 'A system error occurred while fetching data')
                      : t('هذا الدرس غير متاح حالياً للمعاينة العامة أو غير موجود', 'This lesson is not available for public preview or does not exist')}
                  </p>
                  <Button variant="outline" onClick={() => window.history.back()}>
                    {t('العودة للخلف', 'Go Back')}
                  </Button>
              </div>
          </Layout>
      );
  }

  const duration = lesson.duration_seconds
      ? `${Math.floor(lesson.duration_seconds / 60)}:${(lesson.duration_seconds % 60).toString().padStart(2, '0')}`
      : '10:00';

  const publishedBlocks = lesson.blocks?.filter((b: LessonBlock) => b.is_published !== false) || [];
  const resources = publishedBlocks.filter((b: LessonBlock) => ['file', 'link'].includes(b.type)) || [];
  
  // Find the first video block from the new schema
  const videoBlock = publishedBlocks.find((b: LessonBlock) => b.type === 'video');
  const currentVideoUrl = videoBlock?.url || lesson.video_url || lesson.full_video_url || lesson.preview_video_url || null;
  
  const youtubeId = currentVideoUrl ? getYoutubeId(currentVideoUrl) : null;
  const isPreview = !!lesson.preview_video_url || (videoBlock?.metadata as any)?.is_preview;

  return (
    <Layout>
      {/* Dark Hero Section */}
      <section className="bg-slate-950 dark:bg-background border-b border-border text-slate-50 pt-8 pb-12">
        <div className="container-academic">
          {/* Breadcrumb / Back Link */}
          <Link
            to={`/stages/${lesson.subject?.stage_id || lesson.subject?.level_id}/${lesson.subject_id}`}
            className="inline-flex items-center gap-1 text-sm text-slate-400 hover:text-white transition-colors mb-8"
          >
            <BackIcon className="w-4 h-4" />
            {t('العودة للمادة', 'Back to Subject')}
          </Link>

          <div className="flex flex-col lg:flex-row gap-8 items-center lg:items-stretch">
             {/* Left (Meta Information) */}
             <div className="lg:w-1/3 flex flex-col justify-center space-y-6 order-2 lg:order-1">
               <div>
                  <div className="flex items-center gap-2 mb-3 text-sm text-slate-400">
                    <span>{t(lesson.subject?.stage?.title_ar, lesson.subject?.stage?.title_en)}</span>
                    <span>·</span>
                    <span className="text-primary">{t(lesson.subject?.title_ar, lesson.subject?.title_en)}</span>
                  </div>
                  <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold text-white mb-4 leading-tight">
                    {t(lesson.title_ar, lesson.title_en || lesson.title_ar)}
                  </h1>
               </div>
               
               <div className="flex items-center gap-4 text-sm text-slate-300">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-primary font-bold">
                      {lesson.teacher?.full_name?.charAt(0) || 'T'}
                    </div>
                    <span>{lesson.teacher?.full_name || t('المعلم', 'Teacher')}</span>
                  </div>
                  <div className="w-1 h-1 rounded-full bg-slate-700" />
                  <span className="flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    {duration}
                  </span>
               </div>
               
               {isPreview && (
                 <div className="inline-flex text-sm pt-2">
                   <span className="bg-yellow-500/10 text-yellow-500 border border-yellow-500/20 px-4 py-1.5 rounded-full flex items-center gap-2 font-medium">
                     <Play className="w-4 h-4" />
                     {t('معاينة مجانية', 'Free Preview')}
                   </span>
                 </div>
               )}
             </div>

             {/* Right (Video) */}
             <div className="lg:w-2/3 w-full order-1 lg:order-2">
               <div className="rounded-xl overflow-hidden shadow-2xl bg-black aspect-video relative border border-slate-800">
                 {youtubeId ? (
                     <iframe
                         width="100%"
                         height="100%"
                         src={`https://www.youtube.com/embed/${youtubeId}?enablejsapi=1`}
                         title="Video player"
                         frameBorder="0"
                         allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                         allowFullScreen
                         className="w-full h-full"
                     ></iframe>
                 ) : (
                   <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-500 p-8">
                       <Lock className="w-12 h-12 mb-4 opacity-30" />
                       <p className="text-sm font-medium">{t('الفيديو غير متاح للمعاينة', 'Video not available for preview')}</p>
                   </div>
                 )}
               </div>
             </div>
          </div>
        </div>
      </section>

      {/* Lesson Content Section */}
      <section className="section-academic bg-background">
        <div className="container-academic">
          <div className="grid lg:grid-cols-3 gap-8">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-8">
              {/* Overview & Blocks Wrapper */}
              <div>
                <h2 className="text-xl font-bold text-foreground mb-6">
                  {t('محتوى الدرس', 'Lesson Content')}
                </h2>

                <div className={`relative transition-all duration-300 ${!isExpanded ? 'max-h-[300px] overflow-hidden' : ''}`}>
                  {/* Content Renderer (Rich text, images, etc.) */}
              {/* Post-109, an unentitled reader gets the lesson row with no
                  blocks and no sections rather than an error. Show the paywall
                  instead of an empty column. */}
              {isLessonContentWithheld(lesson) ? (
                  <LessonLocked
                      subjectId={lesson.subject_id}
                      subjectTitle={t(lesson.subject?.title_ar, lesson.subject?.title_en)}
                  />
              ) : (lesson.blocks && lesson.blocks.length > 0) || (lesson.sections && lesson.sections.length > 0) ? (
                  <LessonContentRenderer lesson={lesson} isPublicPreview={true} />
              ) : (
                  <div>
                    {lesson.summary_ar && (
                        <>
                          <h2 className="text-base font-medium text-foreground mb-2">
                            {t('نظرة عامة', 'Overview')}
                          </h2>
                          <div className="prose dark:prose-invert max-w-none text-muted-foreground text-sm mb-6">
                            <p className="whitespace-pre-wrap">
                                {t(lesson.summary_ar || '', lesson.summary_en || lesson.summary_ar || '')}
                            </p>
                          </div>
                        </>
                    )}
                    {lesson.objectives_ar && (
                        <>
                          <h2 className="text-base font-medium text-foreground mb-2">
                            {t('أهداف الدرس', 'Lesson Objectives')}
                          </h2>
                          <div className="prose dark:prose-invert max-w-none text-muted-foreground text-sm">
                              <p className="whitespace-pre-wrap">
                                  {t(lesson.objectives_ar || '', lesson.objectives_en || '')}
                              </p>
                          </div>
                        </>
                    )}
                  </div>
              )}

                  {/* Gradient Overlay when not expanded */}
                  {!isExpanded && (
                    <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-background to-transparent pointer-events-none" />
                  )}
                </div>

                <div className="pt-4">
                  <Button 
                    variant="outline" 
                    className="w-full sm:w-auto"
                    onClick={() => setIsExpanded(!isExpanded)}
                  >
                    {isExpanded ? (
                      <>
                        <ChevronUp className="w-4 h-4 me-2" />
                        {t('عرض أقل', 'Show Less')}
                      </>
                    ) : (
                      <>
                        <ChevronDown className="w-4 h-4 me-2" />
                        {t('عرض المزيد', 'Show More')}
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>

            {/* Sidebar */}
            <div className="space-y-5">
              {/* Files */}
              {resources.length > 0 && (
                <div className="academic-card">
                  <h3 className="font-medium text-foreground mb-3 flex items-center gap-2 text-sm">
                    <FileText className="w-4 h-4" strokeWidth={1.5} />
                    {t('مرفقات الدرس', 'Lesson Resources')}
                  </h3>
                  <div className="space-y-2">
                    {resources.map((res: LessonBlock) => (
                      <a
                        key={res.id}
                        href={res.url || '#'}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-between p-2.5 bg-secondary/50 rounded hover:bg-secondary/80 transition-colors"
                      >
                        <div className="flex items-center gap-2 overflow-hidden truncate">
                          {res.type === 'file' ? (
                              <Download className="w-4 h-4 text-primary shrink-0" />
                          ) : (
                              <FileText className="w-4 h-4 text-primary shrink-0" />
                          )}
                          <p className="text-sm text-foreground truncate">
                            {t(res.title_ar, res.title_en || res.title_ar)}
                          </p>
                        </div>
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {/* Subscription CTA */}
              {(!currentVideoUrl || isPreview) && (
                <div className="academic-card bg-secondary/40">
                  <div className="flex items-center gap-2 mb-2">
                    <Lock className="w-4 h-4 text-muted-foreground" strokeWidth={1.5} />
                    <h3 className="font-medium text-foreground text-sm">
                      {t('هذا المحتوى مخصص للمشتركين', 'Subscriber Content')}
                    </h3>
                  </div>
                  <p className="text-xs text-muted-foreground mb-3">
                    {t(
                      'سجّل في هذه المادة للحصول على جميع الدروس والمحتوى التعليمي',
                      'Enroll in this course to access all lessons and content'
                    )}
                  </p>
                  <Link to={isAuthenticated ? '/student/marketplace' : '/register'}>
                    <Button className="w-full" size="sm">
                      {isAuthenticated ? t('تصفح المتجر', 'Browse Marketplace') : t('إنشاء حساب', 'Create Account')}
                    </Button>
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>
    </Layout>
  );
};

export default LessonPage;
