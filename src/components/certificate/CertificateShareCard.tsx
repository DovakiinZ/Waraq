import { useRef, useCallback } from 'react';
import { toPng } from 'html-to-image';
import type { Certificate } from '@/types/database';

interface Props {
    certificate: Certificate;
    verifyUrl: string;
    onImageGenerated?: (dataUrl: string) => void;
}

/**
 * Hidden 1200x630 OG share card rendered off-screen.
 * Call generateImage() via ref to produce a downloadable PNG.
 */
export default function CertificateShareCard({ certificate, verifyUrl, onImageGenerated }: Props) {
    const cardRef = useRef<HTMLDivElement>(null);

    const generateImage = useCallback(async () => {
        if (!cardRef.current) return null;

        try {
            const dataUrl = await toPng(cardRef.current, {
                width: 1200,
                height: 630,
                pixelRatio: 2,
                backgroundColor: '#ffffff',
            });
            onImageGenerated?.(dataUrl);
            return dataUrl;
        } catch (err) {
            console.error('Share image generation failed:', err);
            return null;
        }
    }, [onImageGenerated]);

    // Expose generateImage for parent component
    (window as any).__generateCertShareImage = generateImage;

    const issueDate = new Date(certificate.issued_at).toLocaleDateString('ar-EG', {
        year: 'numeric', month: 'long', day: 'numeric',
    });

    return (
        <div style={{ position: 'fixed', left: '-9999px', top: '-9999px' }}>
            <div
                ref={cardRef}
                style={{
                    width: 1200,
                    height: 630,
                    background: 'linear-gradient(135deg, #0B3B2C 0%, #072419 50%, #1E6B52 100%)',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    alignItems: 'center',
                    fontFamily: 'system-ui, -apple-system, sans-serif',
                    color: '#ffffff',
                    padding: 60,
                    boxSizing: 'border-box',
                    position: 'relative',
                    overflow: 'hidden',
                }}
            >
                {/* Decorative elements */}
                <div style={{
                    position: 'absolute', top: -50, right: -50,
                    width: 200, height: 200,
                    background: 'rgba(212, 175, 55, 0.1)',
                    borderRadius: '50%',
                }} />
                <div style={{
                    position: 'absolute', bottom: -30, left: -30,
                    width: 150, height: 150,
                    background: 'rgba(212, 175, 55, 0.1)',
                    borderRadius: '50%',
                }} />

                {/* Gold border */}
                <div style={{
                    position: 'absolute', inset: 20,
                    border: '2px solid rgba(212, 175, 55, 0.4)',
                    borderRadius: 16,
                }} />

                {/* Academy name */}
                <p style={{
                    fontSize: 18, fontWeight: 500,
                    color: '#d4af37', letterSpacing: 2,
                    textTransform: 'uppercase', marginBottom: 16,
                }}>
                    AYMAN ACADEMY
                </p>

                {/* Certificate title */}
                <h1 style={{
                    fontSize: 42, fontWeight: 700,
                    color: '#d4af37', marginBottom: 24,
                    textAlign: 'center',
                }}>
                    شهادة إتمام
                </h1>

                {/* Student name */}
                <p style={{
                    fontSize: 36, fontWeight: 600,
                    color: '#ffffff', marginBottom: 12,
                    textAlign: 'center',
                }}>
                    {certificate.student_name}
                </p>

                {/* Course name */}
                <p style={{
                    fontSize: 22, fontWeight: 400,
                    color: '#94a3b8', marginBottom: 24,
                    textAlign: 'center',
                }}>
                    {certificate.course_name}
                </p>

                {/* Divider */}
                <div style={{
                    width: 100, height: 2,
                    background: 'linear-gradient(90deg, transparent, #d4af37, transparent)',
                    marginBottom: 20,
                }} />

                {/* Date + Score */}
                <div style={{ display: 'flex', gap: 40, alignItems: 'center' }}>
                    <p style={{ fontSize: 16, color: '#94a3b8' }}>
                        {issueDate}
                    </p>
                    {certificate.score !== null && (
                        <p style={{ fontSize: 16, color: '#d4af37', fontWeight: 600 }}>
                            %{certificate.score}
                        </p>
                    )}
                </div>

                {/* Verify URL */}
                <p style={{
                    position: 'absolute', bottom: 30,
                    fontSize: 12, color: '#64748b',
                }}>
                    {verifyUrl}
                </p>
            </div>
        </div>
    );
}

/** Helper: trigger download of a data URL */
export function downloadShareImage(dataUrl: string, filename: string) {
    const link = document.createElement('a');
    link.download = filename;
    link.href = dataUrl;
    link.click();
}

/** Helper: copy text to clipboard */
export function copyToClipboard(text: string): Promise<void> {
    return navigator.clipboard.writeText(text);
}

/** Helper: use native share API */
export async function nativeShare(title: string, text: string, url: string) {
    if (navigator.share) {
        await navigator.share({ title, text, url });
    }
}
