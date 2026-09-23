// Public site footer, styled in the arcade (green + white) language.
// Deep green band, sharp edges, electric green on hover.
import { Link } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { A, PIXEL_STRIP } from '@/components/arcade/theme';
import logo from '@/assets/logo.png';

const Footer = () => {
  const { t } = useLanguage();

  // Every path below is a real route in App.tsx. The previous footer linked
  // to /contact and /faq, which have no routes and resolved to NotFound;
  // they are replaced with the teacher and plans routes that do exist.
  const footerColumns = [
    {
      head: { ar: 'تعلّم', en: 'Learn' },
      links: [
        { path: '/stages', label: { ar: 'المراحل الدراسية', en: 'Stages' } },
        { path: '/marketplace', label: { ar: 'المواد', en: 'Courses' } },
        { path: '/plans', label: { ar: 'الخطط', en: 'Plans' } },
      ],
    },
    {
      head: { ar: 'المنصة', en: 'Platform' },
      links: [
        { path: '/teachers', label: { ar: 'المعلّمون', en: 'Teachers' } },
        { path: '/apply/teacher', label: { ar: 'انضم كمعلّم', en: 'Teach with us' } },
        { path: '/login', label: { ar: 'تسجيل الدخول', en: 'Log in' } },
      ],
    },
    {
      head: { ar: 'السياسات', en: 'Policies' },
      links: [
        { path: '/privacy', label: { ar: 'سياسة الخصوصية', en: 'Privacy' } },
        { path: '/terms', label: { ar: 'الشروط والأحكام', en: 'Terms' } },
        { path: '/refund-policy', label: { ar: 'سياسة الاسترداد', en: 'Refunds' } },
        { path: '/certificate-policy', label: { ar: 'سياسة الشهادات', en: 'Certificates' } },
      ],
    },
  ];

  return (
    <footer style={{ background: A.band, color: A.onInk }}>
      <div className="h-[6px] w-full opacity-40" style={{ background: PIXEL_STRIP }} aria-hidden />

      <div className="mx-auto max-w-[1280px] px-5 py-14 lg:px-8">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <Link to="/" className="arc-focus flex items-center gap-2.5">
              <img
                src={logo}
                alt=""
                className="h-9 w-9 object-contain"
                style={{ border: `2px solid ${A.onInk}` }}
              />
              <span className="text-[16px] font-black">
                {t('أكاديمية أيمن', 'Ayman Academy')}
              </span>
            </Link>
            <p
              className="mt-4 max-w-[34ch] text-[14px] font-medium leading-relaxed"
              style={{ color: A.onInkMuted }}
            >
              {t(
                'مواد مدرسية يشرحها معلّمون، لطلاب المراحل الدراسية.',
                'School subjects taught by real teachers, for students at every stage.',
              )}
            </p>
          </div>

          {footerColumns.map((col) => (
            <div key={col.head.en}>
              <h3 className="text-[14px] font-black">{t(col.head.ar, col.head.en)}</h3>
              <ul className="mt-4 space-y-2.5">
                {col.links.map((link) => (
                  <li key={link.path}>
                    <Link
                      to={link.path}
                      className="arc-focus text-[14px] font-semibold transition-colors"
                      style={{ color: A.onInkMuted }}
                      onMouseEnter={(e) => (e.currentTarget.style.color = A.accent)}
                      onMouseLeave={(e) => (e.currentTarget.style.color = A.onInkMuted)}
                    >
                      {t(link.label.ar, link.label.en)}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div
          className="mt-12 pt-6 text-[13px] font-medium"
          style={{ borderTop: `2px solid ${A.bandLine}`, color: A.onInkMuted }}
        >
          {t(
            'جميع الحقوق محفوظة لأكاديمية أيمن.',
            'All rights reserved, Ayman Academy.',
          )}
        </div>
      </div>
    </footer>
  );
};

export default Footer;
