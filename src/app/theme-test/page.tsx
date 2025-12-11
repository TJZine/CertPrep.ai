"use client";

import React from "react";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader, CardTitle, CardContent, CardFooter, CardDescription } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";

export default function ThemeTestPage(): React.ReactElement {
    return (
        <div className="container py-10 space-y-12 max-w-5xl mx-auto">
            <div className="space-y-4 text-center">
                <h1 className="text-4xl font-bold tracking-tight">Theme System Verification</h1>
                <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
                    Use the Theme Picker in the header to cycle through themes. Verify that all components below match the intended aesthetic.
                </p>
            </div>

            <section className="space-y-6">
                <h2 className="text-2xl font-bold border-b pb-2">1. Badges</h2>
                <div className="flex flex-wrap gap-4">
                    <Badge>Default</Badge>
                    <Badge variant="secondary">Secondary</Badge>
                    <Badge variant="outline">Outline</Badge>
                    <Badge variant="destructive">Destructive</Badge>
                    <Badge variant="success">Success</Badge>
                    <Badge variant="warning">Warning</Badge>
                </div>
            </section>

            <section className="space-y-6">
                <h2 className="text-2xl font-bold border-b pb-2">2. Buttons</h2>
                <div className="flex flex-wrap gap-4 items-center">
                    <Button>Primary</Button>
                    <Button variant="secondary">Secondary</Button>
                    <Button variant="outline">Outline</Button>
                    <Button variant="ghost">Ghost</Button>
                    <Button variant="danger">Danger</Button>
                    <Button variant="success">Success</Button>
                    <Button variant="warning">Warning</Button>
                    <Button disabled>Disabled</Button>
                    <Button isLoading>Loading</Button>
                </div>
                <div className="flex flex-wrap gap-4 items-center">
                    <Button size="sm">Small</Button>
                    <Button size="default">Default</Button>
                    <Button size="lg">Large</Button>
                    <Button size="xl">Extra Large</Button>
                </div>
            </section>

            <section className="space-y-6">
                <h2 className="text-2xl font-bold border-b pb-2">3. Cards</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Standard Card</CardTitle>
                            <CardDescription>Default card style</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <p>This is standard card content using text-card-foreground.</p>
                        </CardContent>
                        <CardFooter>
                            <Button size="sm">Action</Button>
                        </CardFooter>
                    </Card>

                    <Card hoverable className="cursor-pointer">
                        <CardHeader>
                            <CardTitle>Hoverable Card</CardTitle>
                            <CardDescription>Interactivity test</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <p>Hover over this card to see theme-specific hover effects.</p>
                        </CardContent>
                        <CardFooter>
                            <Badge>Hover me</Badge>
                        </CardFooter>
                    </Card>

                    <Card className="bg-muted">
                        <CardHeader>
                            <CardTitle>Muted Card</CardTitle>
                            <CardDescription>Using bg-muted</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <p>This card sits on a muted background color.</p>
                        </CardContent>
                    </Card>
                </div>
            </section>

            <section className="space-y-6">
                <h2 className="text-2xl font-bold border-b pb-2">4. Inputs & Forms</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-2xl">
                    <div className="space-y-2">
                        <label className="text-sm font-medium">Text Input</label>
                        <Input placeholder="Placeholder text..." />
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm font-medium">Disabled Input</label>
                        <Input disabled placeholder="Disabled..." />
                    </div>
                    <div className="space-y-2 md:col-span-2">
                        <label className="text-sm font-medium">Textarea</label>
                        <Textarea placeholder="Type something..." />
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm font-medium">Native Select</label>
                        <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50">
                            <option>Option 1</option>
                            <option>Option 2</option>
                            <option>Option 3</option>
                        </select>
                    </div>
                </div>
            </section>

            <section className="space-y-6">
                <h2 className="text-2xl font-bold border-b pb-2">5. Typography</h2>
                <div className="space-y-4 rounded-lg border p-6">
                    <h1 className="text-4xl font-extrabold tracking-tight lg:text-5xl">Heading 1</h1>
                    <h2 className="text-3xl font-semibold tracking-tight first:mt-0">Heading 2</h2>
                    <h3 className="text-2xl font-semibold tracking-tight">Heading 3</h3>
                    <h4 className="text-xl font-semibold tracking-tight">Heading 4</h4>
                    <p className="leading-7 [&:not(:first-child)]:mt-6">
                        The quick brown fox jumps over the lazy dog. Punctuation should be clear and readable.
                        <a href="#" className="font-medium text-primary underline underline-offset-4 hover:text-primary/80 ml-1">
                            This is an inline link
                        </a>.
                    </p>
                    <ul className="my-6 ml-6 list-disc [&>li]:mt-2">
                        <li>1st level of puns: 5 gold coins</li>
                        <li>2nd level of jokes: 10 gold coins</li>
                        <li>3rd level of one-liners : 20 gold coins</li>
                    </ul>
                </div>
            </section>

            <section className="space-y-6">
                <h2 className="text-2xl font-bold border-b pb-2">6. Color Swatches</h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                    <div className="h-24 rounded bg-background border flex items-center justify-center text-xs font-mono">background</div>
                    <div className="h-24 rounded bg-card border flex items-center justify-center text-xs font-mono">card</div>
                    <div className="h-24 rounded bg-popover border flex items-center justify-center text-xs font-mono">popover</div>
                    <div className="h-24 rounded bg-primary text-primary-foreground flex items-center justify-center text-xs font-mono">primary</div>
                    <div className="h-24 rounded bg-secondary text-secondary-foreground flex items-center justify-center text-xs font-mono">secondary</div>
                    <div className="h-24 rounded bg-muted text-muted-foreground flex items-center justify-center text-xs font-mono">muted</div>
                    <div className="h-24 rounded bg-accent text-accent-foreground flex items-center justify-center text-xs font-mono">accent</div>
                    <div className="h-24 rounded bg-destructive text-destructive-foreground flex items-center justify-center text-xs font-mono">destructive</div>
                </div>
            </section>
        </div>
    );
}
