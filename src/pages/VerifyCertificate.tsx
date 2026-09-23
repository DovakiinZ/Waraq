import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/lib/supabase';
import type { Certificate } from '@/types/database';
import { Loader2, CheckCircle, XCircle, ShieldCheck, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import logo from '@/assets/logo.png';

export default function VerifyCertificate() {
    const { code } = useParams<{ code: string }>();
    const { t, direction } = useLanguage();
    const [certificate, setCertificate] = useState<Certificate | null>(null);
    const [loading, setLoading] = useState(true);
    const [notFound, setNotFound] = useState(false);
    const [newerCertCode, setNewerCertCode] = useState<string | null>(null);

    useEffect(() => {
        if (code) fetchCertificate();
    }, [code]);

    const fetchCertificate = async () => {
        const { data, error } = await supabase
            .from('certificates')
            .select('*')
            .eq('verification_code', code!)
            .single() as any;

        if (error || !data) {
            setNotFound(true);
        } else {
            const cert = data as Certificate;
            setCertificate(cert);

            // If revoked, check if a newer version exists
            if (cert.status === 'revoked') {
                const { data: newer } = await supabase
                    .from('certificates')
                    .select('verification_code')
                    .eq('reissued_from_id', cert.id)
                    .eq('status', 'issued')
                    .limit(1)
                    .single() as any;

                if (newer?.verification_code) {
                    setNewerCertCode(newer.verification_code);
                }
            }
        }
        setLoading(false);
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div dir={direction} className="min-h-screen bg-gradient-to-b from-slate-50 to-white flex flex-col">
            {/* Header */}
            <header className="bg-white border-b border-border shadow-sm">
                <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
                    <Link to="/" className="flex items-center gap-2">
                        <img src={logo} alt="Waraq Academy" className="h-10" />
                    </Link>
                    <div className="flex items-center gap-2 text-primary">
                        <ShieldCheck className="w-5 h-5" />
                        <span className="text-sm font-medium">
                            {t('التحقق من الشهادة', 'Certificate Verification')}
                        </span>
                    </div>
                </div>
            </header>

            {/* Content */}
            <main className="flex-1 flex items-center justify-center px-4 py-12">
                <div className="max-w-lg w-full">
                    {notFound ? (
                        <div className="bg-white rounded-2xl shadow-lg border border-border p-8 text-center">
                            <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-4">
                                <XCircle className="w-8 h-8 text-red-500" />
                            </div>
                            <h1 className="text-xl font-bold text-foreground mb-2">
                                {t('شهادة غير موجودة', 'Certificate Not Found')}
                            </h1>
                            <p className="text-sm text-muted-foreground mb-6">
                                {t(
                                    'لم يتم العثور على شهادة بهذا الرمز. تأكد من صحة الرابط.',
                                    'No certificate found with this code. Make sure the URL is correct.'
                                )}
                            </p>
                            <Link to="/">
                                <Button variant="outline" className="gap-2">
                                    {t('العودة للرئيسية', 'Go to Home')}
                                    <ArrowRight className="w-4 h-4" />
                                </Button>
                            </Link>
                        </div>
                    ) : certificate && (
                        <div className="bg-white rounded-2xl shadow-lg border border-border overflow-hidden">
                            {/* Status Banner */}
                            <div className={`px-6 py-4 text-center ${certificate.status === 'issued'
                                ? 'bg-green-50 border-b border-green-100'
                                : certificate.status === 'pending_approval'
                                    ? 'bg-amber-50 border-b border-amber-100'
                                    : 'bg-red-50 border-b border-red-100'
                                }`}>
                                <div className="flex items-center justify-center gap-2 mb-1">
                                    {certificate.status === 'issued' ? (
                                        <CheckCircle className="w-6 h-6 text-green-600" />
                                    ) : certificate.status === 'pending_approval' ? (
                                        <ShieldCheck className="w-6 h-6 text-amber-600" />
                                    ) : (
                                        <XCircle className="w-6 h-6 text-red-600" />
                                    )}
                                    <span className={`text-lg font-bold ${certificate.status === 'issued' ? 'text-green-700'
                                        : certificate.status === 'pending_approval' ? 'text-amber-700'
                                            : 'text-red-700'
                                        }`}>
                                        {certificate.status === 'issued'
                                            ? t('شهادة صالحة ✓', 'Valid Certificate ✓')
                                            : certificate.status === 'pending_approval'
                                                ? t('بانتظار الموافقة ⏳', 'Pending Approval ⏳')
                                                : t('شهادة ملغاة ✗', 'Revoked Certificate ✗')
                                        }
                                    </span>
                                </div>
                                <p className="text-xs text-muted-foreground mt-1">
                                    {t('رمز التحقق:', 'Verification Code:')} {code}
                                </p>
                                {certificate.version > 1 && (
                                    <div className="mt-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                        {t('الإصدار', 'Version')} {certificate.version}
                                    </div>
                                )}
                                {/* Newer version redirect for revoked certs */}
                                {certificate.status === 'revoked' && newerCertCode && (
                                    <div className="mt-3">
                                        <Link to={`/verify/${newerCertCode}`}>
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                className="gap-2 text-xs border-blue-200 text-blue-600 hover:bg-blue-50"
                                            >
                                                {t('عرض الإصدار الأحدث', 'View Newer Version')}
                                                <ArrowRight className="w-3.5 h-3.5" />
                                            </Button>
                                        </Link>
                                    </div>
                                )}
                            </div>

                            {/* Certificate Details */}
                            <div className="p-6 space-y-5">
                                <DetailRow
                                    label={t('اسم الطالب/ة', 'Student Name')}
                                    value={certificate.snapshot_json?.student_name || certificate.student_name}
                                />
                                <DetailRow
                                    label={t('الدورة / الدرس', 'Course / Lesson')}
                                    value={certificate.snapshot_json?.course_name || certificate.course_name}
                                />
                                {certificate.subject_name && (
                                    <DetailRow
                                        label={t('المادة', 'Subject')}
                                        value={certificate.subject_name}
                                    />
                                )}
                                {(certificate.snapshot_json?.score != null || certificate.score !== null) && (
                                    <DetailRow
                                        label={t('الدرجة', 'Score')}
                                        value={`${certificate.snapshot_json?.score ?? certificate.score}%`}
                                    />
                                )}
                                {certificate.snapshot_json?.average_rating != null && (
                                    <DetailRow
                                        label={t('التقييم', 'Rating')}
                                        value={`${certificate.snapshot_json.average_rating}/5`}
                                    />
                                )}
                                <DetailRow
                                    label={t('تاريخ الإتمام', 'Completion Date')}
                                    value={new Date(certificate.snapshot_json?.completion_date || certificate.issued_at).toLocaleDateString(t('ar-EG', 'en-US'), {
                                        year: 'numeric',
                                        month: 'long',
                                        day: 'numeric',
                                    })}
                                />
                                {(certificate.snapshot_json?.teacher_name || certificate.course_name) && (
                                    <DetailRow
                                        label={t('المعلم', 'Teacher')}
                                        value={certificate.snapshot_json?.teacher_name || certificate.course_name}
                                    />
                                )}
                                {certificate.snapshot_json?.teacher_remarks && (
                                    <DetailRow
                                        label={t('ملاحظات المعلم', 'Teacher Remarks')}
                                        value={certificate.snapshot_json.teacher_remarks}
                                    />
                                )}
                            </div>

                            {/* Footer */}
                            <div className="bg-slate-50 px-6 py-4 border-t border-border text-center">
                                <p className="text-xs text-muted-foreground">
                                    {t(
                                        'تم إصدار هذه الشهادة من ورق أكاديمي التعليمية',
                                        'Issued by Waraq Academy'
                                    )}
                                </p>
                            </div>
                        </div>
                    )}
                </div>
            </main>

            {/* Footer */}
            <footer className="bg-white border-t border-border py-4 text-center">
                <p className="text-xs text-muted-foreground">
                    © {new Date().getFullYear()} {t('ورق أكاديمي التعليمية', 'Waraq Academy')}
                </p>
            </footer>
        </div>
    );
}

function DetailRow({ label, value }: { label: string; value: string }) {
    return (
        <div className="flex justify-between items-center border-b border-border/50 pb-3 last:border-b-0">
            <span className="text-sm text-muted-foreground">{label}</span>
            <span className="text-sm font-medium text-foreground">{value}</span>
        </div>
    );
}
