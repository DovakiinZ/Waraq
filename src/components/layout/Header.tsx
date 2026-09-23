// Public site header, styled in the arcade (green + white) language.
// Sharp edges, 2px borders, hard offset shadows on interactive elements.
// Renders on one line at desktop and collapses to a bordered sheet below md.
import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { Menu, X, LogIn, LayoutDashboard, LogOut, Sun, Moon } from 'lucide-react';
import { useDarkMode } from '@/hooks/useDarkMode';
import { A } from '@/components/arcade/theme';
import { ArcadeBrand, ArcadeLink, ArcadeSkeleton } from '@/components/arcade/primitives';

const Header = () => {
  const { t, toggleLanguage, language } = useLanguage();
  const { isAuthenticated, role, signOut, isLoading } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { isDark, toggle: toggleDarkMode } = useDarkMode();
  const location = useLocation();

  const navLinks = [
    { path: '/', label: { ar: 'الرئيسية', en: 'Home' } },
    { path: '/marketplace', label: { ar: 'المواد', en: 'Courses' } },
    { path: '/stages', label: { ar: 'المراحل', en: 'Stages' } },
    { path: '/teachers', label: { ar: 'المعلّمون', en: 'Teachers' } },
    { path: '/plans', label: { ar: 'الخطط', en: 'Plans' } },
  ];

  const isActive = (path: string) => location.pathname === path;

  const getDashboardLink = () => {
    switch (role) {
      case 'super_admin':
        return '/admin';
      case 'teacher':
        return '/teacher';
      case 'student':
        return '/student';
      default:
        return '/';
    }
  };

  const handleSignOut = async () => {
    await signOut();
    // signOut() handles navigation to /login internally
  };

  // Square icon button, matching the sharp system.
  const iconButtonStyle = {
    borderColor: A.line,
    color: A.ink,
    background: 'transparent',
  } as const;

  return (
    <header
      className="sticky top-0 z-50"
      style={{ background: A.bg, borderBottom: `2px solid ${A.line}` }}
    >
      <div className="mx-auto max-w-[1280px] px-5 lg:px-8">
        <div className="flex h-[68px] items-center gap-6">
          <ArcadeBrand size={36} />

          {/* Desktop navigation. Active item carries an underline bar rather
              than a colour change, so it stays legible in both modes. */}
          <nav className="mx-auto hidden items-center gap-6 md:flex">
            {navLinks.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                className="arc-focus relative py-1 text-[15px] font-bold transition-colors"
                style={{ color: isActive(link.path) ? A.ink : A.inkSoft }}
                onMouseEnter={(e) => (e.currentTarget.style.color = A.ink)}
                onMouseLeave={(e) =>
                  (e.currentTarget.style.color = isActive(link.path) ? A.ink : A.inkSoft)
                }
              >
                {t(link.label.ar, link.label.en)}
                {isActive(link.path) && (
                  <span
                    className="absolute inset-x-0 -bottom-0.5 h-[3px]"
                    style={{ background: A.accent }}
                  />
                )}
              </Link>
            ))}
          </nav>

          <div className="ms-auto flex shrink-0 items-center gap-2 md:ms-0">
            <button
              onClick={toggleDarkMode}
              className="arc-focus flex h-9 w-9 items-center justify-center border-2 transition-colors"
              style={iconButtonStyle}
              title={isDark ? t('وضع فاتح', 'Light mode') : t('وضع داكن', 'Dark mode')}
              aria-label={isDark ? t('وضع فاتح', 'Light mode') : t('وضع داكن', 'Dark mode')}
            >
              {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>

            <button
              onClick={toggleLanguage}
              className="arc-focus border-2 px-3 py-1.5 text-[13px] font-black transition-colors"
              style={iconButtonStyle}
            >
              {language === 'ar' ? 'EN' : 'ع'}
            </button>

            {/* Auth, desktop */}
            <div className="hidden md:block">
              {isLoading ? (
                <ArcadeSkeleton className="h-9 w-28" />
              ) : isAuthenticated ? (
                <div className="flex items-center gap-2">
                  <ArcadeLink to={getDashboardLink()} size="sm" variant="solid">
                    <LayoutDashboard className="h-4 w-4" />
                    {t('لوحتي', 'My dashboard')}
                  </ArcadeLink>
                  <button
                    onClick={handleSignOut}
                    className="arc-focus flex h-9 w-9 items-center justify-center border-2 transition-colors"
                    style={iconButtonStyle}
                    title={t('تسجيل الخروج', 'Sign out')}
                    aria-label={t('تسجيل الخروج', 'Sign out')}
                  >
                    <LogOut className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Link
                    to="/login"
                    className="arc-focus text-[15px] font-bold"
                    style={{ color: A.ink }}
                  >
                    {t('دخول', 'Log in')}
                  </Link>
                  <ArcadeLink to="/register" size="sm" variant="solid">
                    {t('ابدأ الآن', 'Get started')}
                  </ArcadeLink>
                </div>
              )}
            </div>

            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="arc-focus flex h-9 w-9 items-center justify-center border-2 md:hidden"
              style={iconButtonStyle}
              aria-label={t('القائمة', 'Menu')}
              aria-expanded={mobileMenuOpen}
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile navigation */}
      {mobileMenuOpen && (
        <nav
          className="md:hidden"
          style={{ background: A.surface, borderTop: `2px solid ${A.line}` }}
        >
          <div className="mx-auto max-w-[1280px] px-5 py-4">
            <div className="flex flex-col">
              {navLinks.map((link) => (
                <Link
                  key={link.path}
                  to={link.path}
                  onClick={() => setMobileMenuOpen(false)}
                  className="arc-focus flex items-center justify-between py-3 text-[15px] font-bold"
                  style={{
                    color: A.ink,
                    borderBottom: `2px solid ${A.line}`,
                  }}
                >
                  {t(link.label.ar, link.label.en)}
                  {isActive(link.path) && (
                    <span className="h-2.5 w-2.5" style={{ background: A.accent }} />
                  )}
                </Link>
              ))}

              <div className="mt-5">
                {isLoading ? (
                  <ArcadeSkeleton className="h-11 w-full" />
                ) : isAuthenticated ? (
                  <div className="flex flex-col gap-3">
                    <ArcadeLink
                      to={getDashboardLink()}
                      variant="solid"
                      className="w-full"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      <LayoutDashboard className="h-4 w-4" />
                      {t('لوحتي', 'My dashboard')}
                    </ArcadeLink>
                    <button
                      onClick={() => {
                        setMobileMenuOpen(false);
                        handleSignOut();
                      }}
                      className="arc-focus arc-press flex w-full items-center justify-center gap-2 border-2 px-7 py-3.5 text-[15px] font-black"
                      style={{ background: A.surface, color: A.ink, borderColor: A.line }}
                    >
                      <LogOut className="h-4 w-4" />
                      {t('تسجيل الخروج', 'Sign out')}
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-col gap-3">
                    <ArcadeLink
                      to="/register"
                      variant="solid"
                      className="w-full"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      {t('ابدأ الآن', 'Get started')}
                    </ArcadeLink>
                    <ArcadeLink
                      to="/login"
                      variant="outline"
                      className="w-full"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      <LogIn className="h-4 w-4" />
                      {t('دخول', 'Log in')}
                    </ArcadeLink>
                  </div>
                )}
              </div>
            </div>
          </div>
        </nav>
      )}
    </header>
  );
};

export default Header;
