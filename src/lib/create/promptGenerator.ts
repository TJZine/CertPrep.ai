import type { BuilderState } from "@/types/create";
import { generatePromptModifier } from "@/data/examPresets";

const JSON_SCHEMA_PROMPT = `
OUTPUT FORMAT REQUIREMENT:
You must output ONLY valid, raw JSON. Do not wrap the JSON in markdown blocks (e.g., \`\`\`json). The JSON must match this structure exactly:
{
  "title": "Quiz Title (Max 100 chars)",
  "description": "Quiz Description (Max 500 chars)",
  "category": "Parent grouping",
  "subcategory": "Specific topic",
  "tags": ["tag1", "tag2"],
  "questions": [
    {
      "id": "q1",
      "question": "The question text?",
      "options": {
        "A": "First option",
        "B": "Second option",
        "C": "Third option",
        "D": "Fourth option"
      },
      "correct_answer": "A",
      "explanation": "Why this is correct.",
      "distractor_logic": "Why others are wrong.",
      "category": "Domain name",
      "difficulty": "Medium"
    }
  ]
}`;

export function generatePrompt(state: BuilderState, categories: string[]): string {
  let base = "";

  switch (state.strategy) {
    case "material":
      base = `Create ${state.questionCount ?? 10} questions about ${state.topic?.trim() || "[TOPIC]"} from the following material:\n\n${state.materialText?.trim() || "[PASTE YOUR MATERIAL HERE]"}\n\nRequirements:\n- Difficulty mix: ${state.difficulty || "Mixed"}`;
      break;
    case "match":
      base = `Here are example questions that represent the style and difficulty I want:\n\n${state.exampleQuestions?.trim() || "[PASTE EXAMPLE QUESTIONS WITH ANSWERS]"}\n\nCreate ${state.questionCount ?? 10} NEW questions in the same style covering the specified topics.\nMatch the tone, difficulty, and question structure exactly.`;
      break;
    case "remix":
      base = `Remix these questions to create variations for additional practice:\n\n${state.remixQuestions?.trim() || "[PASTE QUESTIONS TO REMIX]"}\n\nFor each question, create variations that test the same concept but use different scenarios.`;
      break;
    case "convert":
      base = `Convert this answer key into full CertPrep.ai format questions:\n\n${state.answerKeyText?.trim() || "[PASTE ANSWER KEY]"}\n\nAdd detailed explanations for each correct answer and distractor logic.`;
      break;
    default: {
      const _exhaustiveCheck: never = state.strategy;
      throw new Error(`Unhandled strategy: ${_exhaustiveCheck}`);
    }
  }


  const modifier = generatePromptModifier(categories);
  const parts = [base, modifier, JSON_SCHEMA_PROMPT].filter(Boolean);
  return parts.join("\n\n");
}
