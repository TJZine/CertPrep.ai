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
 * All presets were batch-verified against official sources on 2025-12-22.
 * Individual lastVerified dates will diverge as updates occur.
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
    /** Optional notes about verification method or upcoming changes */
    verificationNote?: string;
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
        verificationNote: "65 questions, 130 min, passing score 720/1000. Weights verified against official exam guide.",
    },

    // ═══════════════════════════════════════════════════════════════════════════
    // MICROSOFT AZURE CERTIFICATIONS
    // ═══════════════════════════════════════════════════════════════════════════
    {
        id: "azure_az104",
        name: "Azure Administrator Associate",
        vendor: "Microsoft",
        examCode: "AZ-104",
        domains: [
            { name: "Manage Azure identities and governance", weight: 20 }, // 20-25%
            { name: "Implement and manage storage", weight: 15 }, // 15-20%
            { name: "Deploy and manage Azure compute resources", weight: 20 }, // 20-25%
            { name: "Implement and manage virtual networking", weight: 15 }, // 15-20%
            { name: "Monitor and maintain Azure resources", weight: 10 }, // 10-15%
        ],
        sourceUrl: "https://learn.microsoft.com/en-us/credentials/certifications/azure-administrator/",
        lastVerified: "2025-12-22",
        verificationNote: "Weights shown are lower bounds of official ranges (e.g., 20-25% shown as 20). Exam updated April 2025.",
    },
    {
        id: "azure_az900",
        name: "Azure Fundamentals",
        vendor: "Microsoft",
        examCode: "AZ-900",
        domains: [
            { name: "Describe cloud concepts", weight: 25 }, // 25-30%
            { name: "Describe Azure architecture and services", weight: 35 }, // 35-40%
            { name: "Describe Azure management and governance", weight: 30 }, // 30-35%
        ],
        sourceUrl: "https://learn.microsoft.com/en-us/credentials/certifications/azure-fundamentals/",
        lastVerified: "2025-12-22",
        verificationNote: "Weights shown are lower bounds of official ranges (e.g., 20-25% shown as 20). Entry-level foundational certification.",
    },
    {
        id: "azure_az305",
        name: "Azure Solutions Architect Expert",
        vendor: "Microsoft",
        examCode: "AZ-305",
        domains: [
            { name: "Design identity, governance, and monitoring solutions", weight: 25 }, // 25-30%
            { name: "Design data storage solutions", weight: 20 }, // 20-25%
            { name: "Design business continuity solutions", weight: 15 }, // 15-20%
            { name: "Design infrastructure solutions", weight: 30 }, // 30-35%
        ],
        sourceUrl: "https://learn.microsoft.com/en-us/credentials/certifications/exams/az-305/",
        lastVerified: "2025-12-22",
        verificationNote: "Weights shown are lower bounds of official ranges (e.g., 20-25% shown as 20). Expert-level certification updated October 2024.",
    },

    // ═══════════════════════════════════════════════════════════════════════════
    // GOOGLE CLOUD CERTIFICATIONS
    // ═══════════════════════════════════════════════════════════════════════════
    {
        id: "gcp_ace",
        name: "Associate Cloud Engineer",
        vendor: "Google Cloud",
        examCode: "ACE",
        domains: [
            { name: "Setting up a cloud solution environment" },
            { name: "Planning and configuring a cloud solution" },
            { name: "Deploying and implementing a cloud solution" },
            { name: "Ensuring successful operation of a cloud solution" },
            { name: "Configuring access and security" },
        ],
        sourceUrl: "https://cloud.google.com/learn/certification/cloud-engineer",
        lastVerified: "2025-12-22",
        verificationNote: "Google does not publish official domain weights. 50-60 questions, 2 hours. Recommends 6+ months hands-on experience.",
    },
    {
        id: "gcp_pca",
        name: "Professional Cloud Architect",
        vendor: "Google Cloud",
        examCode: "PCA",
        domains: [
            { name: "Designing and planning a cloud solution architecture", weight: 25 },
            { name: "Managing and provisioning a cloud solution infrastructure", weight: 17 },
            { name: "Designing for security and compliance", weight: 17 },
            { name: "Analyzing and optimizing technical and business processes", weight: 15 },
            { name: "Managing implementation", weight: 13 },
            { name: "Ensuring solution and operations excellence", weight: 13 },
        ],
        sourceUrl: "https://cloud.google.com/learn/certification/cloud-architect",
        lastVerified: "2025-12-22",
        verificationNote: "Weights are approximate. Case studies comprise 20-30% of exam. Recommends 3+ years industry experience.",
    },

    // ═══════════════════════════════════════════════════════════════════════════
    // CISCO CERTIFICATIONS
    // ═══════════════════════════════════════════════════════════════════════════
    {
        id: "cisco_ccna",
        name: "CCNA",
        vendor: "Cisco",
        examCode: "200-301",
        domains: [
            { name: "Network Fundamentals", weight: 20 },
            { name: "Network Access", weight: 20 },
            { name: "IP Connectivity", weight: 25 },
            { name: "IP Services", weight: 10 },
            { name: "Security Fundamentals", weight: 15 },
            { name: "Automation and Programmability", weight: 10 },
        ],
        sourceUrl: "https://www.cisco.com/c/en/us/training-events/training-certifications/certifications/associate/ccna.html",
        lastVerified: "2025-12-22",
        verificationNote: "Blueprint v1.1 (August 2024) added GenAI/ML topics (<10% of exam). Valid until August 2026.",
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
        verificationNote: "90 questions max, 90 min, passing score 750/900. Launched Nov 2023.",
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
        verificationNote: "90 questions max, 90 min, passing score 720/900. Launched June 2024.",
    },
    {
        id: "comptia_a_plus_core1_2201201",
        name: "CompTIA A+ Core 1",
        vendor: "CompTIA",
        examCode: "220-1201",
        domains: [
            { name: "Mobile Devices", weight: 13 },
            { name: "Networking", weight: 23 },
            { name: "Hardware", weight: 25 },
            { name: "Virtualization and Cloud Computing", weight: 11 },
            { name: "Hardware and Network Troubleshooting", weight: 28 },
        ],
        sourceUrl: "https://www.comptia.org/certifications/a",
        lastVerified: "2025-12-22",
        verificationNote: "V15 launched March 2025. 90 questions, 90 min, passing score 675/900. V14 (220-1101) retired Sept 2025.",
    },
    {
        id: "comptia_a_plus_core2_2201202",
        name: "CompTIA A+ Core 2",
        vendor: "CompTIA",
        examCode: "220-1202",
        domains: [
            { name: "Operating Systems", weight: 28 },
            { name: "Security", weight: 28 },
            { name: "Software Troubleshooting", weight: 23 },
            { name: "Operational Procedures", weight: 21 },
        ],
        sourceUrl: "https://www.comptia.org/certifications/a",
        lastVerified: "2025-12-22",
        verificationNote: "V15 launched March 2025. 90 questions, 90 min, passing score 700/900. V14 (220-1102) retired Sept 2025.",
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
        // NOTE: New exam launching July 2026 with rebalanced weights:
        // People: 33%, Process: 41%, Business Environment: 26%.
        // Update this preset after July 2026.
        verificationNote: "Current ECO 2021 valid until July 2026. New exam (ECO 2026) will rebalance: People 33%, Process 41%, Business Environment 26%.",
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
        verificationNote: "Updated April 15, 2024. Domain 1 increased to 16% (from 15%), Domain 8 decreased to 10% (from 11%).",
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
        lastVerified: "2025-12-22",
        verificationNote: "General personal lines categories compiled from common state licensing standards. No single authoritative blueprint URL - category weighting varies by state.",
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
        lastVerified: "2025-12-22",
        verificationNote: "Categories verified against actual MA Personal Lines exam results (2025). No official public blueprint URL available from Prometric/PSI.",
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
        lastVerified: "2025-12-22",
        verificationNote: "Standard life & health domains from NAIC model curriculum. No single authoritative URL - exam content varies by state.",
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
