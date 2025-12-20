import { Card, CardHeader, CardContent, CardFooter } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";

export function QuizCardSkeleton(): React.ReactElement {
    return (
        <Card className="h-full overflow-hidden" role="status" aria-label="Loading quiz card">
            <CardHeader className="gap-2">
                <Skeleton className="h-6 w-3/4" aria-hidden="true" />
                <Skeleton className="h-4 w-1/2" aria-hidden="true" />
                <div className="flex gap-2 mt-2">
                    <Skeleton className="h-5 w-16 rounded-full" aria-hidden="true" />
                    <Skeleton className="h-5 w-16 rounded-full" aria-hidden="true" />
                </div>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="grid grid-cols-3 gap-2">
                    <div className="flex flex-col items-center gap-1">
                        <Skeleton className="h-8 w-8 rounded-md" aria-hidden="true" />
                        <Skeleton className="h-3 w-12" aria-hidden="true" />
                    </div>
                    <div className="flex flex-col items-center gap-1">
                        <Skeleton className="h-8 w-8 rounded-md" aria-hidden="true" />
                        <Skeleton className="h-3 w-12" aria-hidden="true" />
                    </div>
                    <div className="flex flex-col items-center gap-1">
                        <Skeleton className="h-8 w-8 rounded-md" aria-hidden="true" />
                        <Skeleton className="h-3 w-12" aria-hidden="true" />
                    </div>
                </div>
                <Skeleton className="h-8 w-full rounded-md" aria-hidden="true" />
            </CardContent>
            <CardFooter>
                <Skeleton className="h-10 w-full" aria-hidden="true" />
            </CardFooter>
        </Card>
    );
}
