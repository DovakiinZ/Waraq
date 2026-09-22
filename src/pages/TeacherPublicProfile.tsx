import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useLanguage } from '@/contexts/LanguageContext';
import Layout from '@/components/layout/Layout';
import { User, BookOpen, GraduationCap, ChevronLeft, ChevronRight, Loader2, PlayCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { Profile, Stage, Lesson } from '@/types/database';

export default function TeacherPublicProfile() {
    const { id } = useParams<{ id: string }>();
    const { t, direction, language } = useLanguage();
    // Only the publicly-granted columns are selected here (see migration 104),
    // so this is a subset of Profile, not a whole one.
    type PublicTeacher = Partial<Profile> & Pick<Profile, 'id' | 'full_name'>;
    const [teacher, setTeacher] = useState<PublicTeacher | null>(null);
    const [stages, setStages] = useState<Stage[]>([]);
    const [lessons, setLessons] = useState<Lesson[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (id) {
            fetchTeacherData();
        }
    }, [id]);

    const fetchTeacherData = async () => {
        setLoading(true);
        try {
            // 1. Fetch Teacher Profile
            // Explicit column list, not '*': anonymous visitors are not granted
            // SELECT on email / shamcash_account_* (see migration 104), and a
            // '*' expansion would be refused for them outright.
            const { data: profileData, error: profileError } = await supabase
                .from('profiles')
                .select('id, full_name, avatar_url, bio_ar, bio_en, role, is_active, social_links, expertise_tags_ar, expertise_tags_en, home_order, show_on_home, created_at')
                .eq('id', id)
                .single();

            if (profileError || !profileData) throw profileError;
            setTeacher(profileData as PublicTeacher);

            // 2. Fetch Assigned Stages
            // NOTE: `featured_stages` is not a column on profiles in the live
            // database, so this branch never runs. Left in place rather than
            // silently dropping the feature — add the column if it is wanted.
            if ((profileData as any).featured_stages && (profileData as any).featured_stages.length > 0) {
                const { data: stagesData } = await supabase
                    .from('stages')
                    .select('*')
                    .in('id', (profileData as any).featured_stages);
                setStages((stagesData as Stage[]) || []);
            }

            // 3. Fetch Free Lessons by this teacher
            const { data: lessonsData } = await supabase
                .from('lessons')
                .select('*, subject:subjects(title_ar, title_en)')
                .eq('created_by', id)
                .eq('is_published', true)
                .eq('is_free_preview', true)
                .order('created_at', { ascending: false });

            setLessons((lessonsData as any[]) || []);

        } catch (error) {
            console.error('Error fetching teacher data:', error);
        } finally {
            setLoading(false);
        }
    };

    const ChevronIcon = direction === 'rtl' ? ChevronLeft : ChevronRight;

    if (loading) {
        return (
            <Layout>
                <div className="flex items-center justify-center min-h-[60vh]">
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </div>
            </Layout>
        );
    }

    if (!teacher) {
        return (
            <Layout>
                <div className="container-academic py-20 text-center">
                    <h1 className="text-2xl font-bold mb-4">{t('المعلم غير موجود', 'Teacher Not Found')}</h1>
                    <Link to="/">
                        <Button variant="outline">{t('العودة للرئيسية', 'Back to Home')}</Button>
                    </Link>
                </div>
            </Layout>
        );
    }

    return (
        <Layout>
            {/* Header / Profile Info */}
            <section className="bg-secondary/30 py-12 border-b border-border">
                <div className="container-academic">
                    <div className="flex flex-col md:flex-row items-center md:items-start gap-8">
                        {/* Avatar */}
                        <div className="w-32 h-32 md:w-40 md:h-40 rounded-full bg-secondary overflow-hidden border-4 border-background shadow-lg flex-shrink-0">
                            {teacher.avatar_url ? (
                                <img
                                    src={teacher.avatar_url}
                                    alt={teacher.full_name || ''}
                                    className="w-full h-full object-cover"
                                />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center">
                                    <User className="w-16 h-16 text-muted-foreground" />
                                </div>
                            )}
                        </div>

                        {/* Text Info */}
                        <div className="flex-1 text-center md:text-start">
                            <h1 className="text-3xl font-bold text-foreground mb-2">
                                {teacher.full_name}
                            </h1>
                            <div className="flex flex-wrap justify-center md:justify-start gap-2 mb-4">
                                {(((language === 'ar' ? (teacher as any).expertise_tags_ar : (teacher as any).expertise_tags_en) || (teacher as any).expertise_tags_ar || []) as string[]).map((tag, i) => (
                                    <Badge key={i} variant="secondary" className="px-3 py-1">
                                        {tag}
                                    </Badge>
                                ))}
                            </div>
                            <p className="text-muted-foreground max-w-2xl leading-relaxed">
                                {t(teacher.bio_ar || '', teacher.bio_en || teacher.bio_ar || '')}
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            {/* Stages and Lessons */}
            <section className="section-academic">
                <div className="container-academic">
                    <div className="grid lg:grid-cols-3 gap-10">
                        {/* Left Column: Stages */}
                        <div className="lg:col-span-1 space-y-6">
                            <div className="bg-background rounded-xl border border-border p-6 shadow-sm">
                                <h3 className="text-lg font-semibold mb-6 flex items-center gap-2">
                                    <GraduationCap className="w-5 h-5 text-primary" />
                                    {t('المراحل الدراسية', 'Educational Stages')}
                                </h3>
                                <div className="space-y-3">
                                    {stages.map(stage => (
                                        <Link
                                            key={stage.id}
                                            to={`/stages/${stage.slug}`}
                                            className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-secondary/50 transition-colors group"
                                        >
                                            <span className="font-medium">{t(stage.title_ar, stage.title_en || stage.title_ar)}</span>
                                            <ChevronIcon className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                                        </Link>
                                    ))}
                                    {stages.length === 0 && (
                                        <p className="text-sm text-muted-foreground italic">
                                            {t('لم يتم تحديد مراحل بعد', 'No stages assigned yet')}
                                        </p>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Right Column: Lessons */}
                        <div className="lg:col-span-2 space-y-6">
                            <h3 className="text-2xl font-bold flex items-center gap-2">
                                <BookOpen className="w-6 h-6 text-primary" />
                                {t('الدروس المجانية', 'Free Lessons')}
                            </h3>

                            <div className="grid sm:grid-cols-2 gap-4">
                                {lessons.map(lesson => (
                                    <Link
                                        key={lesson.id}
                                        to={`/lesson/${lesson.id}`}
                                        className="academic-card group hover:border-primary/50"
                                    >
                                        <div className="flex flex-col h-full">
                                            <div className="mb-3">
                                                <Badge variant="outline" className="text-[10px] mb-2">
                                                    {t((lesson as any).subject?.title_ar || '', (lesson as any).subject?.title_en || '')}
                                                </Badge>
                                                <h4 className="font-medium line-clamp-2 group-hover:text-primary transition-colors">
                                                    {t(lesson.title_ar, lesson.title_en || lesson.title_ar)}
                                                </h4>
                                            </div>
                                            <div className="mt-auto flex items-center justify-between text-xs text-muted-foreground">
                                                <span className="flex items-center gap-1">
                                                    <PlayCircle className="w-3 h-3" />
                                                    {t('درس مجاني', 'Free Lesson')}
                                                </span>
                                                <Button size="sm" variant="ghost" className="h-8 group-hover:bg-primary group-hover:text-white">
                                                    {t('شاهد الآن', 'Watch Now')}
                                                </Button>
                                            </div>
                                        </div>
                                    </Link>
                                ))}

                                {lessons.length === 0 && (
                                    <div className="col-span-full py-12 text-center bg-secondary/20 rounded-xl border border-dashed border-border">
                                        <p className="text-muted-foreground">
                                            {t('لا توجد دروس مجانية متاحة حالياً لهذا المعلم', 'No free lessons currently available for this teacher')}
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </section>
        </Layout>
    );
}
