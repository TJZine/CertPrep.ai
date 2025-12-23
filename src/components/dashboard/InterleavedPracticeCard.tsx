"use client";

import * as React from "react";
import { Shuffle, ArrowRight } from "lucide-react";
import Link from "next/link";
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
    CardDescription,
} from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";

interface InterleavedPracticeCardProps {
    /** Optional class name for styling. */
    className?: string;
}

/**
 * Card promoting Interleaved Practice mode on the dashboard.
 * Provides quick access to mixed-quiz practice sessions.
 */
export function InterleavedPracticeCard({
    className,
}: InterleavedPracticeCardProps): React.ReactElement {
    return (
        <Card className={cn("border-primary/20", className)}>
            <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                    <Shuffle className="h-5 w-5 text-primary" aria-hidden="true" />
                    Interleaved Practice
                </CardTitle>
                <CardDescription>
                    Mix questions from multiple quizzes for better retention
                </CardDescription>
            </CardHeader>
            <CardContent>
                <Link href="/interleaved" className="block">
                    <Button
                        className="w-full"
                        variant="outline"
                        rightIcon={<ArrowRight className="h-4 w-4" />}
                    >
                        Start Practice
                    </Button>
                </Link>
            </CardContent>
        </Card>
    );
}

export default InterleavedPracticeCard;
