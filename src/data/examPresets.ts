/**
 * Exam blueprint presets for category alignment guidance.
 *
 * Each preset contains the official domain structure and percentage weights
 * from the certification body's published exam blueprint. Users can select
 * a preset to generate a prompt modifier that instructs AI tools to use
 * only these categories for question generation.
 *
 * Sources are cited in comments. Weights are included for user reference
 * but the primary data is the category name array.
 *
 * @see https://cert-prep-ai.vercel.app/create
 */

export interface ExamPreset {
    /** Unique identifier for the preset */
    id: string;
    /** Display name shown in selector */
    name: string;
    /** Certification body or vendor */
    vendor: string;
    /** Exam code/version */
    examCode: string;
    /** Official domain categories with optional weights */
    domains: Array<{
        name: string;
        weight?: number; // percentage, e.g., 30 for 30%
    }>;
    /** Source URL for the official blueprint */
    sourceUrl?: string;
    /** Last verified date (YYYY-MM-DD) */
    lastVerified: string;
}

/**
 * Curated exam presets from official certification body blueprints.
 *
 * Adding new presets:
 * 1. Find the official exam guide/blueprint PDF from the certification body
 * 2. Extract domain names and percentage weights exactly as published
 * 3. Add source URL and verification date
 * 4. Keep domain names verbatim (including "Domain X:" prefixes if official)
 */
export const EXAM_PRESETS: ExamPreset[] = [
    // ═══════════════════════════════════════════════════════════════════════════
    // AWS CERTIFICATIONS
    // ═══════════════════════════════════════════════════════════════════════════
    {
        id: "aws_saa_c03",
        name: "AWS Solutions Architect Associate",
        vendor: "Amazon Web Services",
        examCode: "SAA-C03",
        domains: [
            { name: "Domain 1: Design Secure Architectures", weight: 30 },
            { name: "Domain 2: Design Resilient Architectures", weight: 26 },
            { name: "Domain 3: Design High-Performing Architectures", weight: 24 },
            { name: "Domain 4: Design Cost-Optimized Architectures", weight: 20 },
        ],
        sourceUrl: "https://d1.awsstatic.com/training-and-certification/docs-sa-assoc/AWS-Certified-Solutions-Architect-Associate_Exam-Guide.pdf",
        lastVerified: "2025-12-22",
    },

    // ═══════════════════════════════════════════════════════════════════════════
    // COMPTIA CERTIFICATIONS
    // ═══════════════════════════════════════════════════════════════════════════
    {
        id: "comptia_security_plus_sy0701",
        name: "CompTIA Security+",
        vendor: "CompTIA",
        examCode: "SY0-701",
        domains: [
            { name: "General Security Concepts", weight: 12 },
            { name: "Threats, Vulnerabilities, and Mitigations", weight: 22 },
            { name: "Security Architecture", weight: 18 },
            { name: "Security Operations", weight: 28 },
            { name: "Security Program Management and Oversight", weight: 20 },
        ],
        sourceUrl: "https://www.comptia.org/certifications/security",
        lastVerified: "2025-12-22",
    },
    {
        id: "comptia_network_plus_n10009",
        name: "CompTIA Network+",
        vendor: "CompTIA",
        examCode: "N10-009",
        domains: [
            { name: "Networking Concepts", weight: 23 },
            { name: "Network Implementation", weight: 20 },
            { name: "Network Operations", weight: 19 },
            { name: "Network Security", weight: 14 },
            { name: "Network Troubleshooting", weight: 24 },
        ],
        sourceUrl: "https://www.comptia.org/certifications/network",
        lastVerified: "2025-12-22",
    },
    {
        id: "comptia_a_plus_core1_2201101",
        name: "CompTIA A+ Core 1",
        vendor: "CompTIA",
        examCode: "220-1101",
        domains: [
            { name: "Mobile Devices", weight: 15 },
            { name: "Networking", weight: 20 },
            { name: "Hardware", weight: 25 },
            { name: "Virtualization and Cloud Computing", weight: 11 },
            { name: "Hardware and Network Troubleshooting", weight: 29 },
        ],
        sourceUrl: "https://www.comptia.org/certifications/a",
        lastVerified: "2025-12-22",
    },
    {
        id: "comptia_a_plus_core2_2201102",
        name: "CompTIA A+ Core 2",
        vendor: "CompTIA",
        examCode: "220-1102",
        domains: [
            { name: "Operating Systems", weight: 31 },
            { name: "Security", weight: 25 },
            { name: "Software Troubleshooting", weight: 22 },
            { name: "Operational Procedures", weight: 22 },
        ],
        sourceUrl: "https://www.comptia.org/certifications/a",
        lastVerified: "2025-12-22",
    },

    // ═══════════════════════════════════════════════════════════════════════════
    // PROJECT MANAGEMENT
    // ═══════════════════════════════════════════════════════════════════════════
    {
        id: "pmi_pmp",
        name: "Project Management Professional (PMP)",
        vendor: "PMI",
        examCode: "ECO 2021",
        domains: [
            { name: "People", weight: 42 },
            { name: "Process", weight: 50 },
            { name: "Business Environment", weight: 8 },
        ],
        sourceUrl: "https://www.pmi.org/certifications/project-management-pmp",
        lastVerified: "2025-12-22",
    },

    // ═══════════════════════════════════════════════════════════════════════════
    // CYBERSECURITY
    // ═══════════════════════════════════════════════════════════════════════════
    {
        id: "isc2_cissp",
        name: "CISSP",
        vendor: "ISC2",
        examCode: "2024",
        domains: [
            { name: "Security and Risk Management", weight: 16 },
            { name: "Asset Security", weight: 10 },
            { name: "Security Architecture and Engineering", weight: 13 },
            { name: "Communication and Network Security", weight: 13 },
            { name: "Identity and Access Management (IAM)", weight: 13 },
            { name: "Security Assessment and Testing", weight: 12 },
            { name: "Security Operations", weight: 13 },
            { name: "Software Development Security", weight: 10 },
        ],
        sourceUrl: "https://www.isc2.org/certifications/cissp",
        lastVerified: "2025-12-22",
    },

    // ═══════════════════════════════════════════════════════════════════════════
    // INSURANCE LICENSING
    // ═══════════════════════════════════════════════════════════════════════════
    {
        id: "insurance_personal_lines",
        name: "Insurance - Personal Lines",
        vendor: "State Licensing",
        examCode: "General",
        domains: [
            { name: "Policy Provisions & Contract Law" },
            { name: "Property Insurance" },
            { name: "Liability Insurance" },
            { name: "Auto Insurance" },
            { name: "Ethics & Regulations" },
            { name: "Underwriting & Risk" },
            { name: "Claims & Adjustments" },
        ],
        // General personal lines categories compiled from common state licensing standards.
        // No single authoritative blueprint URL - category weighting varies by state.
        lastVerified: "2025-12-22",
    },
    {
        id: "insurance_ma_personal_lines_1661",
        name: "MA Personal Lines (1661)",
        vendor: "Massachusetts Division of Insurance",
        examCode: "1661",
        domains: [
            { name: "General Insurance" },
            { name: "Property and Casualty Insurance Basics" },
            { name: "Insurance Regulation" },
            { name: "Homeowners Policy" },
            { name: "Dwelling Policy" },
            { name: "Auto Insurance" },
            { name: "Other Coverages and Options" },
        ],
        // Categories verified against actual MA Personal Lines exam results (2025).
        // No official public blueprint URL available.
        lastVerified: "2025-12-22",
    },
    {
        id: "insurance_life_health",
        name: "Insurance - Life & Health",
        vendor: "State Licensing",
        examCode: "General",
        domains: [
            { name: "Life Insurance Basics" },
            { name: "Life Insurance Policies" },
            { name: "Annuities" },
            { name: "Health Insurance Basics" },
            { name: "Health Insurance Policies" },
            { name: "Disability Income Insurance" },
            { name: "Group Insurance" },
            { name: "Ethics & Regulations" },
        ],
        // Standard life & health domains from NAIC model curriculum.
        // No single authoritative URL - exam content varies by state.
        lastVerified: "2025-12-22",
    },
];

/**
 * Generate a prompt modifier string from selected categories.
 * This text should be copied and pasted into AI tools to constrain
 * question category values.
 */
export function generatePromptModifier(categories: string[]): string {
    if (categories.length === 0) {
        return "";
    }

    const categoryList = categories.map((c) => `- ${c}`).join("\n");

    return `IMPORTANT: For the "category" field on each question, use ONLY one of these exact values:

${categoryList}

Do not invent new categories. Match each question to the most appropriate category above.`;
}

/**
 * Get preset by ID.
 * @remarks Reserved for future features (e.g., GPT Actions API, preset-specific settings).
 */
export function getPresetById(id: string): ExamPreset | undefined {
    return EXAM_PRESETS.find((p) => p.id === id);
}
