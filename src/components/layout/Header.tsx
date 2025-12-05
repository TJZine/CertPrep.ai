"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Menu,
  X,
  LogOut,
  Home,
  BarChart3,
  Library,
  Settings as SettingsIcon,
  User as UserIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { lockBodyScroll, unlockBodyScroll } from "@/lib/bodyScrollLock";
import { ThemeToggleButton } from "@/components/common/ThemeToggleButton";
import { useAuth } from "@/components/providers/AuthProvider";
import { Button, buttonVariants } from "@/components/ui/Button";
import { Logo } from "@/components/common/Logo";
import { useToast } from "@/components/ui/Toast";

import { logger } from "@/lib/logger";

const navigation = [
  { name: "Dashboard", href: "/", icon: Home, public: true },
  { name: "Analytics", href: "/analytics", icon: BarChart3, public: true },
  { name: "Library", href: "/library", icon: Library, public: true },
  { name: "Settings", href: "/settings", icon: SettingsIcon, public: false },
];

export function Header(): React.ReactElement {
  const pathname = usePathname();
  const { user, signOut } = useAuth();
  const { addToast } = useToast();




  const [isMenuOpen, setIsMenuOpen] = React.useState(false);
  const [scrolled, setScrolled] = React.useState(false);
  const handleCloseMenu = React.useCallback(
    (): void => setIsMenuOpen(false),
    [],
  );
  const menuItemTabIndex = isMenuOpen ? 0 : -1;

  // Handle scroll effect for glassmorphism border
  React.useEffect((): (() => void) => {
    const handleScroll = (): void => {
      setScrolled(window.scrollY > 0);
    };

    handleScroll(); // initialize on mount
    window.addEventListener("scroll", handleScroll);

    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Close mobile menu on route change
  React.useEffect((): void => {
    setIsMenuOpen(false);
  }, [pathname]);

  // Lock body scroll when mobile menu is open
  React.useEffect(() => {
    if (!isMenuOpen) {
      return;
    }

    lockBodyScroll();

    return (): void => {
      unlockBodyScroll();
    };
  }, [isMenuOpen]);

  const [isSigningOut, setIsSigningOut] = React.useState(false);

  const handleSignOut = async (): Promise<void> => {
    if (isSigningOut) return;

    setIsSigningOut(true);
    setIsMenuOpen(false);

    try {
      const result = await signOut();
      if (!result.success) {
        addToast(
          "error",
          result.error ?? "Failed to sign out. Please try again.",
        );
        return;
      }
    } catch (error) {
      logger.error("Sign out failed", error);
      addToast("error", "Failed to sign out. Please try again.");
    } finally {
      setIsSigningOut(false);
    }
  };

  return (
    <header
      className={cn(
        "sticky top-0 z-50 w-full transition-all duration-200",
        "bg-white/80 dark:bg-slate-950/80 backdrop-blur-md",
        "border-b",
        scrolled
          ? "border-slate-200/50 dark:border-slate-800/50 shadow-sm"
          : "border-transparent",
      )}
    >
      <div className="container mx-auto flex h-16 items-center justify-between px-4 md:px-6">
        {/* Logo */}
        <div className="flex items-center gap-2">
          <Logo />
        </div>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-8">
          {navigation.map((item) => {
            // Show if public OR if user is authenticated
            if (!item.public && !user) return null;

            const isActive =
              pathname === item.href ||
              (item.href !== "/" && pathname.startsWith(item.href + "/"));
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "text-sm font-medium transition-colors duration-200",
                  isActive
                    ? "text-blue-600 dark:text-blue-400"
                    : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100",
                )}
                aria-current={isActive ? "page" : undefined}
              >
                {item.name}
              </Link>
            );
          })}
        </nav>

        {/* Desktop Actions */}
        <div className="hidden md:flex items-center gap-4">
          <ThemeToggleButton />

          {user ? (
            <div className="flex items-center gap-4 pl-4 border-l border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                <UserIcon className="h-4 w-4" />
                <span className="max-w-[150px] truncate">{user.email}</span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleSignOut}
                isLoading={isSigningOut}
                disabled={isSigningOut}
                className="text-slate-600 hover:text-red-600 hover:bg-red-50 dark:text-slate-400 dark:hover:text-red-400 dark:hover:bg-red-900/20"
              >
                Sign Out
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <Link
                href="/login"
                className={cn(
                  buttonVariants({ variant: "ghost", size: "sm" }),
                  "font-medium",
                )}
              >
                Log In
              </Link>
              <Link
                href="/signup"
                className={cn(
                  buttonVariants({ size: "sm" }),
                  "font-medium shadow-sm",
                )}
              >
                Sign Up
              </Link>
            </div>
          )}
        </div>

        {/* Mobile Menu Button */}
        <div className="flex items-center gap-4 md:hidden">
          <ThemeToggleButton />
          <button
            type="button"
            className="inline-flex h-10 w-10 items-center justify-center rounded-md text-slate-700 transition hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 dark:text-slate-200 dark:hover:bg-slate-800"
            onClick={(): void => setIsMenuOpen((prev) => !prev)}
            aria-expanded={isMenuOpen}
            aria-label="Toggle menu"
          >
            {isMenuOpen ? (
              <X className="h-6 w-6" />
            ) : (
              <Menu className="h-6 w-6" />
            )}
          </button>
        </div>
      </div>

      {/* Mobile Navigation Sheet */}
      <div
        inert={!isMenuOpen ? true : undefined}
        className={cn(
          "fixed inset-x-0 top-16 bottom-0 z-40 bg-white dark:bg-slate-950 md:hidden transition-transform duration-300 ease-in-out",
          isMenuOpen ? "translate-x-0" : "translate-x-full",
        )}
        aria-hidden={!isMenuOpen}
      >
        <div className="flex flex-col h-full overflow-y-auto p-6 space-y-6">
          <nav className="flex flex-col space-y-2">
            {navigation.map((item) => {
              if (!item.public && !user) return null;

              const isActive =
                pathname === item.href ||
                (item.href !== "/" && pathname.startsWith(item.href + "/"));
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={handleCloseMenu}
                  tabIndex={menuItemTabIndex}
                  className={cn(
                    "flex items-center gap-3 px-4 py-3 rounded-lg text-base font-medium transition-colors",
                    isActive
                      ? "bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300"
                      : "text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800",
                  )}
                >
                  <Icon className="h-5 w-5" />
                  {item.name}
                </Link>
              );
            })}
          </nav>

          <div className="border-t border-slate-200 dark:border-slate-800 pt-6 mt-auto">
            {user ? (
              <div className="space-y-4">
                <div className="flex items-center gap-3 px-4 py-2">
                  <div className="h-10 w-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400">
                    <UserIcon className="h-5 w-5" />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-sm font-medium text-slate-900 dark:text-slate-100">
                      Account
                    </span>
                    <span className="text-xs text-slate-500 dark:text-slate-400">
                      {user.email}
                    </span>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  className="w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
                  onClick={handleSignOut}
                  isLoading={isSigningOut}
                  disabled={isSigningOut}
                  tabIndex={menuItemTabIndex}
                  leftIcon={<LogOut className="h-4 w-4" />}
                >
                  Sign Out
                </Button>
              </div>
            ) : (
              <div className="grid gap-4">
                <Link
                  href="/login"
                  onClick={handleCloseMenu}
                  tabIndex={menuItemTabIndex}
                  className={cn(
                    buttonVariants({ variant: "outline" }),
                    "w-full justify-center h-11 text-base",
                  )}
                >
                  Log In
                </Link>
                <Link
                  href="/signup"
                  onClick={handleCloseMenu}
                  tabIndex={menuItemTabIndex}
                  className={cn(
                    buttonVariants(),
                    "w-full justify-center h-11 text-base shadow-sm",
                  )}
                >
                  Sign Up
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}

export default Header;
