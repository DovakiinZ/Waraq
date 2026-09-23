import { useLanguage } from '@/contexts/LanguageContext';
import { Shield, BookCheck, Users, GraduationCap } from 'lucide-react';

const features = [
  {
    icon: Shield,
    title: { ar: 'محتوى موثوق', en: 'Trusted Content' },
    description: {
      ar: 'مناهج معتمدة ومراجعة من خبراء',
      en: 'Accredited curricula reviewed by experts',
    },
  },
  {
    icon: BookCheck,
    title: { ar: 'جودة أكاديمية', en: 'Academic Quality' },
    description: {
      ar: 'معايير تعليمية عالية',
      en: 'High educational standards',
    },
  },
  {
    icon: Users,
    title: { ar: 'دعم مستمر', en: 'Support' },
    description: {
      ar: 'فريق متخصص للمساعدة',
      en: 'Dedicated support team',
    },
  },
  {
    icon: GraduationCap,
    title: { ar: 'شهادات معتمدة', en: 'Certificates' },
    description: {
      ar: 'شهادات إتمام لكل مرحلة',
      en: 'Completion certificates',
    },
  },
];

const TrustSection = () => {
  const { t } = useLanguage();

  return (
    <section className="section-academic bg-primary text-primary-foreground">
      <div className="container-academic">
        <div className="text-center mb-10">
          <h2 className="mb-3">
            {t('لماذا ورق أكاديمي؟', 'Why Waraq Academy?')}
          </h2>
          <p className="opacity-75 text-sm max-w-lg mx-auto">
            {t(
              'نلتزم بأعلى معايير الجودة الأكاديمية',
              'We adhere to the highest academic quality standards'
            )}
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-5">
          {features.map((feature, index) => (
            <div
              key={index}
              className="bg-primary-foreground/8 rounded-lg p-5 text-center"
            >
              <div className="w-10 h-10 rounded-lg bg-primary-foreground/12 flex items-center justify-center mx-auto mb-3">
                <feature.icon className="w-5 h-5" strokeWidth={1.5} />
              </div>
              <h3 className="font-medium text-sm mb-1.5">
                {t(feature.title.ar, feature.title.en)}
              </h3>
              <p className="text-xs opacity-75">
                {t(feature.description.ar, feature.description.en)}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default TrustSection;
