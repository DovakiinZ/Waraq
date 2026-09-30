import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/lib/supabase';
import {
    generateQRDataUrl,
    generateCertificatePDF,
    uploadCertificatePDF,
    updateCertificatePdfUrl,
    studentRequestReissueViaRPC,
    fetchLatestCertificateVersion,
} from '@/lib/certificateGenerator';
import {
    resolveTokensFromSnapshot,
    resolveTokensLive,
    hasDataChanged,
    type ResolvedTokenData,
} from '@/lib/certificateTokens';
import CertificateTemplate from '@/components/certificate/CertificateTemplate';
import type { Certificate } from '@/types/database';
import { Loader2, Download, ExternalLink, Award, FileCheck, CalendarDays, Share2, Copy, Linkedin, Twitter, RefreshCw, Eye, AlertTriangle, ArrowRight, Star, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
// The certificate is a printed document carrying the brand, so it uses the
// Waraq mark from public/brand, not the pre-rebrand PNG.
const logo = '/brand/mark.svg';

export default function MyCertificates() {
    const { t } = useLanguage();
    const { profile } = useAuth();
    const [certificates, setCertificates] = useState<Certificate[]>([]);
    const [loading, setLoading] = useState(true);
    const [generating, setGenerating] = useState<string | null>(null);
    const [reissuing, setReissuing] = useState<string | null>(null);
    const [reissueConfirmCert, setReissueConfirmCert] = useState<Certificate | null>(null);

    // Live preview state
    const [livePreviewId, setLivePreviewId] = useState<string | null>(null);
    const [liveData, setLiveData] = useState<ResolvedTokenData | null>(null);
    const [dataChangedMap, setDataChangedMap] = useState<Record<string, boolean>>({});

    // Hidden certificate renderer
    const certRef = useRef<HTMLDivElement>(null);
    const [renderCert, setRenderCert] = useState<Certificate | null>(null);
    const [renderQR, setRenderQR] = useState<string>('');
    const [renderData, setRenderData] = useState<ResolvedTokenData | null>(null);

    useEffect(() => {
        if (profile?.id) fetchCertificates();
    }, [profile?.id]);

    const fetchCertificates = async () => {
        // Fetch all certificates including revoked (to show superseded links)
        const { data, error } = await supabase
            .from('certificates')
            .select('*')
            .eq('student_id', profile!.id)
            .order('issued_at', { ascending: false }) as any;

        if (error) {
            console.error('Error fetching certificates:', error);
        } else {
            const certs = (data || []) as Certificate[];
            setCertificates(certs);

            // Check which issued certs have changed data
            checkForDataChanges(certs.filter(c => c.status === 'issued'));
        }
        setLoading(false);
    };

    const checkForDataChanges = async (issuedCerts: Certificate[]) => {
        const changes: Record<string, boolean> = {};
        for (const cert of issuedCerts) {
            try {
                const snapshotData = resolveTokensFromSnapshot(cert);
                const live = await resolveTokensLive(cert);
                changes[cert.id] = hasDataChanged(snapshotData, live);
            } catch {
                changes[cert.id] = false;
            }
        }
        setDataChangedMap(changes);
    };

    const handleDownload = useCallback(async (cert: Certificate) => {
        // Mobile-safe download: use a synthesized <a download> click instead of
        // window.open(), which mobile browsers (Safari, PWA standalone) block
        // when called after async work.
        const triggerDownload = (href: string, filename: string, revoke = false) => {
            const a = document.createElement('a');
            a.href = href;
            a.download = filename;
            a.target = '_blank';
            a.rel = 'noopener noreferrer';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            if (revoke) setTimeout(() => URL.revokeObjectURL(href), 1000);
        };

        const filename = `certificate-${cert.verification_code}.pdf`;

        // If PDF already exists, just download it
        if (cert.pdf_url) {
            triggerDownload(cert.pdf_url, filename);
            return;
        }

        // Generate PDF on-the-fly (always from snapshot — official mode)
        setGenerating(cert.id);
        try {
            const verifyUrl = `${window.location.origin}/verify/${cert.verification_code}`;
            const qrDataUrl = await generateQRDataUrl(verifyUrl);
            const data = resolveTokensFromSnapshot(cert);

            setRenderCert(cert);
            setRenderQR(qrDataUrl);
            setRenderData(data);

            // Wait for the off-screen template to mount AND fonts to load.
            // Slow mobile networks need this — without it, Arabic glyphs
            // render as fallback boxes in the PDF.
            await new Promise(resolve => setTimeout(resolve, 300));
            if (typeof document !== 'undefined' && (document as any).fonts?.ready) {
                try { await (document as any).fonts.ready; } catch { /* ignore */ }
            }

            if (!certRef.current) {
                toast.error(t('فشل إنشاء الشهادة', 'Failed to generate certificate'));
                return;
            }

            const pdfBlob = await generateCertificatePDF(certRef.current);
            const pdfUrl = await uploadCertificatePDF(pdfBlob, cert.id);

            if (pdfUrl) {
                await updateCertificatePdfUrl(cert.id, pdfUrl);
                setCertificates(prev =>
                    prev.map(c => c.id === cert.id ? { ...c, pdf_url: pdfUrl } : c)
                );
                triggerDownload(pdfUrl, filename);
            } else {
                const blobUrl = URL.createObjectURL(pdfBlob);
                triggerDownload(blobUrl, filename, true);
            }

            toast.success(t('تم تحميل الشهادة', 'Certificate downloaded'));
        } catch (error) {
            console.error('PDF generation error:', error);
            toast.error(t('فشل إنشاء الشهادة', 'Failed to generate certificate'));
        } finally {
            setGenerating(null);
            setRenderCert(null);
            setRenderData(null);
        }
    }, [t]);

    const handleLivePreview = useCallback(async (cert: Certificate) => {
        if (livePreviewId === cert.id) {
            // Toggle off
            setLivePreviewId(null);
            setLiveData(null);
            return;
        }

        setLivePreviewId(cert.id);
        try {
            const live = await resolveTokensLive(cert);
            setLiveData(live);
        } catch (error) {
            console.error('Error loading live preview:', error);
            toast.error(t('فشل تحميل المعاينة الحية', 'Failed to load live preview'));
            setLivePreviewId(null);
        }
    }, [livePreviewId, t]);

    const handleReissueConfirm = useCallback(async () => {
        if (!reissueConfirmCert) return;
        const cert = reissueConfirmCert;
        setReissueConfirmCert(null);
        setReissuing(cert.id);

        try {
            const result = await studentRequestReissueViaRPC(cert.id);

            if (result.error) {
                if (result.status === 'rate_limited') {
                    toast.error(t(
                        'تم تجاوز الحد الأقصى: يمكنك تحديث شهادتين كحد أقصى يومياً',
                        'Rate limit exceeded: maximum 2 certificate updates per day'
                    ));
                } else {
                    toast.error(result.error);
                }
                return;
            }

            toast.success(t(
                `تم تحديث الشهادة بنجاح (الإصدار ${result.newVersion || ''})`,
                `Certificate updated successfully (v${result.newVersion || ''})`
            ));

            // Refresh certificates
            fetchCertificates();
        } catch (error: any) {
            toast.error(error.message || t('فشل تحديث الشهادة', 'Failed to update certificate'));
        } finally {
            setReissuing(null);
        }
    }, [reissueConfirmCert, t]);

    const handleViewLatest = useCallback(async (cert: Certificate) => {
        try {
            const latest = await fetchLatestCertificateVersion(cert.id);
            if (latest && latest.id !== cert.id) {
                // Scroll to the latest cert in the list or open verify
                window.open(`/verify/${latest.verification_code}`, '_blank');
            }
        } catch {
            toast.error(t('فشل العثور على الإصدار الأخير', 'Failed to find latest version'));
        }
    }, [t]);

    // Separate issued & revoked
    const issuedCerts = certificates.filter(c => c.status !== 'revoked');
    const revokedCerts = certificates.filter(c => c.status === 'revoked');

    if (loading) {
        return (
            <div className="flex justify-center items-center py-20">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold text-foreground flex items-center gap-3">
                    <Award className="w-7 h-7 text-primary" />
                    {t('شهاداتي', 'My Certificates')}
                </h1>
                <p className="text-muted-foreground text-sm mt-1">
                    {t('جميع شهادات الإتمام التي حصلت عليها', 'All completion certificates you have earned')}
                </p>
            </div>

            {issuedCerts.length === 0 && revokedCerts.length === 0 ? (
                <div className="text-center py-16 bg-card rounded-xl border border-border">
                    <Award className="w-16 h-16 text-muted-foreground/20 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-foreground mb-2">
                        {t('لا توجد شهادات بعد', 'No Certificates Yet')}
                    </h3>
                    <p className="text-sm text-muted-foreground max-w-md mx-auto">
                        {t(
                            'أكمل الدروس واجتز الاختبارات للحصول على شهادات إتمام رسمية.',
                            'Complete lessons and pass quizzes to earn official completion certificates.'
                        )}
                    </p>
                </div>
            ) : (
                <>
                    {/* Active Certificates */}
                    {issuedCerts.length > 0 && (
                        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                            {issuedCerts.map(cert => (
                                <CertificateCard
                                    key={cert.id}
                                    cert={cert}
                                    t={t}
                                    generating={generating}
                                    reissuing={reissuing}
                                    dataChanged={dataChangedMap[cert.id] || false}
                                    isLivePreview={livePreviewId === cert.id}
                                    liveData={livePreviewId === cert.id ? liveData : null}
                                    onDownload={handleDownload}
                                    onLivePreview={handleLivePreview}
                                    onReissue={() => setReissueConfirmCert(cert)}
                                />
                            ))}
                        </div>
                    )}

                    {/* Revoked / Superseded Certificates */}
                    {revokedCerts.length > 0 && (
                        <div className="space-y-3">
                            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                                {t('شهادات سابقة (تم استبدالها)', 'Previous Certificates (Superseded)')}
                            </h2>
                            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                                {revokedCerts.map(cert => (
                                    <div
                                        key={cert.id}
                                        className="bg-card/50 rounded-xl border border-border/50 overflow-hidden opacity-60 hover:opacity-80 transition-opacity"
                                    >
                                        <div className="px-5 py-3 border-b border-border/50">
                                            <div className="flex items-start justify-between">
                                                <div className="flex-1 min-w-0">
                                                    <h3 className="font-medium text-foreground truncate text-sm">
                                                        {cert.snapshot_json?.course_name || cert.course_name}
                                                    </h3>
                                                    <div className="flex items-center gap-2 mt-0.5">
                                                        {cert.version > 1 && (
                                                            <span className="text-[10px] font-bold text-slate-400 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded uppercase tracking-widest">
                                                                v{cert.version}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                                <Badge variant="destructive" className="shrink-0 ms-2 text-[10px]">
                                                    {t('تم استبدالها', 'Superseded')}
                                                </Badge>
                                            </div>
                                        </div>
                                        <div className="px-5 py-3">
                                            <Button
                                                size="sm"
                                                variant="ghost"
                                                className="gap-1.5 text-xs w-full"
                                                onClick={() => handleViewLatest(cert)}
                                            >
                                                <ArrowRight className="w-3 h-3" />
                                                {t('عرض الإصدار الأخير', 'View Latest Version')}
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </>
            )}

            {/* Reissue Confirmation Dialog */}
            <AlertDialog open={!!reissueConfirmCert} onOpenChange={() => setReissueConfirmCert(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>{t('تحديث الشهادة', 'Update Certificate')}</AlertDialogTitle>
                        <AlertDialogDescription>
                            {t(
                                'سيتم إنشاء إصدار جديد من الشهادة ببياناتك الحالية. الإصدار القديم سيتم إلغاؤه تلقائياً. هل تريد المتابعة؟',
                                'A new version of the certificate will be created with your current data. The old version will be automatically revoked. Continue?'
                            )}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>{t('إلغاء', 'Cancel')}</AlertDialogCancel>
                        <AlertDialogAction onClick={handleReissueConfirm}>
                            {t('تحديث', 'Update')}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* Hidden renderer for PDF generation */}
            {renderCert && (
                <div style={{ position: 'fixed', left: '-9999px', top: 0 }}>
                    <CertificateTemplate
                        ref={certRef}
                        studentName={renderData?.student_name || renderCert.snapshot_json?.student_name || renderCert.student_name}
                        courseName={renderData?.course_name || renderCert.snapshot_json?.course_name || renderCert.course_name}
                        subjectName={renderCert.subject_name || undefined}
                        score={renderCert.snapshot_json?.score ?? (renderCert.score || undefined)}
                        issuedDate={renderCert.snapshot_json?.completion_date || renderCert.issued_at || new Date().toISOString()}
                        certificateId={renderCert.id}
                        verificationCode={renderCert.verification_code}
                        qrDataUrl={renderQR}
                        logoUrl={logo}
                        signerName={renderData?.signer_name || renderCert.snapshot_json?.signer_name}
                    />
                </div>
            )}
        </div>
    );
}

// ============================================
// CERTIFICATE CARD COMPONENT
// ============================================

interface CertificateCardProps {
    cert: Certificate;
    t: (ar: string, en: string) => string;
    generating: string | null;
    reissuing: string | null;
    dataChanged: boolean;
    isLivePreview: boolean;
    liveData: ResolvedTokenData | null;
    onDownload: (cert: Certificate) => void;
    onLivePreview: (cert: Certificate) => void;
    onReissue: () => void;
}

function CertificateCard({
    cert, t, generating, reissuing, dataChanged,
    isLivePreview, liveData, onDownload, onLivePreview, onReissue,
}: CertificateCardProps) {
    const snapshotData = resolveTokensFromSnapshot(cert);
    const displayData = isLivePreview && liveData ? liveData : snapshotData;

    return (
        <div className="bg-card rounded-xl border border-border overflow-hidden shadow-sm hover:shadow-md transition-shadow">
            {/* Card Header */}
            <div className="bg-gradient-to-l from-primary/5 to-primary/10 px-5 py-4 border-b border-border">
                <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-foreground truncate">
                            {displayData.course_name}
                        </h3>
                        <div className="flex items-center gap-2 mt-0.5">
                            {cert.subject_name && (
                                <p className="text-xs text-muted-foreground truncate">
                                    {cert.subject_name}
                                </p>
                            )}
                            {cert.version > 1 && (
                                <span className="text-[10px] font-bold text-slate-400 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded uppercase tracking-widest">
                                    v{cert.version}
                                </span>
                            )}
                        </div>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0 ms-2">
                        {isLivePreview && (
                            <Badge variant="outline" className="text-[10px] border-blue-300 text-blue-600 dark:text-blue-400">
                                {t('حيّ', 'Live')}
                            </Badge>
                        )}
                        <Badge
                            variant={
                                (cert.status === 'issued' || cert.status === 'valid') ? 'default'
                                    : cert.status === 'pending_approval' ? 'secondary'
                                        : cert.status === 'revoked' ? 'destructive'
                                            : 'outline'
                            }
                        >
                            {(cert.status === 'issued' || cert.status === 'valid')
                                ? t('صادرة', 'Issued')
                                : cert.status === 'pending_approval'
                                    ? t('بانتظار الموافقة', 'Pending')
                                    : cert.status === 'revoked'
                                        ? t('ملغاة', 'Revoked')
                                        : cert.status === 'eligible'
                                            ? t('مؤهل', 'Eligible')
                                            : t('مسودة', 'Draft')
                            }
                        </Badge>
                    </div>
                </div>
            </div>

            {/* Card Body */}
            <div className="p-5 space-y-3">
                {/* Student name (shows live changes) */}
                <div className="flex items-center gap-2 text-sm">
                    <Award className="w-4 h-4 shrink-0 text-muted-foreground" />
                    <span className="text-foreground font-medium">{displayData.student_name}</span>
                    {isLivePreview && liveData && snapshotData.student_name !== liveData.student_name && (
                        <span className="text-[10px] text-orange-500 font-medium">
                            ({t('تم التحديث', 'Updated')})
                        </span>
                    )}
                </div>

                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <CalendarDays className="w-4 h-4 shrink-0" />
                    {displayData.date || new Date(cert.snapshot_json?.completion_date || cert.issued_at).toLocaleDateString(t('ar-EG', 'en-US'), {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                    })}
                </div>

                {(displayData.score || cert.score !== null) && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <FileCheck className="w-4 h-4 shrink-0" />
                        {t('الدرجة:', 'Score:')} <strong className="text-foreground">{displayData.score || `${cert.score}%`}</strong>
                    </div>
                )}

                {displayData.average_rating && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Star className="w-4 h-4 shrink-0 text-amber-500" />
                        {t('التقييم:', 'Rating:')} <strong className="text-foreground">{displayData.average_rating}/5</strong>
                    </div>
                )}

                {displayData.teacher_remarks && (
                    <div className="flex items-start gap-2 text-sm text-muted-foreground">
                        <MessageSquare className="w-4 h-4 shrink-0 mt-0.5" />
                        <span className="text-foreground text-xs line-clamp-2">{displayData.teacher_remarks}</span>
                    </div>
                )}

                {/* Action buttons */}
                <div className="grid grid-cols-2 gap-2 pt-2">
                    {/* Download Official PDF */}
                    <Button
                        size="sm"
                        className="gap-1.5 h-9"
                        onClick={() => onDownload(cert)}
                        disabled={generating === cert.id || cert.status === 'revoked'}
                    >
                        {generating === cert.id ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                            <Download className="w-3.5 h-3.5" />
                        )}
                        {t('تحميل', 'Download')}
                    </Button>

                    {/* Update Certificate (Reissue) */}
                    {cert.status === 'issued' && (
                        <Button
                            size="sm"
                            variant={dataChanged ? 'default' : 'outline'}
                            className={`gap-1.5 h-9 ${dataChanged ? 'bg-amber-600 hover:bg-amber-700 text-white' : ''}`}
                            onClick={onReissue}
                            disabled={reissuing === cert.id}
                        >
                            {reissuing === cert.id ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                                <RefreshCw className="w-3.5 h-3.5" />
                            )}
                            {t('تحديث', 'Update')}
                        </Button>
                    )}

                    {/* Actions Row */}
                    <div className="col-span-2 flex gap-2">
                        {/* Live Preview Toggle */}
                        {cert.status === 'issued' && (
                            <Button
                                size="sm"
                                variant={isLivePreview ? 'secondary' : 'ghost'}
                                className="flex-1 gap-1.5 h-9"
                                onClick={() => onLivePreview(cert)}
                            >
                                <Eye className="w-3.5 h-3.5" />
                                <span className="text-xs">{t('معاينة', 'Preview')}</span>
                            </Button>
                        )}

                        {/* Share Dropdown */}
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button size="sm" variant="ghost" className="flex-1 gap-1.5 h-9">
                                    <Share2 className="w-3.5 h-3.5" />
                                    <span className="text-xs">{t('مشاركة', 'Share')}</span>
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuItem
                                    onClick={() => {
                                        const url = `${window.location.origin}/verify/${cert.verification_code}`;
                                        navigator.clipboard.writeText(url);
                                        toast.success(t('تم نسخ الرابط!', 'Link copied!'));
                                    }}
                                    className="gap-2"
                                >
                                    <Copy className="w-4 h-4" />
                                    {t('نسخ رابط التحقق', 'Copy verification link')}
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                    onClick={() => {
                                        const url = `${window.location.origin}/verify/${cert.verification_code}`;
                                        window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`, '_blank');
                                    }}
                                    className="gap-2"
                                >
                                    <Linkedin className="w-4 h-4" />
                                    {t('مشاركة على LinkedIn', 'Share on LinkedIn')}
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                    onClick={() => {
                                        const url = `${window.location.origin}/verify/${cert.verification_code}`;
                                        const text = t(`لقد حصلت للتو على شهادة في ${cert.course_name}!`, `I just earned a certificate in ${cert.course_name}!`);
                                        window.open(`https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`, '_blank');
                                    }}
                                    className="gap-2"
                                >
                                    <Twitter className="w-4 h-4" />
                                    {t('مشاركة على X', 'Share on X')}
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>

                        {/* Verify Link */}
                        <Button
                            size="sm"
                            variant="ghost"
                            className="h-9 w-10 p-0 shrink-0"
                            onClick={() => window.open(`/verify/${cert.verification_code}`, '_blank')}
                            title={t('تحقق', 'Verify')}
                        >
                            <ExternalLink className="w-3.5 h-3.5" />
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}
