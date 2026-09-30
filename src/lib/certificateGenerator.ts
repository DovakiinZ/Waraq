/**
 * Certificate Generator
 * 
 * Handles: QR generation, PDF creation, Supabase upload.
 * 
 * SECURITY: Certificate issuance is handled SERVER-SIDE via Postgres RPC functions.
 * Students cannot insert certificates directly (RLS INSERT policy removed).
 * PDF generation is client-side but ONLY reads from snapshot_json, never live profile data.
 */

import QRCode from 'qrcode';
import { toPng } from 'html-to-image';
import { jsPDF } from 'jspdf';
import { supabase } from './supabase';
import type { Certificate } from '@/types/database';

// ============================================
// QR CODE
// ============================================

export async function generateQRDataUrl(url: string): Promise<string> {
    return QRCode.toDataURL(url, {
        width: 200,
        margin: 1,
        color: {
            dark: '#0B3B2C',
            light: '#ffffff',
        },
        errorCorrectionLevel: 'M',
    });
}

// ============================================
// VERIFICATION CODE (kept for backward compat, but server generates its own)
// ============================================

export function generateVerificationCode(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 12; i++) {
        code += chars[Math.floor(Math.random() * chars.length)];
        if (i === 3 || i === 7) code += '-';
    }
    return code;
}

// ============================================
// PDF GENERATION
// ============================================

export async function generateCertificatePDF(
    element: HTMLElement
): Promise<Blob> {
    // Render the certificate DOM element to a high-res PNG
    const dataUrl = await toPng(element, {
        width: 1123, // 297mm at 96dpi
        height: 794, // 210mm at 96dpi
        pixelRatio: 2, // 2x for sharp text
        backgroundColor: '#ffffff',
    });

    // Create A4 landscape PDF
    const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4',
    });

    // A4 landscape: 297mm x 210mm
    pdf.addImage(dataUrl, 'PNG', 0, 0, 297, 210);

    return pdf.output('blob');
}

// ============================================
// STORAGE UPLOAD
// ============================================

export async function uploadCertificatePDF(
    blob: Blob,
    certificateId: string
): Promise<string | null> {
    const fileName = `${certificateId}.pdf`;
    const filePath = `certificates/${fileName}`;

    const { error } = await supabase.storage
        .from('certificates')
        .upload(filePath, blob, {
            contentType: 'application/pdf',
            upsert: true,
        });

    if (error) {
        console.error('Failed to upload certificate PDF:', error);
        // Fallback: if bucket doesn't exist, try 'public' bucket
        const { error: fallbackError } = await supabase.storage
            .from('public')
            .upload(`certificates/${fileName}`, blob, {
                contentType: 'application/pdf',
                upsert: true,
            });

        if (fallbackError) {
            console.error('Fallback upload also failed:', fallbackError);
            return null;
        }

        const { data: urlData } = supabase.storage
            .from('public')
            .getPublicUrl(`certificates/${fileName}`);

        return urlData?.publicUrl || null;
    }

    const { data: urlData } = supabase.storage
        .from('certificates')
        .getPublicUrl(filePath);

    return urlData?.publicUrl || null;
}

// ============================================
// UPDATE PDF URL AFTER GENERATION
// ============================================

export async function updateCertificatePdfUrl(
    certificateId: string,
    pdfUrl: string
): Promise<void> {
    await (supabase
        .from('certificates') as any)
        .update({ pdf_url: pdfUrl })
        .eq('id', certificateId);
}

// ============================================
// SECURE CERTIFICATE REQUEST (via RPC)
// ============================================

export interface RequestCertificateResult {
    certificate: Certificate | null;
    status: 'issued' | 'pending_approval' | 'already_exists' | 'not_eligible';
    error: string | null;
}

/**
 * Request a certificate via server-side RPC function.
 * The server validates eligibility, builds snapshot, and creates the certificate.
 * Students cannot bypass this — RLS INSERT is removed.
 */
export async function requestCertificateViaRPC(
    subjectId: string,
): Promise<RequestCertificateResult> {
    // `request_certificate` does not exist in the database — this call always
    // failed. The real function is `issue_certificate(p_student_id, p_subject_id)`,
    // which StudentLessons already uses successfully; it takes the student
    // explicitly rather than reading auth.uid() internally.
    const { data: userData } = await supabase.auth.getUser();
    const studentId = userData?.user?.id;
    if (!studentId) {
        return { certificate: null, status: 'not_eligible', error: 'Not signed in' };
    }

    const { data, error } = await (supabase.rpc as any)('issue_certificate', {
        p_student_id: studentId,
        p_subject_id: subjectId,
    });

    if (error) {
        console.error('RPC issue_certificate error:', error);
        return { certificate: null, status: 'not_eligible', error: error.message };
    }

    const result = data as any;

    if (result.error) {
        return {
            certificate: null,
            status: result.status || 'not_eligible',
            error: result.error,
        };
    }

    // Fetch the full certificate record
    if (result.certificate_id) {
        const { data: cert } = await supabase
            .from('certificates')
            .select('*')
            .eq('id', result.certificate_id)
            .single() as any;

        return {
            certificate: cert as Certificate || null,
            status: result.status,
            error: null,
        };
    }

    return {
        certificate: null,
        status: result.status || 'not_eligible',
        error: result.error || null,
    };
}

// ============================================
// ADMIN RE-ISSUE (via RPC)
// ============================================

export async function reissueCertificateViaRPC(
    certificateId: string,
    reason?: string
): Promise<{ certificate: Certificate | null; error: string | null }> {
    // NOTE: `admin_reissue_certificate` does NOT exist in the database, so this
    // path cannot succeed today. Unlike the other two certificate RPCs this one
    // has no equivalent to redirect to and no client-side substitute: reissuing
    // means inserting a new certificate row, and INSERT on `certificates` is
    // closed to clients by design.
    //
    // It is left calling the missing function deliberately, but the error is now
    // translated into something an admin can act on instead of a raw PostgREST
    // code. See supabase/migrations/106_admin_reissue_certificate.sql for the
    // function that makes this work; it has not been applied.
    const { data, error } = await (supabase.rpc as any)('admin_reissue_certificate', {
        p_certificate_id: certificateId,
        p_reason: reason || null,
    });

    if (error) {
        console.error('RPC admin_reissue_certificate error:', error);
        // PGRST202 = the function does not exist in the schema cache.
        const missing = (error as any).code === 'PGRST202';
        return {
            certificate: null,
            error: missing
                ? 'Re-issue is not available yet: the admin_reissue_certificate database function has not been installed. See supabase/migrations/106_admin_reissue_certificate.sql.'
                : error.message,
        };
    }

    const result = data as any;

    if (result.error) {
        return { certificate: null, error: result.error };
    }

    // Fetch the full new certificate
    if (result.certificate_id) {
        const { data: cert } = await supabase
            .from('certificates')
            .select('*')
            .eq('id', result.certificate_id)
            .single() as any;

        return { certificate: cert as Certificate || null, error: null };
    }

    return { certificate: null, error: 'Unknown error' };
}

// ============================================
// ADMIN APPROVE (via RPC)
// ============================================

export async function approveCertificateViaRPC(
    certificateId: string
): Promise<{ success: boolean; error: string | null }> {
    const { data, error } = await (supabase.rpc as any)('admin_approve_certificate', {
        p_certificate_id: certificateId,
    });

    if (error) {
        return { success: false, error: error.message };
    }

    const result = data as any;
    if (result.error) {
        return { success: false, error: result.error };
    }

    return { success: true, error: null };
}

// ============================================
// ADMIN REVOKE (via RPC)
// ============================================

export async function revokeCertificateViaRPC(
    certificateId: string
): Promise<{ success: boolean; error: string | null }> {
    const { data, error } = await (supabase.rpc as any)('admin_revoke_certificate', {
        p_certificate_id: certificateId,
    });

    if (error) {
        return { success: false, error: error.message };
    }

    const result = data as any;
    if (result.error) {
        return { success: false, error: result.error };
    }

    return { success: true, error: null };
}

// ============================================
// STUDENT REQUEST REISSUE (via RPC)
// ============================================

export interface ReissueResult {
    certificate: Certificate | null;
    status: 'issued' | 'rate_limited' | 'not_eligible' | 'error';
    error: string | null;
    newVersion?: number;
}

/**
 * Student-facing certificate reissue.
 * Creates a new version with fresh snapshot data from current profile.
 * Rate limited to 2 per day per student.
 */
export async function studentRequestReissueViaRPC(
    certificateId: string,
): Promise<ReissueResult> {
    const { data, error } = await (supabase.rpc as any)('student_request_reissue', {
        p_certificate_id: certificateId,
    });

    if (error) {
        console.error('RPC student_request_reissue error:', error);
        return { certificate: null, status: 'error', error: error.message };
    }

    const result = data as any;

    if (result.error) {
        return {
            certificate: null,
            status: result.status || 'error',
            error: result.error,
        };
    }

    // Fetch the full new certificate record
    if (result.certificate_id) {
        const { data: cert } = await supabase
            .from('certificates')
            .select('*')
            .eq('id', result.certificate_id)
            .single() as any;

        return {
            certificate: cert as Certificate || null,
            status: 'issued',
            error: null,
            newVersion: result.version,
        };
    }

    return { certificate: null, status: 'error', error: 'Unknown error' };
}

// ============================================
// FETCH LATEST CERTIFICATE VERSION
// ============================================

/**
 * Given a certificate ID (possibly revoked/superseded),
 * find the latest version in the chain via RPC.
 */
export async function fetchLatestCertificateVersion(
    certificateId: string,
): Promise<Certificate | null> {
    // `get_latest_certificate_version` does not exist in the database. It does
    // not need to: `certificates` carries `version` and `reissued_from_id`, so
    // the newest version for this student+subject is a plain query. Resolving it
    // client-side also removes a migration this feature would otherwise need.
    const { data: current } = await supabase
        .from('certificates')
        .select('id, student_id, subject_id, version')
        .eq('id', certificateId)
        .maybeSingle() as any;

    if (!current) return null;

    const { data: latest } = await supabase
        .from('certificates')
        .select('*')
        .eq('student_id', current.student_id)
        .eq('subject_id', current.subject_id)
        .order('version', { ascending: false })
        .limit(1)
        .maybeSingle() as any;

    return (latest as Certificate) || null;
}

// ============================================
// DUPLICATE CHECK (still useful for UI)
// ============================================

export async function checkDuplicateCertificateBySubject(
    studentId: string,
    subjectId: string
): Promise<Certificate | null> {
    const { data } = await supabase
        .from('certificates')
        .select('*')
        .eq('student_id', studentId)
        .eq('subject_id', subjectId)
        .in('status', ['issued', 'pending_approval'])
        .limit(1)
        .single() as any;

    return data || null;
}
