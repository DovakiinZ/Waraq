// /download — the Android app's download page.
//
// Nothing here is hard-coded to a version: every number and link comes from
// GitHub Releases through useAndroidRelease, so publishing a new release (per
// the Android Release Policy in CLAUDE.md) updates this page with no deploy.
// If the GitHub API is unreachable, the button falls back to /releases/latest,
// which GitHub always resolves to the newest release.
import { Link } from 'react-router-dom';
import { Download as DownloadIcon, ExternalLink, Globe, ShieldCheck, Smartphone } from 'lucide-react';
import Layout from '@/components/layout/Layout';
import { useLanguage } from '@/contexts/LanguageContext';
import { A, hard, PIXEL_STRIP } from '@/components/arcade/theme';
import { ArcadeCard, ArcadeChip, ArcadeEmpty, ArcadeSkeleton } from '@/components/arcade/primitives';
import {
  formatBytes,
  RELEASES_LATEST_URL,
  RELEASES_URL,
  useAndroidRelease,
} from '@/hooks/useAndroidRelease';

export default function Download() {
  const { t, language } = useLanguage();
  const { latest, all, isLoading, isError } = useAndroidRelease();
  const older = all.filter((r) => r !== latest);

  const date = (iso: string) =>
    new Date(iso).toLocaleDateString(language === 'ar' ? 'ar' : 'en', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

  const steps = [
    {
      ar: 'حمّل الملف',
      en: 'Download the file',
      dAr: 'اضغط زر التحميل من جوالك الأندرويد. حجم الملف موضّح تحت الزر.',
      dEn: 'Tap the download button on your Android phone. The file size is shown under it.',
    },
    {
      ar: 'اسمح بالتثبيت',
      en: 'Allow the install',
      dAr: 'عند فتح الملف سيطلب الجوال السماح بتثبيت التطبيقات من هذا المصدر. وافق مرة واحدة.',
      dEn: 'When you open the file, your phone asks to allow installs from this source. Allow it once.',
    },
    {
      ar: 'سجّل الدخول',
      en: 'Sign in',
      dAr: 'افتح التطبيق وسجّل الدخول بنفس حسابك على الموقع، وستجد موادك وتقدّمك كما هي.',
      dEn: 'Open the app and sign in with your website account. Your courses and progress are all there.',
    },
  ];

  return (
    <Layout>
      <div style={{ background: A.bg, color: A.ink }}>
        {/* ── Hero ───────────────────────────────────────────── */}
        <section className="mx-auto grid max-w-[1100px] gap-10 px-5 py-14 lg:grid-cols-[1.2fr_1fr] lg:items-center lg:px-8 lg:py-20">
          <div>
            <ArcadeChip filled>
              <Smartphone className="h-3.5 w-3.5" />
              Android
            </ArcadeChip>
            <h1 className="mt-5 text-[36px] font-black leading-[1.1] sm:text-[52px]">
              {t('ورق أكاديمي', 'Waraq Academy')}
              <br />
              <span style={{ color: A.mid }}>{t('في جيبك', 'in your pocket')}</span>
            </h1>
            <p className="mt-5 max-w-[46ch] text-[17px] font-medium leading-relaxed" style={{ color: A.inkSoft }}>
              {t(
                'حمّل تطبيق الأندرويد وتابع دروسك واختباراتك ورسائلك من أي مكان، بنفس حسابك على الموقع.',
                'Get the Android app and keep up with lessons, quizzes and messages anywhere, with your website account.',
              )}
            </p>

            <div className="mt-8">
              {isLoading ? (
                <ArcadeSkeleton className="h-[60px] w-full max-w-[320px]" />
              ) : (
                <a
                  href={latest?.apkUrl ?? RELEASES_LATEST_URL}
                  {...(latest ? {} : { target: '_blank', rel: 'noopener noreferrer' })}
                  className="arc-focus arc-press inline-flex w-full items-center justify-center gap-3 whitespace-nowrap border-2 px-8 py-4 text-[17px] font-black sm:w-auto"
                  style={{ background: A.accent, color: A.onAccent, borderColor: A.line }}
                >
                  <DownloadIcon className="h-5 w-5" />
                  {t('تحميل التطبيق', 'Download the app')}
                </a>
              )}

              <p className="mt-3 text-[13px] font-semibold" style={{ color: A.inkSoft }}>
                {isLoading
                  ? t('جارٍ جلب آخر إصدار…', 'Fetching the latest version…')
                  : latest
                    ? (
                      <>
                        <span dir="ltr">v{latest.version ?? latest.tag}</span>
                        {' · '}
                        <span dir="ltr">{formatBytes(latest.apkBytes)}</span>
                        {' · '}
                        {date(latest.publishedAt)}
                      </>
                    )
                    : isError
                      ? t('تعذّر جلب تفاصيل الإصدار، والزر يفتح صفحة آخر إصدار مباشرة.', "Couldn't load version details; the button opens the latest release directly.")
                      : t('لا يوجد إصدار منشور بعد.', 'No release published yet.')}
              </p>
            </div>
          </div>

          <ArcadeCard className="p-6 sm:p-8" style={{ boxShadow: hard(7) }}>
            <ul className="space-y-5">
              {[
                { icon: ShieldCheck, ar: 'رسمي ومجاني', en: 'Official and free', dAr: 'يُنشر كل إصدار من مستودع ورق الرسمي على GitHub.', dEn: 'Every build is published from the official Waraq repository on GitHub.' },
                { icon: Smartphone, ar: 'أندرويد فقط حالياً', en: 'Android only for now', dAr: 'على الآيفون استخدم الموقع من المتصفح، فهو يعمل بالكامل على الجوال.', dEn: 'On iPhone, use the website in your browser. It works fully on mobile.' },
                { icon: Globe, ar: 'نفس الحساب', en: 'One account', dAr: 'حسابك وتقدّمك متزامنان بين الموقع والتطبيق.', dEn: 'Your account and progress sync between the website and the app.' },
              ].map((f) => (
                <li key={f.en} className="flex gap-4">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center" style={{ background: A.band, color: A.accent }}>
                    <f.icon className="h-5 w-5" />
                  </span>
                  <span>
                    <span className="block text-[16px] font-black">{language === 'ar' ? f.ar : f.en}</span>
                    <span className="mt-1 block text-[14px] font-medium leading-relaxed" style={{ color: A.inkSoft }}>
                      {language === 'ar' ? f.dAr : f.dEn}
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          </ArcadeCard>
        </section>

        <div className="h-[6px] w-full opacity-40" style={{ background: PIXEL_STRIP }} aria-hidden />

        {/* ── How to install ─────────────────────────────────── */}
        <section style={{ background: A.wash }}>
          <div className="mx-auto max-w-[1100px] px-5 py-14 lg:px-8 lg:py-16">
            <h2 className="text-[28px] font-black sm:text-[36px]">{t('طريقة التثبيت', 'How to install')}</h2>
            <ol className="mt-8 grid gap-5 md:grid-cols-3">
              {steps.map((s, i) => (
                <li key={s.en}>
                  <ArcadeCard className="h-full p-6" flat>
                    <span
                      className="flex h-10 w-10 items-center justify-center border-2 font-mono text-[18px] font-black"
                      style={{ background: A.accent, color: A.onAccent, borderColor: A.line }}
                    >
                      {i + 1}
                    </span>
                    <h3 className="mt-4 text-[18px] font-black">{language === 'ar' ? s.ar : s.en}</h3>
                    <p className="mt-2 text-[14px] font-medium leading-relaxed" style={{ color: A.inkSoft }}>
                      {language === 'ar' ? s.dAr : s.dEn}
                    </p>
                  </ArcadeCard>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* ── What's new + older versions ────────────────────── */}
        <section className="mx-auto grid max-w-[1100px] gap-8 px-5 py-14 lg:grid-cols-2 lg:px-8 lg:py-16">
          <div>
            <h2 className="text-[24px] font-black">{t('الجديد في هذا الإصدار', "What's new")}</h2>
            <div className="mt-5">
              {isLoading ? (
                <ArcadeSkeleton className="h-40 w-full" />
              ) : latest?.notes ? (
                <ArcadeCard className="p-6" flat>
                  {/* Release notes are written in the GitHub release; shown as plain text. */}
                  <p className="whitespace-pre-wrap text-[14px] font-medium leading-relaxed" dir="auto">
                    {latest.notes.replace(/[#*`]/g, '')}
                  </p>
                </ArcadeCard>
              ) : (
                <ArcadeEmpty>
                  {t('لا توجد ملاحظات لهذا الإصدار.', 'This release has no notes.')}
                </ArcadeEmpty>
              )}
            </div>
          </div>

          <div>
            <h2 className="text-[24px] font-black">{t('الإصدارات السابقة', 'Previous versions')}</h2>
            <div className="mt-5">
              {isLoading ? (
                <ArcadeSkeleton className="h-40 w-full" />
              ) : older.length ? (
                <ul className="divide-y-2 border-2" style={{ borderColor: A.line, background: A.surface }}>
                  {older.map((r) => (
                    <li key={r.tag} className="flex items-center justify-between gap-4 px-5 py-4" style={{ borderColor: A.line }}>
                      <span className="min-w-0">
                        <span className="block text-[15px] font-black" dir="ltr">
                          v{r.version ?? r.tag}
                          {r.prerelease && (
                            <span className="ms-2 text-[12px] font-bold" style={{ color: A.inkSoft }}>
                              {t('تجريبي', 'test')}
                            </span>
                          )}
                        </span>
                        <span className="block text-[12px] font-semibold" style={{ color: A.inkSoft }}>
                          {date(r.publishedAt)} · <span dir="ltr">{formatBytes(r.apkBytes)}</span>
                        </span>
                      </span>
                      <a
                        href={r.apkUrl}
                        className="arc-focus arc-press-sm inline-flex shrink-0 items-center gap-2 border-2 px-4 py-2 text-[13px] font-black"
                        style={{ background: A.surface, color: A.ink, borderColor: A.line }}
                        aria-label={t(`تحميل الإصدار ${r.version ?? r.tag}`, `Download version ${r.version ?? r.tag}`)}
                      >
                        <DownloadIcon className="h-4 w-4" />
                        APK
                      </a>
                    </li>
                  ))}
                </ul>
              ) : (
                <ArcadeEmpty>
                  {isError
                    ? t('تعذّر تحميل قائمة الإصدارات.', "Couldn't load the version list.")
                    : t('هذا أول إصدار.', 'This is the first release.')}
                </ArcadeEmpty>
              )}
            </div>
            <a
              href={RELEASES_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="arc-link mt-4 inline-flex items-center gap-1.5 text-[13px] font-bold"
              style={{ color: A.ink }}
            >
              {t('كل الإصدارات على GitHub', 'All releases on GitHub')}
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </div>
        </section>

        <section className="mx-auto max-w-[1100px] px-5 pb-16 text-center lg:px-8">
          <p className="text-[14px] font-semibold" style={{ color: A.inkSoft }}>
            {t('ليس لديك حساب بعد؟', "Don't have an account yet?")}{' '}
            <Link to="/register" className="arc-link font-black" style={{ color: A.ink }}>
              {t('أنشئ حساباً مجانياً', 'Create a free account')}
            </Link>
          </p>
        </section>
      </div>
    </Layout>
  );
}
