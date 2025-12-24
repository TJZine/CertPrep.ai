import { Suspense } from "react";
import { DashboardSkeleton } from "@/components/dashboard/DashboardSkeleton";
import DashboardLoader from "@/components/dashboard/DashboardLoader";

/**
 * Dashboard Page - Optimized for LCP
 * 
 * Architecture for performance:
 * 1. This page is a Server Component
 * 2. Suspense boundary with DashboardSkeleton as fallback
 * 3. DashboardLoader is a client component that dynamically loads DashboardClient
 * 
 * Why this works:
 * - Server sends skeleton HTML immediately (faster FCP/LCP)  
 * - Suspense + streaming enables progressive hydration
 * - DashboardLoader uses ssr:false so client-only code doesn't block SSR
 * - Skeleton matches loading state (no hydration mismatch)
 * - Offline-first architecture preserved (all data from IndexedDB)
 * 
 * LCP Element: The skeleton's EmptyState text is rendered server-side,
 * painting immediately vs waiting for ~500KB JS to parse/execute.
 */
export default function DashboardPage(): React.ReactElement {
  return (
    <Suspense fallback={<DashboardSkeleton quizCardCount={0} />}>
      <DashboardLoader />
    </Suspense>
  );
}
