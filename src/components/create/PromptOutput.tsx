"use client";

import * as React from "react";
import { Copy, ExternalLink, Check } from "lucide-react";
import { copyToClipboard } from "@/lib/clipboard";
import { cn } from "@/lib/utils/cn";
import { GeminiIcon } from "@/components/icons/GeminiIcon";
import { OpenAIIcon } from "@/components/icons/OpenAIIcon";

interface PromptOutputProps {
    prompt: string;
}

const GEMINI_URL = "https://gemini.google.com/gem/1Oi-QnRrxQ_7a18s9SvyKxWX4ak52nPyI";
const CHATGPT_URL = "https://chatgpt.com/g/g-6948d766074c8191a09e7a8c723bf9b7-certprep-ai-test-creator";

export function PromptOutput({ prompt }: PromptOutputProps): React.ReactElement {
    const [copied, setCopied] = React.useState(false);
    const timeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

    React.useEffect(() => {
        return (): void => {
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }
        };
    }, []);

    const handleCopy = React.useCallback(async (): Promise<void> => {
        if (!prompt?.trim()) return;

        try {
            await copyToClipboard(prompt);
            setCopied(true);

            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }

            timeoutRef.current = setTimeout(() => {
                setCopied(false);
            }, 1500);
        } catch (error) {
            console.error("Copy to clipboard failed:", error);
        }
    }, [prompt]);

    return (
        <div className="flex flex-col h-full rounded-2xl border bg-card/50 backdrop-blur-sm overflow-hidden shadow-sm">
            <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/30">
                <span className="text-sm font-semibold">Generated Prompt</span>
                <button
                    type="button"
                    onClick={() => {
                        void handleCopy();
                    }}
                    className={cn(
                        "inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors",
                        copied ? "bg-success/10 text-success" : "bg-primary text-primary-foreground hover:bg-primary/90"
                    )}
                >
                    {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    {copied ? "Copied!" : "Copy Prompt"}
                </button>
            </div>

            <div className="flex-1 p-4 overflow-y-auto min-h-[400px]">
                <pre className="font-mono text-sm whitespace-pre-wrap break-words text-muted-foreground">
                    {prompt || "Adjust settings on the left to generate your prompt..."}
                </pre>
            </div>

            <div className="p-4 border-t bg-muted/10">
                <p className="text-xs text-muted-foreground mb-3 text-center">Open your preferred AI to generate</p>
                <div className="grid grid-cols-2 gap-3">
                    <a href={GEMINI_URL} target="_blank" rel="noreferrer" className="flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl border bg-card hover:bg-muted/50 transition-colors text-sm font-medium">
                        <GeminiIcon size={16} /> Gemini <ExternalLink className="h-3 w-3 opacity-50" />
                    </a>
                    <a href={CHATGPT_URL} target="_blank" rel="noreferrer" className="flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl border bg-card hover:bg-muted/50 transition-colors text-sm font-medium">
                        <OpenAIIcon size={16} /> ChatGPT <ExternalLink className="h-3 w-3 opacity-50" />
                    </a>
                </div>
            </div>
        </div>
    );
}
