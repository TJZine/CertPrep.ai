'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu, X, LogOut, Moon, Sun, Home, BarChart3, Library, Settings as SettingsIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { lockBodyScroll, unlockBodyScroll } from '@/lib/bodyScrollLock';
import { useAuth } from '@/components/providers/AuthProvider';
import { Button } from '@/components/ui/Button';

const navigation = [
  { name: 'Dashboard', href: '/', icon: Home },
  { name: 'Analytics', href: '/analytics', icon: BarChart3 },
  { name: 'Library', href: '/library', icon: Library },
  { name: 'Settings', href: '/settings', icon: SettingsIcon },
];



/**
 * Sticky application header with main navigation.
 */
export function Header(): React.ReactElement {
  const pathname = usePathname();
  const { user, signOut } = useAuth();
  const [isMenuOpen, setIsMenuOpen] = React.useState(false);
  const mobilePanelId = React.useId();
  const firstMobileLinkRef = React.useRef<HTMLAnchorElement>(null);
  const toggleButtonRef = React.useRef<HTMLButtonElement>(null);
  const mobilePanelRef = React.useRef<HTMLDivElement>(null);

  React.useEffect((): void => {
    // Close the mobile menu when navigating
    setIsMenuOpen(false);
  }, [pathname]);

  React.useEffect((): (() => void) | void => {
    if (!isMenuOpen) return;
    lockBodyScroll();
    return () => {
      unlockBodyScroll();
    };
  }, [isMenuOpen]);

  React.useEffect(() => {
    const panel = mobilePanelRef.current;
    if (!panel) return;

    if (isMenuOpen) {
      panel.removeAttribute('inert');
    } else {
      panel.setAttribute('inert', '');
    }
  }, [isMenuOpen]);

  React.useEffect((): (() => void) | undefined => {
    if (!isMenuOpen) return undefined;

    const panelElements = mobilePanelRef.current
      ? Array.from(
          mobilePanelRef.current.querySelectorAll<HTMLElement>(
            'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])',
          ),
        )
      : [];

    const focusableList = (
      [toggleButtonRef.current, ...panelElements] as Array<HTMLElement | null>
    ).filter((el): el is HTMLElement => Boolean(el));

    (firstMobileLinkRef.current ?? focusableList[0])?.focus();

    const handleKeyDown = (event: KeyboardEvent): void => {
      if (!isMenuOpen) return;
      if (event.key === 'Escape') {
        event.preventDefault();
        setIsMenuOpen(false);
        toggleButtonRef.current?.focus();
        return;
      }

      if (event.key === 'Tab') {
        if (!focusableList.length) return;
        const first = focusableList[0];
        const last = focusableList[focusableList.length - 1];
        if (!first || !last) return;
        if (event.shiftKey) {
          if (document.activeElement === first) {
            event.preventDefault();
            last.focus();
          }
        } else if (document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return (): void => document.removeEventListener('keydown', handleKeyDown);
  }, [isMenuOpen]);

  // Placeholder for theme toggle logic if next-themes is not available
  // const [theme, setTheme] = React.useState('light');

  const handleSignOut = async (): Promise<void> => {
    setIsMenuOpen(false);
    const result = await signOut();
    if (!result.success && result.error) {
      console.error('Sign out failed:', result.error);
    }
  };

  const handleThemeToggle = (): void => {
    // This is a placeholder. Real implementation should likely use a context or local storage
    // consistent with ThemeToggle.tsx
    // setTheme(prev => prev === 'dark' ? 'light' : 'dark');
    document.documentElement.classList.toggle('dark');
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 items-center">
        <div className="mr-4 hidden md:flex">
          <Link href="/" className="mr-6 flex items-center space-x-2">
            <span className="hidden font-bold sm:inline-block">CertPrep.ai</span>
          </Link>
          <nav className="flex items-center space-x-6 text-sm font-medium">
            <Link
              href="/docs"
              className={cn(
                'transition-colors hover:text-foreground/80',
                pathname === '/docs' ? 'text-foreground' : 'text-foreground/60'
              )}
            >
              Docs
            </Link>
          </nav>
        </div>
        <div className="flex flex-1 items-center justify-between space-x-2 md:justify-end">
          <div className="w-full flex-1 md:w-auto md:flex-none">
            {/* Search could go here */}
          </div>
          <nav className="flex items-center">
            {user ? (
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground hidden sm:inline-block">
                  {user.email}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleSignOut}
                  className="text-slate-600 hover:text-red-600 dark:text-slate-200 dark:hover:text-red-400"
                  leftIcon={<LogOut className="h-4 w-4" />}
                >
                  Sign Out
                </Button>
              </div>
            ) : (
              <Link href="/login">
                <Button variant="ghost" size="sm">
                  Log In
                </Button>
              </Link>
            )}
            <Button
              variant="ghost"
              size="icon"
              aria-label="Toggle Theme"
              className="mr-6"
              onClick={handleThemeToggle}
            >
              <Sun className="h-6 w-6 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
              <Moon className="absolute h-6 w-6 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
              <span className="sr-only">Toggle Theme</span>
            </Button>
          </nav>
          <button
            ref={toggleButtonRef}
            type="button"
            className="inline-flex h-10 w-10 items-center justify-center rounded-md text-slate-700 transition hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 dark:text-slate-200 dark:hover:bg-slate-800 dark:focus-visible:ring-offset-slate-900 md:hidden"
            aria-label={isMenuOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={isMenuOpen}
            aria-controls={mobilePanelId}
            onClick={() => setIsMenuOpen((open) => !open)}
          >
            {isMenuOpen ? <X className="h-5 w-5" aria-hidden="true" /> : <Menu className="h-5 w-5" aria-hidden="true" />}
          </button>
        </div>
      </div>

      {/* Mobile nav panel */}
      <div
        ref={mobilePanelRef}
        id={mobilePanelId}
        aria-hidden={!isMenuOpen}
        className={cn(
          'md:hidden',
          isMenuOpen ? 'max-h-screen opacity-100' : 'max-h-0 opacity-0',
          'overflow-hidden transition-all duration-200 ease-out',
        )}
      >
        <div className="space-y-1 border-t border-slate-200 bg-white px-4 py-3 dark:border-slate-800 dark:bg-slate-900">
          <nav aria-label="Mobile navigation" className="space-y-1">
            {user && navigation.map((item, index) => {
              const isActive =
                item.href === '/' ? pathname === '/' : pathname === item.href || pathname.startsWith(`${item.href}/`);
              const Icon = item.icon;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={() => setIsMenuOpen(false)}
                  className={cn(
                    'flex items-center gap-3 rounded-lg px-3 py-3 text-base font-medium',
                    isActive
                      ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/40 dark:text-blue-100'
                      : 'text-slate-700 hover:bg-slate-100 dark:text-slate-100 dark:hover:bg-slate-800',
                  )}
                  aria-current={isActive ? 'page' : undefined}
                  ref={index === 0 ? firstMobileLinkRef : undefined}
                >
                  <Icon className="h-5 w-5" aria-hidden="true" />
                  <span>{item.name}</span>
                </Link>
              );
            })}
            
            {!user && (
              <div className="grid grid-cols-2 gap-4 pt-4">
                <Link
                  href="/login"
                  onClick={() => setIsMenuOpen(false)}
                  className="flex items-center justify-center rounded-lg bg-slate-100 px-4 py-2 text-sm font-medium text-slate-900 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-50 dark:hover:bg-slate-700"
                >
                  Log In
                </Link>
                <Link
                  href="/signup"
                  onClick={() => setIsMenuOpen(false)}
                  className="flex items-center justify-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
                >
                  Sign Up
                </Link>
              </div>
            )}

            {user && (
              <button
                onClick={handleSignOut}
                className="flex w-full items-center gap-3 rounded-lg px-3 py-3 text-base font-medium text-slate-700 hover:bg-red-50 hover:text-red-700 dark:text-slate-100 dark:hover:bg-red-900/20 dark:hover:text-red-400"
              >
                <LogOut className="h-5 w-5" aria-hidden="true" />
                <span>Sign Out</span>
              </button>
            )}
          </nav>
        </div>
      </div>
    </header>
  );
}

export default Header;