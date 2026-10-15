/**
 * Lesson attachment uploads.
 *
 * Before this existed, the `image`, `video` and `file` block types in the
 * lesson editor were URL text inputs only — a teacher holding a photo of a
 * worksheet on their phone had no way to put it in a lesson. This module is
 * the one place that turns a picked File into a URL a block can store.
 *
 * Path shape is `lessons/<teacherId>/<lessonId>/<timestamp>.<ext>`, which
 * migration 117's INSERT policy requires: segment 1 is `lessons`, segment 2
 * must equal `auth.uid()`. Keep the first two segments if you change this,
 * or every upload fails RLS.
 *
 * IMPORTANT — the `public` bucket is genuinely public. getPublicUrl returns
 * an unguessable-but-permanent URL that needs no session to read, exactly
 * like lesson video URLs today (see "Video URLs are bearer access" in
 * CLAUDE.md). Do not use this for anything that must stay private; a
 * worksheet attached to a paid lesson is readable by anyone given its URL.
 */
import { supabase } from '@/lib/supabase';

export const LESSON_ASSET_BUCKET = 'public';

export type LessonAssetKind = 'image' | 'video' | 'file';

export type UploadErrorCode = 'type' | 'size' | 'empty' | 'upload';

export class LessonUploadError extends Error {
    code: UploadErrorCode;
    /** Human-facing detail, e.g. the allowed extensions or the size cap. */
    detail?: string;

    constructor(code: UploadErrorCode, message: string, detail?: string) {
        super(message);
        this.name = 'LessonUploadError';
        this.code = code;
        this.detail = detail;
    }
}

interface AssetRule {
    /** Exact MIME types accepted. */
    mimes: string[];
    maxBytes: number;
    /** Value for an <input type="file"> accept attribute. */
    accept: string;
    /** Shown to the teacher when the type is wrong. */
    label: string;
}

const MB = 1024 * 1024;

export const ASSET_RULES: Record<LessonAssetKind, AssetRule> = {
    image: {
        mimes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
        maxBytes: 5 * MB,
        accept: 'image/jpeg,image/png,image/webp,image/gif',
        label: 'JPG, PNG, WebP, GIF',
    },
    video: {
        mimes: ['video/mp4', 'video/webm', 'video/quicktime'],
        maxBytes: 50 * MB,
        accept: 'video/mp4,video/webm,video/quicktime',
        label: 'MP4, WebM, MOV',
    },
    file: {
        mimes: [
            'application/pdf',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'application/vnd.ms-powerpoint',
            'application/vnd.openxmlformats-officedocument.presentationml.presentation',
            'application/vnd.ms-excel',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'text/plain',
            'application/zip',
        ],
        maxBytes: 20 * MB,
        accept: '.pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt,.zip',
        label: 'PDF, Word, PowerPoint, Excel, TXT, ZIP',
    },
};

export function formatBytes(bytes: number): string {
    if (bytes >= MB) return `${Math.round(bytes / MB)} MB`;
    return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

/**
 * Validate a picked file against its kind. Returns null when acceptable, so
 * callers can check before showing any progress UI.
 */
export function validateAsset(file: File, kind: LessonAssetKind): LessonUploadError | null {
    const rule = ASSET_RULES[kind];

    if (file.size === 0) {
        return new LessonUploadError('empty', 'File is empty');
    }
    // Some Android browsers hand over an empty MIME type for a gallery pick;
    // fall back to the extension so a real photo is not rejected outright.
    const mimeOk = rule.mimes.includes(file.type);
    const extOk = !file.type && rule.accept
        .split(',')
        .filter(a => a.startsWith('.'))
        .some(ext => file.name.toLowerCase().endsWith(ext));

    if (!mimeOk && !extOk) {
        return new LessonUploadError('type', 'Unsupported file type', rule.label);
    }
    if (file.size > rule.maxBytes) {
        return new LessonUploadError('size', 'File is too large', formatBytes(rule.maxBytes));
    }
    return null;
}

function extensionFor(file: File): string {
    const fromName = file.name.includes('.') ? file.name.split('.').pop() : '';
    if (fromName && fromName.length <= 5) return fromName.toLowerCase();
    // Gallery picks sometimes arrive as "image" with no extension.
    const fromMime = file.type.split('/')[1];
    return (fromMime || 'bin').toLowerCase();
}

export interface UploadLessonAssetArgs {
    file: File;
    kind: LessonAssetKind;
    lessonId: string;
    /** The uploading teacher's auth uid — must match, or RLS rejects it. */
    teacherId: string;
}

/**
 * Upload one lesson attachment and return its public URL.
 * Throws LessonUploadError; the caller maps `code` to a bilingual message.
 */
export async function uploadLessonAsset({
    file,
    kind,
    lessonId,
    teacherId,
}: UploadLessonAssetArgs): Promise<string> {
    const invalid = validateAsset(file, kind);
    if (invalid) throw invalid;

    const path = `lessons/${teacherId}/${lessonId}/${Date.now()}.${extensionFor(file)}`;

    const { error } = await supabase.storage
        .from(LESSON_ASSET_BUCKET)
        .upload(path, file, { upsert: false, contentType: file.type || undefined });

    if (error) {
        throw new LessonUploadError('upload', 'Upload failed', error.message);
    }

    const { data } = supabase.storage.from(LESSON_ASSET_BUCKET).getPublicUrl(path);
    if (!data?.publicUrl) {
        throw new LessonUploadError('upload', 'Upload succeeded but no public URL was returned');
    }
    return data.publicUrl;
}
