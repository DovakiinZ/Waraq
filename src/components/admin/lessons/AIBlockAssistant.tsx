import { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { LessonBlock } from '@/types/database';
import { processAIRequest, AIAction, getActionInfo } from '@/lib/aiService';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
    Sparkles, ChevronDown, Loader2, Check, X,
    Maximize2, Minimize2, BookOpen, BrainCircuit,
    Languages, Wand2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
    DropdownMenuSeparator,
    DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';

interface AIBlockAssistantProps {
    block: LessonBlock;
    lang: 'ar' | 'en';
    /** `action` lets the caller route a translation into the other language. */
    onApply: (content: string, action: AIAction) => void;
}

export default function AIBlockAssistant({ block, lang, onApply }: AIBlockAssistantProps) {
    const { t } = useLanguage();
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<string | null>(null);
    const [activeAction, setActiveAction] = useState<AIAction | null>(null);
    const [error, setError] = useState<string | null>(null);

    const contentField = lang === 'ar' ? block.content_ar : block.content_en;
    const hasContent = !!(contentField && contentField.trim());

    const handleAction = async (action: AIAction) => {
        if (!hasContent && !['translate_ar_en', 'translate_en_ar'].includes(action)) {
            return;
        }

        const content = action === 'translate_en_ar'
            ? (block.content_en || '')
            : action === 'translate_ar_en'
                ? (block.content_ar || '')
                : (contentField || '');

        setLoading(true);
        setActiveAction(action);
        setResult(null);
        setError(null);

        try {
            const response = await processAIRequest({
                action,
                content,
                language: lang,
            });

            if (response.success) {
                setResult(response.result);
            } else {
                setError(response.error || t('حدث خطأ', 'An error occurred'));
            }
        } catch (err) {
            setError(t('فشل الاتصال بخدمة الذكاء الاصطناعي', 'Failed to connect to AI service'));
        } finally {
            setLoading(false);
        }
    };

    const handleApply = () => {
        if (result && activeAction) {
            onApply(result, activeAction);
            setResult(null);
            setActiveAction(null);
        }
    };

    const handleDiscard = () => {
        setResult(null);
        setActiveAction(null);
        setError(null);
    };

    const contentActions: AIAction[] = ['expand', 'simplify', 'improve_language'];
    const generateActions: AIAction[] = ['generate_example', 'generate_summary', 'generate_quiz'];
    const translateActions: AIAction[] = lang === 'ar' ? ['translate_ar_en'] : ['translate_en_ar'];

    return (
        <div className="relative">
            {/* AI Trigger */}
            {!result && !loading && (
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button
                            variant="ghost"
                            size="sm"
                            className={cn(
                                "gap-1.5 text-xs h-7",
                                hasContent
                                    ? "text-purple-500 hover:text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-950/30"
                                    : "text-muted-foreground opacity-50"
                            )}
                            disabled={!hasContent}
                        >
                            <Sparkles className="w-3 h-3" />
                            AI
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="w-56">
                        <DropdownMenuLabel className="text-xs text-muted-foreground flex items-center gap-1.5">
                            <Sparkles className="w-3 h-3 text-purple-500" />
                            {t('مساعد الذكاء الاصطناعي', 'AI Assistant')}
                        </DropdownMenuLabel>
                        <DropdownMenuSeparator />

                        <DropdownMenuLabel className="text-[11px] text-muted-foreground/70">
                            {t('تحسين المحتوى', 'Enhance Content')}
                        </DropdownMenuLabel>
                        {contentActions.map(action => {
                            const info = getActionInfo(action, lang);
                            return (
                                <DropdownMenuItem key={action} onClick={() => handleAction(action)}>
                                    <ActionIcon action={action} />
                                    <div className="ms-2">
                                        <p className="text-sm">{info.label}</p>
                                        <p className="text-[10px] text-muted-foreground">{info.description}</p>
                                    </div>
                                </DropdownMenuItem>
                            );
                        })}

                        <DropdownMenuSeparator />
                        <DropdownMenuLabel className="text-[11px] text-muted-foreground/70">
                            {t('إنشاء', 'Generate')}
                        </DropdownMenuLabel>
                        {generateActions.map(action => {
                            const info = getActionInfo(action, lang);
                            return (
                                <DropdownMenuItem key={action} onClick={() => handleAction(action)}>
                                    <ActionIcon action={action} />
                                    <div className="ms-2">
                                        <p className="text-sm">{info.label}</p>
                                        <p className="text-[10px] text-muted-foreground">{info.description}</p>
                                    </div>
                                </DropdownMenuItem>
                            );
                        })}

                        <DropdownMenuSeparator />
                        {translateActions.map(action => {
                            const info = getActionInfo(action, lang);
                            return (
                                <DropdownMenuItem key={action} onClick={() => handleAction(action)}>
                                    <ActionIcon action={action} />
                                    <div className="ms-2">
                                        <p className="text-sm">{info.label}</p>
                                    </div>
                                </DropdownMenuItem>
                            );
                        })}
                    </DropdownMenuContent>
                </DropdownMenu>
            )}

            {/* Loading State */}
            {loading && (
                <div className="flex items-center gap-2 py-2 px-3 bg-purple-50 dark:bg-purple-950/20 rounded-md border border-purple-200 dark:border-purple-800 animate-in fade-in duration-200">
                    <Loader2 className="w-4 h-4 animate-spin text-purple-500" />
                    <span className="text-xs text-purple-600 dark:text-purple-400">
                        {activeAction && getActionInfo(activeAction, lang).label}...
                    </span>
                </div>
            )}

            {/* Error State */}
            {error && (
                <div className="flex items-center gap-2 py-2 px-3 bg-red-50 dark:bg-red-950/20 rounded-md border border-red-200 dark:border-red-800 animate-in fade-in duration-200">
                    <X className="w-4 h-4 text-red-500" />
                    <span className="text-xs text-red-600 dark:text-red-400 flex-1">{error}</span>
                    <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={handleDiscard}>
                        {t('إغلاق', 'Close')}
                    </Button>
                </div>
            )}

            {/* Result Preview */}
            {result && (
                <div className="mt-2 border border-purple-200 dark:border-purple-800 rounded-lg bg-purple-50/50 dark:bg-purple-950/10 animate-in slide-in-from-top-2 duration-300">
                    <div className="flex items-center justify-between px-3 py-2 border-b border-purple-200 dark:border-purple-800">
                        <div className="flex items-center gap-1.5">
                            <Sparkles className="w-3 h-3 text-purple-500" />
                            <span className="text-xs font-medium text-purple-600 dark:text-purple-400">
                                {activeAction && getActionInfo(activeAction, lang).label}
                            </span>
                        </div>
                        <div className="flex items-center gap-1">
                            <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 text-xs gap-1 text-green-600 hover:text-green-700 hover:bg-green-50"
                                onClick={handleApply}
                            >
                                <Check className="w-3 h-3" />
                                {t('تطبيق', 'Apply')}
                            </Button>
                            <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 text-xs gap-1 text-red-500 hover:text-red-600 hover:bg-red-50"
                                onClick={handleDiscard}
                            >
                                <X className="w-3 h-3" />
                                {t('تجاهل', 'Discard')}
                            </Button>
                        </div>
                    </div>
                    <div className="p-3">
                        <Textarea
                            value={result}
                            onChange={e => setResult(e.target.value)}
                            className="min-h-[100px] text-sm bg-white dark:bg-background resize-none"
                            dir={lang === 'ar' ? 'rtl' : 'ltr'}
                        />
                    </div>
                </div>
            )}
        </div>
    );
}

function ActionIcon({ action }: { action: AIAction }) {
    switch (action) {
        case 'expand': return <Maximize2 className="w-4 h-4 text-blue-500" />;
        case 'simplify': return <Minimize2 className="w-4 h-4 text-green-500" />;
        case 'generate_example': return <BookOpen className="w-4 h-4 text-emerald-500" />;
        case 'generate_summary': return <BookOpen className="w-4 h-4 text-cyan-500" />;
        case 'generate_quiz': return <BrainCircuit className="w-4 h-4 text-orange-500" />;
        case 'improve_language': return <Wand2 className="w-4 h-4 text-indigo-500" />;
        case 'translate_ar_en': return <Languages className="w-4 h-4 text-purple-500" />;
        case 'translate_en_ar': return <Languages className="w-4 h-4 text-purple-500" />;
        default: return <Sparkles className="w-4 h-4" />;
    }
}
