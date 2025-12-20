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
import { ThemePalette } from "@/components/common/ThemePalette";
import { useAuth } from "@/components/providers/AuthProvider";
import { Button, buttonVariants } from "@/components/ui/Button";
import { Logo } from "@/components/common/Logo";
import { SyncStatusIndicator } from "@/components/common/SyncStatusIndicator";
import { useToast } from "@/components/ui/Toast";

import { logger } from "@/lib/logger";

const navigation = [
  { name: "Dashboard", href: "/", icon: Home, public: true },
  { name: "Analytics", href: "/analytics", icon: BarChart3, public: true },
  { name: "Library", href: "/library", icon: Library, public: true },
  { name: "Settings", href: "/settings", icon: SettingsIcon, public: false },
];

function isRouteActive(pathname: string, href: string): boolean {
  return (
    pathname === href || (href !== "/" && pathname.startsWith(href + "/"))
  );
}

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
    window.addEventListener("scroll", handleScroll, { passive: true });

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
        logger.warn("Sign out returned unsuccessful result", result);
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
        "glass",
        scrolled
          ? "border-border shadow-sm"
          : "border-transparent",
      )}
    >
      <div className="container mx-auto flex h-16 items-center justify-between px-4 md:px-6">
        {/* Logo */}
        <Link
          href="/"
          className="flex items-center gap-2 transition-all hover:opacity-90 hover:scale-105 active:scale-95 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        >
          <Logo />
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-8 ml-12" aria-label="Main navigation">
          {navigation.map((item) => {
            // Show if public OR if user is authenticated
            if (!item.public && !user) return null;

            const isActive = isRouteActive(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "text-sm font-medium transition-colors duration-200",
                  isActive
                    ? "text-primary"
                    : "text-muted-foreground hover:text-foreground",
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
          <ThemePalette />

          {user ? (
            <div className="flex items-center gap-4 pl-4 border-l border-border">
              <SyncStatusIndicator />
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <UserIcon className="h-4 w-4" />
                <span className="max-w-[150px] truncate">{user.email}</span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleSignOut}
                isLoading={isSigningOut}
                disabled={isSigningOut}
                className="text-muted-foreground hover:text-destructive hover:bg-destructive/10"
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
          <ThemePalette />
          <button
            type="button"
            className="inline-flex h-10 w-10 items-center justify-center rounded-md text-foreground transition hover:bg-accent focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            onClick={(): void => setIsMenuOpen((prev) => !prev)}
            aria-expanded={isMenuOpen}
            aria-controls="mobile-nav"
            aria-label={isMenuOpen ? "Close menu" : "Open menu"}
          >
            <span className="relative h-6 w-6">
              <Menu
                className={cn(
                  "absolute inset-0 h-6 w-6 transition-all duration-200",
                  isMenuOpen ? "rotate-90 opacity-0" : "rotate-0 opacity-100"
                )}
              />
              <X
                className={cn(
                  "absolute inset-0 h-6 w-6 transition-all duration-200",
                  isMenuOpen ? "rotate-0 opacity-100" : "-rotate-90 opacity-0"
                )}
              />
            </span>
          </button>
        </div>
      </div>

      {/* Mobile Navigation Sheet */}
      <div
        inert={!isMenuOpen ? true : undefined}
        className={cn(
          "fixed inset-x-0 top-[var(--header-height)] z-40 bg-background/95 backdrop-blur-xl md:hidden transition-[transform,opacity] duration-300 ease-in-out h-[calc(100dvh-var(--header-height))] min-h-[calc(100vh-var(--header-height))]",
          isMenuOpen ? "translate-x-0 opacity-100" : "translate-x-full opacity-0",
        )}
        aria-hidden={!isMenuOpen}
        id="mobile-nav"
      >
        <div className="flex flex-col h-full overflow-y-auto p-6 space-y-6">
          <nav className="flex flex-col space-y-2">
            {navigation.map((item) => {
              if (!item.public && !user) return null;

              const isActive = isRouteActive(pathname, item.href);
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
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:bg-accent hover:text-foreground",
                  )}
                >
                  <Icon className="h-5 w-5" aria-hidden="true" />
                  {item.name}
                </Link>
              );
            })}
          </nav>

          <div className="border-t border-border pt-6 mt-auto">
            {user ? (
              <div className="space-y-4">
                <div className="flex items-center gap-3 px-4 py-2">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                    <UserIcon className="h-5 w-5" />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-sm font-medium text-foreground">
                      Account
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {user.email}
                    </span>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  className="w-full justify-start text-destructive hover:text-destructive hover:bg-destructive/10"
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
