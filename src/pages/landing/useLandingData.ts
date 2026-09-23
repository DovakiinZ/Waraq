// Shared data for all landing-page design variants.
// Pulls the same live content (stages, featured teachers, featured subjects)
// so every variant shows real data, differing only in layout/style.
import { useHomeStages, useFeaturedTeachers, useFeaturedSubjects } from '@/hooks/useQueryHooks';

export function useLandingData() {
  const stagesQ = useHomeStages();
  const teachersQ = useFeaturedTeachers();
  const subjectsQ = useFeaturedSubjects();

  return {
    stages: (stagesQ.data as any[]) || [],
    teachers: (teachersQ.data as any[]) || [],
    subjects: (subjectsQ.data as any[]) || [],
    loading: stagesQ.isLoading || teachersQ.isLoading || subjectsQ.isLoading,
  };
}

// Brand tokens used across the standalone landing variants.
export const BRAND = {
  navy: '#1E3A5F',
  navyDeep: '#131921',
  gold: '#AE944F',
  goldLight: '#D4A853',
  ivory: '#F7F4EF',
  surface: '#FAF8F5',
};

// The design directions (used by the index + switcher).
export const VARIANTS = [
  { n: 1, key: 'editorial', ar: 'إفتتاحي جريء', en: 'Bold Editorial' },
  { n: 2, key: 'minimal', ar: 'مينيمال هادئ', en: 'Quiet Minimal' },
  { n: 3, key: 'playful', ar: 'مرِح للأطفال', en: 'Playful' },
  { n: 4, key: 'dark', ar: 'فخم داكن', en: 'Premium Dark' },
  { n: 5, key: 'convert', ar: 'موجّه للتحويل', en: 'Conversion' },
  { n: 6, key: 'premium', ar: 'سوق تعليمي فاخر', en: 'Premium Marketplace' },
  { n: 7, key: 'thmanyah', ar: 'تحريري داكن (ثمانية)', en: 'Thmanyah Editorial' },
  { n: 8, key: 'wijha', ar: 'راقٍ أخضر (وجهة)', en: 'Wijha Refined' },
  { n: 9, key: 'colorful', ar: 'ملوّن (٤ لوحات)', en: 'Colorful (4 palettes)' },
  { n: 10, key: 'arcade', ar: 'أركيد بكسل', en: 'Pixel Arcade' },
];
