"use client";

import dynamic from "next/dynamic";
import { DashboardSkeleton } from "@/components/dashboard/DashboardSkeleton";

/**
 * DashboardLoader - Client-side dynamic loader for the Dashboard.
 * 
 * This component is a thin client wrapper that:
 * 1. Uses dynamic() with ssr:false to prevent server-rendering DashboardClient
 * 2. Shows DashboardSkeleton during the loading phase
 * 3. Is itself a client component, allowing the parent page to be a Server Component
 * 
 * The skeleton is rendered immediately by the client while DashboardClient code loads.
 * This improves perceived performance as users see UI structure instantly.
 */
const DashboardClient = dynamic(
    () => import("@/components/dashboard/DashboardClient"),
    {
        ssr: false,
        loading: () => <DashboardSkeleton quizCardCount={0} />,
    }
);

export function DashboardLoader(): React.ReactElement {
    return <DashboardClient />;
}

export default DashboardLoader;
