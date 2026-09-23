/**
 * Template Renderer — Safe token interpolation for templates
 *
 * Replaces {{token}} placeholders with provided values.
 * Supports an optional allowlist (from template.variables JSONB).
 * HTML-escapes values to prevent XSS when rendering as HTML.
 */

// ============================================
// TYPES
// ============================================

export interface TemplateVariable {
    token: string;
    label_ar: string;
    label_en: string;
}

// ============================================
// HTML ESCAPING
// ============================================

const HTML_ESCAPE_MAP: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
};

export function escapeHtml(str: string): string {
    return str.replace(/[&<>"']/g, (ch) => HTML_ESCAPE_MAP[ch] || ch);
}

// ============================================
// CORE RENDERER
// ============================================

/**
 * Render a template by replacing {{token}} placeholders with values.
 *
 * @param content - The raw template string containing {{token}} placeholders
 * @param values - Key-value map of token → replacement value
 * @param options.allowedTokens - Optional whitelist of token names. If provided, only these tokens will be replaced.
 * @param options.escapeValues - Whether to HTML-escape replacement values (default: true)
 * @param options.keepUnresolved - If true, unresolved {{tokens}} remain. If false, they become empty. (default: true)
 * @returns The rendered string with tokens replaced
 */
export function renderTemplate(
    content: string,
    values: Record<string, string>,
    options: {
        allowedTokens?: string[];
        escapeValues?: boolean;
        keepUnresolved?: boolean;
    } = {}
): string {
    const {
        allowedTokens,
        escapeValues = true,
        keepUnresolved = true,
    } = options;

    if (!content) return '';

    return content.replace(/\{\{(\w+)\}\}/g, (match, token: string) => {
        // If allowlist is provided and token is not in it, leave as-is
        if (allowedTokens && !allowedTokens.includes(token)) {
            return match;
        }

        // If value exists for this token, replace it
        if (token in values) {
            const val = values[token];
            return escapeValues ? escapeHtml(val) : val;
        }

        // Token is allowed but no value provided
        return keepUnresolved ? match : '';
    });
}

// ============================================
// SAMPLE DATA (for live preview)
// ============================================

export const SAMPLE_TOKEN_VALUES: Record<string, string> = {
    student_name: 'أحمد محمد',
    date: '2026-02-11',
    subject_name: 'الرياضيات',
    stage_name: 'المرحلة الابتدائية',
    teacher_name: 'أ. خالد',
    lesson_name: 'الكسور والأعداد العشرية',
    score: '95%',
    academy_name: 'ورق أكاديمي',
};

export const SAMPLE_TOKEN_VALUES_EN: Record<string, string> = {
    student_name: 'Ahmed Mohammed',
    date: '2026-02-11',
    subject_name: 'Mathematics',
    stage_name: 'Primary Stage',
    teacher_name: 'Mr. Khaled',
    lesson_name: 'Fractions and Decimals',
    score: '95%',
    academy_name: 'Waraq Academy',
};
