import { describe, it, expect } from 'vitest';
import { generatePrompt } from '@/lib/create/promptGenerator';
import { INITIAL_BUILDER_STATE } from '@/types/create';

describe('promptGenerator', () => {
    it('generates a material prompt correctly', () => {
        const state = {
            ...INITIAL_BUILDER_STATE,
            strategy: "material" as const,
            topic: "AWS S3",
            questionCount: 5,
            difficulty: "Hard",
            materialText: "S3 is a storage service."
        };
        const prompt = generatePrompt(state, []);
        expect(prompt).toContain("Create 5 questions about AWS S3");
        expect(prompt).toContain("S3 is a storage service.");
        expect(prompt).toContain("Hard");
    });

    it('includes category constraints when categories are provided', () => {
        const state = {
            ...INITIAL_BUILDER_STATE,
            strategy: "material" as const,
        };
        const categories = ["Domain 1: Security", "Domain 2: Compute"];
        const prompt = generatePrompt(state, categories);

        expect(prompt).toContain('IMPORTANT: For the "category" field on each question, use ONLY one of these exact values');
        expect(prompt).toContain('- Domain 1: Security');
        expect(prompt).toContain('- Domain 2: Compute');
    });
});
