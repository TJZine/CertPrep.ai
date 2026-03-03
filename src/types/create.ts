export type GenerationStrategy = "material" | "match" | "remix" | "convert";

export interface BuilderState {
    strategy: GenerationStrategy;
    topic: string;
    questionCount: number;
    difficulty: string;
    focusAreas: string;
    presetId: string | null;
    customCategories: string;
    materialText: string;
    exampleQuestions: string;
    remixQuestions: string;
    answerKeyText: string;
}

export const INITIAL_BUILDER_STATE: BuilderState = {
    strategy: "material",
    topic: "",
    questionCount: 10,
    difficulty: "Mixed",
    focusAreas: "",
    presetId: null,
    customCategories: "",
    materialText: "",
    exampleQuestions: "",
    remixQuestions: "",
    answerKeyText: "",
};
