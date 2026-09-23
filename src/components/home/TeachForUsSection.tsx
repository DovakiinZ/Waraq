import { Link } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Users, BookOpen, CreditCard, ArrowLeft, ArrowRight } from 'lucide-react';

const TeachForUsSection = () => {
  const { t, direction } = useLanguage();

  const benefits = [
    { icon: Users, label: t('وصول لآلاف الطلاب', 'Reach Thousands of Students') },
    { icon: BookOpen, label: t('أدوات تعليمية متكاملة', 'Complete Teaching Tools') },
    { icon: CreditCard, label: t('اكسب من خبرتك', 'Earn from Your Expertise') },
  ];

  const Arrow = direction === 'rtl' ? ArrowLeft : ArrowRight;

  return (
    <section className="bg-gradient-to-br from-primary/10 via-primary/5 to-background py-16 lg:py-24">
      <div className="max-w-6xl mx-auto px-4 text-center">
        <h2 className="text-3xl lg:text-4xl font-bold mb-4">
          {t('هل أنت معلم؟ انضم لورق أكاديمي', 'Are You a Teacher? Join Waraq Academy')}
        </h2>
        <p className="text-muted-foreground text-lg max-w-2xl mx-auto mb-12">
          {t(
            'شارك خبرتك مع آلاف الطلاب واكسب دخلاً من تدريس المواد التي تتقنها',
            'Share your expertise with thousands of students and earn income teaching subjects you master'
          )}
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          {benefits.map((benefit, i) => (
            <div
              key={i}
              className="bg-background/80 backdrop-blur-sm border border-primary/10 rounded-xl p-6 text-center"
            >
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
                <benefit.icon className="w-6 h-6 text-primary" />
              </div>
              <p className="font-semibold">{benefit.label}</p>
            </div>
          ))}
        </div>

        <Button asChild size="lg" className="text-lg px-8 py-6">
          <Link to="/apply/teacher" className="inline-flex items-center gap-2">
            {t('قدّم طلبك الآن', 'Apply Now')}
            <Arrow className="w-5 h-5" />
          </Link>
        </Button>
      </div>
    </section>
  );
};

export default TeachForUsSection;
