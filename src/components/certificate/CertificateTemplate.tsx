import { useRef, forwardRef } from 'react';

interface CertificateTemplateProps {
    studentName: string;
    courseName: string;
    subjectName?: string;
    score?: number;
    issuedDate: string;
    certificateId: string;
    verificationCode: string;
    qrDataUrl?: string;
    signerName?: string;
    signerRole?: string;
    logoUrl?: string;
}

const CertificateTemplate = forwardRef<HTMLDivElement, CertificateTemplateProps>(({
    studentName,
    courseName,
    subjectName,
    score,
    issuedDate,
    certificateId,
    verificationCode,
    qrDataUrl,
    signerName = 'أ. أيمن',
    signerRole = 'مدير الأكاديمية',
    logoUrl,
}, ref) => {
    const verifyUrl = `${window.location.origin}/verify/${verificationCode}`;

    return (
        <div
            ref={ref}
            dir="rtl"
            style={{
                width: '297mm',
                height: '210mm',
                background: '#ffffff',
                position: 'relative',
                overflow: 'hidden',
                fontFamily: "'IBM Plex Sans Arabic', 'Segoe UI', Tahoma, sans-serif",
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '20mm 25mm',
                boxSizing: 'border-box',
            }}
        >
            {/* Decorative Border */}
            <div style={{
                position: 'absolute',
                inset: '8mm',
                border: '3px solid #1e3a5f',
                borderRadius: '4px',
                pointerEvents: 'none',
            }} />
            <div style={{
                position: 'absolute',
                inset: '11mm',
                border: '1px solid #3b82f6',
                borderRadius: '2px',
                pointerEvents: 'none',
            }} />

            {/* Corner Ornaments */}
            {['top-left', 'top-right', 'bottom-left', 'bottom-right'].map((corner) => (
                <div key={corner} style={{
                    position: 'absolute',
                    width: '35mm',
                    height: '35mm',
                    ...(corner.includes('top') ? { top: '12mm' } : { bottom: '12mm' }),
                    ...(corner.includes('right') ? { right: '12mm' } : { left: '12mm' }),
                    borderTop: corner.includes('top') ? '2px solid #1e3a5f' : 'none',
                    borderBottom: corner.includes('bottom') ? '2px solid #1e3a5f' : 'none',
                    borderRight: corner.includes('right') ? '2px solid #1e3a5f' : 'none',
                    borderLeft: corner.includes('left') ? '2px solid #1e3a5f' : 'none',
                    borderRadius: '2px',
                    opacity: 0.6,
                }} />
            ))}

            {/* Subtle background pattern */}
            <div style={{
                position: 'absolute',
                inset: 0,
                background: 'radial-gradient(circle at 50% 50%, rgba(59,130,246,0.03) 0%, transparent 70%)',
                pointerEvents: 'none',
            }} />

            {/* Content */}
            <div style={{
                position: 'relative',
                zIndex: 1,
                textAlign: 'center',
                width: '100%',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '6mm',
            }}>
                {/* Logo */}
                {logoUrl && (
                    <img
                        src={logoUrl}
                        alt="Academy Logo"
                        style={{ height: '18mm', objectFit: 'contain' }}
                    />
                )}

                {/* Academy Name */}
                <div style={{
                    fontSize: '14pt',
                    color: '#1e3a5f',
                    fontWeight: 600,
                    letterSpacing: '2px',
                }}>
                    ورق أكاديمي التعليمية
                </div>

                {/* Title */}
                <div style={{
                    fontSize: '32pt',
                    fontWeight: 700,
                    color: '#1e3a5f',
                    lineHeight: 1.2,
                }}>
                    شهادة إتمام
                </div>

                {/* Subtitle */}
                <div style={{
                    fontSize: '11pt',
                    color: '#6b7280',
                    maxWidth: '180mm',
                }}>
                    تشهد ورق أكاديمي التعليمية بأن الطالب/ة
                </div>

                {/* Student Name */}
                <div style={{
                    fontSize: '28pt',
                    fontWeight: 700,
                    color: '#1e3a5f',
                    borderBottom: '2px solid #3b82f6',
                    paddingBottom: '3mm',
                    paddingLeft: '15mm',
                    paddingRight: '15mm',
                    minWidth: '120mm',
                }}>
                    {studentName}
                </div>

                {/* Completion Text */}
                <div style={{
                    fontSize: '12pt',
                    color: '#374151',
                    lineHeight: 1.8,
                }}>
                    قد أتم/ت بنجاح دراسة
                </div>

                {/* Course Name */}
                <div style={{
                    fontSize: '18pt',
                    fontWeight: 600,
                    color: '#3b82f6',
                }}>
                    {courseName}
                </div>

                {/* Details Row */}
                <div style={{
                    display: 'flex',
                    gap: '15mm',
                    justifyContent: 'center',
                    alignItems: 'center',
                    fontSize: '10pt',
                    color: '#6b7280',
                    marginTop: '2mm',
                }}>
                    {subjectName && (
                        <span>المادة: <strong style={{ color: '#374151' }}>{subjectName}</strong></span>
                    )}
                    {score !== undefined && score !== null && (
                        <span>الدرجة: <strong style={{ color: '#374151' }}>{score}%</strong></span>
                    )}
                    <span>التاريخ: <strong style={{ color: '#374151' }}>{(() => {
                        const d = issuedDate ? new Date(issuedDate) : null;
                        const valid = d && !isNaN(d.getTime()) ? d : new Date();
                        return valid.toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric' });
                    })()}</strong></span>
                </div>

                {/* Bottom: QR + Certificate ID */}
                <div style={{
                    position: 'absolute',
                    bottom: '-15mm',
                    left: '0',
                    right: '0',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-end',
                    padding: '0 5mm',
                }}>
                    {/* Certificate ID */}
                    <div style={{
                        fontSize: '7pt',
                        color: '#9ca3af',
                        direction: 'ltr',
                    }}>
                        Certificate ID: {certificateId.slice(0, 8).toUpperCase()}
                    </div>

                    {/* QR Code */}
                    {qrDataUrl && (
                        <div style={{ textAlign: 'center' }}>
                            <img
                                src={qrDataUrl}
                                alt="Verification QR"
                                style={{ width: '20mm', height: '20mm' }}
                            />
                            <div style={{
                                fontSize: '6pt',
                                color: '#9ca3af',
                                marginTop: '1mm',
                                direction: 'ltr',
                            }}>
                                {verifyUrl}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
});

CertificateTemplate.displayName = 'CertificateTemplate';

export default CertificateTemplate;
