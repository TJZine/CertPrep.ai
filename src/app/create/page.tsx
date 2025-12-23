import * as React from "react";
import { Metadata } from "next";
import { CreateGuideContent } from "@/components/create/CreateGuideContent";

export const metadata: Metadata = {
    title: "Create Your Own Tests | CertPrep.ai",
    description:
        "Generate custom certification practice tests using AI. Learn how to create, format, and import quizzes into CertPrep.ai.",
    openGraph: {
        title: "Create Your Own Tests | CertPrep.ai",
        description:
            "Generate custom certification practice tests using AI tools like Gemini and ChatGPT.",
    },
};

export default function CreatePage(): React.ReactElement {
    return <CreateGuideContent />;
}
