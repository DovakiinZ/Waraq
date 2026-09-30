import React, { useRef, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { LessonBlock, LessonSection } from '@/types/database';
import { cn } from '@/lib/utils';
import { Lightbulb, AlertTriangle, FileText, CheckCircle, Video as VideoIcon } from 'lucide-react';

// Helper to extract YouTube ID
const getYoutubeId = (url: string) => {
    if (!url) return null;
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
};

interface LessonWithDetails {
    blocks: LessonBlock[];
    sections?: LessonSection[];
}

export interface ContentRendererProps {
    lesson: LessonWithDetails;
    onBlockSeen?: (blockId: string) => void;
    seenBlockIds?: Set<string>;
    isPublicPreview?: boolean;
}

export function LessonContentRenderer({ lesson, onBlockSeen, seenBlockIds = new Set(), isPublicPreview = false }: ContentRendererProps) {
    const { t } = useLanguage();

    // Filter out unpublished blocks
    const publishedBlocks = lesson.blocks?.filter(b => b.is_published !== false) || [];

    // Group blocks by section (including null section)
    const blocksBySection: Record<string, LessonBlock[]> = {};
    const unsectionedBlocks: LessonBlock[] = [];

    publishedBlocks.forEach(block => {
        // Skip files/links and videos in the public preview since they are rendered natively by LessonPage
        if (isPublicPreview && ['file', 'link', 'video'].includes(block.type)) {
            return;
        }

        if (block.section_id) {
            if (!blocksBySection[block.section_id]) blocksBySection[block.section_id] = [];
            blocksBySection[block.section_id].push(block);
        } else {
            unsectionedBlocks.push(block);
        }
    });

    return (
        <div className="space-y-12">
            {/* Unsectioned Blocks */}
            {unsectionedBlocks.length > 0 && (
                <div className="space-y-6">
                    {unsectionedBlocks.map(block => (
                        <TrackedBlock 
                            key={block.id} 
                            block={block} 
                            onSeen={onBlockSeen} 
                            isSeen={seenBlockIds.has(block.id)} 
                        />
                    ))}
                </div>
            )}

            {/* Sections */}
            {lesson.sections && lesson.sections.map(section => {
                const sectionBlocks = blocksBySection[section.id] || [];
                if (sectionBlocks.length === 0) return null;
                return (
                    <div key={section.id} className="space-y-6">
                        <h2 className="text-xl font-bold border-b border-border pb-2">
                            {t(section.title_ar, section.title_en || section.title_ar)}
                        </h2>
                        <div className="space-y-6">
                            {sectionBlocks.map(block => (
                                <TrackedBlock 
                                    key={block.id} 
                                    block={block} 
                                    onSeen={onBlockSeen} 
                                    isSeen={seenBlockIds.has(block.id)} 
                                />
                            ))}
                        </div>
                    </div>
                );
            })}
        </div>
    );
}

function TrackedBlock({ block, onSeen, isSeen }: { block: LessonBlock; onSeen?: (id: string) => void; isSeen: boolean }) {
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (isSeen || !ref.current || !onSeen) return;

        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting && entry.intersectionRatio >= 0.4) {
                    onSeen(block.id);
                    observer.disconnect();
                }
            },
            { threshold: 0.4 }
        );

        observer.observe(ref.current);
        return () => observer.disconnect();
    }, [block.id, isSeen, onSeen]);

    return (
        <div ref={ref} className={cn(
            "transition-opacity duration-500",
            (isSeen || !onSeen) ? "opacity-100" : "opacity-90"
        )}>
            <BlockDisplay block={block} />
        </div>
    );
}

// Callout colours come from the brand palette, not Tailwind's stock hues.
// They stay SIX distinguishable identities on purpose — flattening every
// callout to green would make a tip look exactly like an example, which is
// the one thing the colour is carrying. Mapping: tip=sky, warning=sun,
// example=green, exercise=coral, equation=deep/mint, Q&A=mint.
function BlockDisplay({ block }: { block: LessonBlock }) {
    const { t } = useLanguage();

    switch (block.type) {
        case 'rich_text':
            return (
                <div className="prose dark:prose-invert max-w-none text-muted-foreground text-sm">
                    <p className="whitespace-pre-wrap">{t(block.content_ar || '', block.content_en || block.content_ar || '')}</p>
                </div>
            );
        case 'tip':
            return (
                <div className="bg-brand-sky/10 dark:bg-brand-sky/15 border-s-4 border-brand-sky p-4 rounded-e-md">
                    <div className="flex items-center gap-2 mb-1 text-brand-sky font-semibold text-sm">
                        <Lightbulb className="w-4 h-4" />
                        {t('نصيحة', 'Tip')}
                    </div>
                    <p className="text-sm whitespace-pre-wrap">{t(block.content_ar || '', block.content_en || block.content_ar || '')}</p>
                </div>
            );
        case 'warning':
            return (
                <div className="bg-brand-sun/15 dark:bg-brand-sun/20 border-s-4 border-brand-sun p-4 rounded-e-md">
                    <div className="flex items-center gap-2 mb-1 text-brand-sun font-semibold text-sm">
                        <AlertTriangle className="w-4 h-4" />
                        {t('تنبيه', 'Warning')}
                    </div>
                    <p className="text-sm whitespace-pre-wrap">{t(block.content_ar || '', block.content_en || block.content_ar || '')}</p>
                </div>
            );
        case 'example':
            return (
                <div className="bg-brand-green/10 dark:bg-brand-green/20 border-s-4 border-brand-green p-4 rounded-e-md">
                    <div className="flex items-center gap-2 mb-1 text-brand-green dark:text-brand-mint font-semibold text-sm">
                        <FileText className="w-4 h-4" />
                        {t('مثال', 'Example')}
                    </div>
                    <p className="text-sm whitespace-pre-wrap">{t(block.content_ar || '', block.content_en || block.content_ar || '')}</p>
                </div>
            );
        case 'exercise':
            return (
                <div className="bg-brand-coral/10 dark:bg-brand-coral/20 border-s-4 border-brand-coral p-4 rounded-e-md">
                    <div className="flex items-center gap-2 mb-1 text-brand-coral font-semibold text-sm">
                        <FileText className="w-4 h-4" />
                        {t('تمرين', 'Exercise')}
                    </div>
                    <p className="text-sm whitespace-pre-wrap">{t(block.content_ar || '', block.content_en || block.content_ar || '')}</p>
                </div>
            );
        case 'equation':
            return (
                <div className="bg-brand-paper dark:bg-brand-deep/40 border border-brand-mint dark:border-brand-green rounded-lg p-4">
                    {(block.title_ar || block.title_en) && (
                        <p className="text-xs text-muted-foreground mb-2">{t(block.title_ar || '', block.title_en || '')}</p>
                    )}
                    <div className="text-center text-lg font-mono py-2">
                        {t(block.content_ar || '', block.content_en || block.content_ar || '')}
                    </div>
                </div>
            );
        case 'qa':
            return (
                <div className="bg-brand-mint/20 dark:bg-brand-green/15 border border-brand-mint dark:border-brand-green rounded-lg p-4 space-y-2">
                    <div className="flex items-start gap-2">
                        <span className="text-brand-green dark:text-brand-mint font-bold text-sm mt-0.5">Q:</span>
                        <p className="text-sm font-medium">{t(block.title_ar || '', block.title_en || '')}</p>
                    </div>
                    <div className="flex items-start gap-2">
                        <span className="text-brand-deep dark:text-brand-paper font-bold text-sm mt-0.5">A:</span>
                        <p className="text-sm whitespace-pre-wrap">{t(block.content_ar || '', block.content_en || block.content_ar || '')}</p>
                    </div>
                </div>
            );
        case 'video':
            const localYoutubeId = block.url ? getYoutubeId(block.url) : null;
            if (localYoutubeId) {
                return (
                    <div className="space-y-2">
                        {(block.title_ar || block.title_en) && (
                            <h3 className="text-sm font-semibold">{t(block.title_ar || '', block.title_en || '')}</h3>
                        )}
                        <div className="aspect-video bg-black rounded-lg overflow-hidden">
                            <iframe
                                width="100%" height="100%"
                                src={`https://www.youtube.com/embed/${localYoutubeId}`}
                                title="Video player" frameBorder="0"
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                allowFullScreen className="w-full h-full"
                            />
                        </div>
                    </div>
                );
            }
            return (
                <a href={block.url || '#'} target="_blank" rel="noopener noreferrer" className="block p-4 bg-secondary/20 rounded-lg flex items-center gap-3 hover:bg-secondary/40 transition-colors">
                    <VideoIcon className="w-6 h-6 text-primary" />
                    <span className="text-brand-green dark:text-brand-mint underline">{block.url}</span>
                </a>
            );
        case 'image':
            return (
                <div className="rounded-lg overflow-hidden my-4">
                    <img src={block.url || ''} alt="Lesson Content" className="max-w-full h-auto mx-auto rounded-lg shadow-sm" />
                </div>
            );
        default:
            return null;
    }
}
