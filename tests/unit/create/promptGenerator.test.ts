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
            difficulty: "Hard" as const,
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

    it('generates a match prompt correctly', () => {
        const state = {
            ...INITIAL_BUILDER_STATE,
            strategy: "match" as const,
            exampleQuestions: "Q: What is 2+2? A: 4",
            questionCount: 3
        };
        const prompt = generatePrompt(state, []);
        expect(prompt).toContain("Here are example questions that represent the style and difficulty I want");
        expect(prompt).toContain("Q: What is 2+2? A: 4");
        expect(prompt).toContain("Create 3 NEW questions");
    });

    it('generates a remix prompt correctly', () => {
        const state = {
            ...INITIAL_BUILDER_STATE,
            strategy: "remix" as const,
            remixQuestions: "1. Explain closures in JS",
        };
        const prompt = generatePrompt(state, []);
        expect(prompt).toContain("Remix these questions to create variations");
        expect(prompt).toContain("1. Explain closures in JS");
    });

    it('generates a convert prompt correctly', () => {
        const state = {
            ...INITIAL_BUILDER_STATE,
            strategy: "convert" as const,
        };
        const prompt = generatePrompt(state, []);
        expect(prompt).toContain("Convert this answer key into full CertPrep.ai format questions");
        expect(prompt).toContain("[PASTE ANSWER KEY]");
        expect(prompt).toContain("[PASTE ORIGINAL QUESTIONS HERE]");
    });

    it('generates a convert prompt with data when fields are non-empty', () => {
        const state = {
            ...INITIAL_BUILDER_STATE,
            strategy: "convert" as const,
            answerKeyText: "1. A\n2. B",
            sourceQuestions: "Q1\nQ2"
        };
        const prompt = generatePrompt(state, []);
        expect(prompt).toContain("Convert this answer key into full CertPrep.ai format questions");
        expect(prompt).toContain("1. A\n2. B");
        expect(prompt).toContain("Q1\nQ2");
        expect(prompt).not.toContain("[PASTE ANSWER KEY]");
        expect(prompt).not.toContain("[PASTE ORIGINAL QUESTIONS HERE]");
    });

    it('falls back to placeholders when material is empty', () => {
        const state = {
            ...INITIAL_BUILDER_STATE,
            strategy: "material" as const,
            materialText: "",
            topic: "",
        };
        const prompt = generatePrompt(state, []);
        expect(prompt).toContain("[PASTE YOUR MATERIAL HERE]");
        expect(prompt).toContain("[TOPIC]");
    });
});
