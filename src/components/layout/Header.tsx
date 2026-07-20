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
  PlusCircle,
  Settings as SettingsIcon,
  User as UserIcon,
} from "lucide-react";
import { cn } from "@/lib/utils/cn";
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
  { name: "Create", href: "/create", icon: PlusCircle, public: true },
  { name: "Settings", href: "/settings", icon: SettingsIcon, public: false },
];

const focusableMenuSelector =
  'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])';

function isRouteActive(pathname: string, href: string): boolean {
  return (
    pathname === href || (href !== "/" && pathname.startsWith(href + "/"))
  );
}

export function Header(): React.ReactElement {
  const pathname = usePathname();
  const { user, signOut } = useAuth();
  const { addToast } = useToast();
  const logoRef = React.useRef<HTMLAnchorElement>(null);
  const menuTriggerRef = React.useRef<HTMLButtonElement>(null);
  const mobileNavRef = React.useRef<HTMLDivElement>(null);

  const [openMenuPathname, setOpenMenuPathname] = React.useState<string | null>(
    null,
  );
  const isMenuOpen = openMenuPathname === pathname;
  const [scrolled, setScrolled] = React.useState(false);
  const handleCloseMenu = React.useCallback(
    (): void => setOpenMenuPathname(null),
    [],
  );
  const handleToggleMenu = React.useCallback((): void => {
    setOpenMenuPathname((currentPathname) =>
      currentPathname === pathname ? null : pathname,
    );
  }, [pathname]);
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

  React.useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Clears stale mobile-menu route state after App Router navigation.
    setOpenMenuPathname((current) =>
      current === null || current === pathname ? current : null,
    );
  }, [pathname]);

  React.useEffect(() => {
    if (!isMenuOpen) {
      return;
    }

    const getFocusableMenuItems = (): HTMLElement[] =>
      Array.from(
        mobileNavRef.current?.querySelectorAll<HTMLElement>(
          focusableMenuSelector,
        ) ?? [],
      ).filter((element) => element.tabIndex >= 0);

    getFocusableMenuItems()[0]?.focus();

    const handleMenuKeyDown = (event: KeyboardEvent): void => {
      if (event.key === "Escape") {
        event.preventDefault();
        handleCloseMenu();
        menuTriggerRef.current?.focus();
        return;
      }

      if (event.key !== "Tab") {
        return;
      }

      const focusableItems = getFocusableMenuItems();
      const firstItem = focusableItems[0];
      const lastItem = focusableItems.at(-1);

      if (!firstItem || !lastItem) {
        event.preventDefault();
        return;
      }

      if (!mobileNavRef.current?.contains(document.activeElement)) {
        event.preventDefault();
        (event.shiftKey ? lastItem : firstItem).focus();
      } else if (event.shiftKey && document.activeElement === firstItem) {
        event.preventDefault();
        lastItem.focus();
      } else if (!event.shiftKey && document.activeElement === lastItem) {
        event.preventDefault();
        firstItem.focus();
      }
    };

    document.addEventListener("keydown", handleMenuKeyDown);

    return (): void => {
      document.removeEventListener("keydown", handleMenuKeyDown);
    };
  }, [handleCloseMenu, isMenuOpen]);

  React.useEffect(() => {
    if (!isMenuOpen) {
      return;
    }

    const desktopMediaQuery = window.matchMedia("(min-width: 1280px)");
    const handleDesktopTransition = (event: MediaQueryListEvent): void => {
      if (!event.matches) {
        return;
      }

      handleCloseMenu();
      logoRef.current?.focus();
    };

    desktopMediaQuery.addEventListener("change", handleDesktopTransition);

    return (): void => {
      desktopMediaQuery.removeEventListener("change", handleDesktopTransition);
    };
  }, [handleCloseMenu, isMenuOpen]);

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
    handleCloseMenu();

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
      if (result.error) {
        addToast("warning", result.error);
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
          ref={logoRef}
          href="/"
          className="flex items-center gap-2 transition-all hover:opacity-90 hover:scale-105 active:scale-95 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        >
          <Logo />
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden xl:flex items-center gap-8 ml-12" aria-label="Main navigation">
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
        <div className="hidden xl:flex items-center gap-4">
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
        <div className="flex items-center gap-4 xl:hidden">
          <ThemePalette />
          <button
            ref={menuTriggerRef}
            type="button"
            className="inline-flex h-10 w-10 items-center justify-center rounded-md text-foreground transition hover:bg-accent focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            onClick={handleToggleMenu}
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
        ref={mobileNavRef}
        inert={!isMenuOpen ? true : undefined}
        className={cn(
          "fixed inset-x-0 top-[var(--header-height,4rem)] z-40 h-[calc(100dvh-var(--header-height,4rem))] min-h-[calc(100vh-var(--header-height,4rem))] bg-background/95 backdrop-blur-xl transition-[transform,opacity] duration-300 ease-in-out xl:hidden",
          isMenuOpen
            ? "translate-y-0 opacity-100"
            : "pointer-events-none -translate-y-2 opacity-0",
        )}
        role="dialog"
        aria-label="Navigation menu"
        aria-modal="true"
        aria-hidden={!isMenuOpen}
        id="mobile-nav"
      >
        <div className="flex h-full flex-col space-y-6 overflow-x-hidden overflow-y-auto p-6">
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
                <div className="flex min-w-0 items-center gap-3 px-4 py-2">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                    <UserIcon className="h-5 w-5" />
                  </div>
                  <div className="flex min-w-0 flex-col">
                    <span className="text-sm font-medium text-foreground">
                      Account
                    </span>
                    <span className="truncate text-xs text-muted-foreground">
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
