import * as React from "react";
import { Metadata } from "next";
import { CreateBuilder } from "@/components/create/CreateBuilder";

export const metadata: Metadata = {
    title: "Create Your Own Tests | CertPrep.ai",
    description: "Generate custom certification practice tests using AI.",
    openGraph: {
        title: "Create Your Own Tests | CertPrep.ai",
        description: "Generate custom certification practice tests using AI.",
    },
};

export default function CreatePage(): React.ReactElement {
    return <CreateBuilder />;
}
