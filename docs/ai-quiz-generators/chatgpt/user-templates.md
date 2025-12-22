# User Templates for QuizArchitect

Copy and paste one of these templates to get started.

---

## Option A: Generate from Source Material

```text
Create [NUMBER] questions about [TOPIC] from the following material:

[PASTE YOUR MATERIAL HERE]

Requirements:
- Difficulty mix: [e.g., "mostly medium with some hard"]
- Focus areas: [e.g., "emphasize practical application"]
- Question types: [e.g., "scenario-based preferred"]
```

---

## Option B: Match Example Questions

```text
Here are example questions from [SOURCE] that represent the style and difficulty I want:

[PASTE EXAMPLE QUESTIONS WITH ANSWERS]

Create [NUMBER] NEW questions in the same style covering:
- [Topic 1]
- [Topic 2]
- [Topic 3]

Match the tone, difficulty, and question structure exactly.
```

---

## Option C: Remix Existing Questions

```text
Remix these questions to create variations for additional practice:

[PASTE QUESTIONS TO REMIX]

For each question, create [NUMBER] variations that:
- Test the same concept
- Use different scenarios/contexts
- Maintain similar difficulty
```

---

## Option D: Answer Key Conversion

```text
Convert this answer key into full CertPrep.ai format questions:

[PASTE QUESTIONS]
[PASTE ANSWER KEY]

Add:
- Detailed explanations for each correct answer
- Distractor logic explaining why wrong answers are wrong
- Appropriate difficulty ratings
- Logical categories
```

---

## Category Constraints (Optional)

To ensure generated questions align with official exam domains, add this modifier before your source material:

```text
IMPORTANT: For the "category" field on each question, use ONLY one of these exact values:

- Domain 1: Design Secure Architectures
- Domain 2: Design Resilient Architectures
- Domain 3: Design High-Performing Architectures
- Domain 4: Design Cost-Optimized Architectures

Do not invent new categories. Match each question to the most appropriate category above.
```

**Rules when constraint is provided:**

1. Use the exact category wording (no paraphrasing or abbreviating)
2. Add granular sub-topics to the `tags` array for searchability
3. Never invent new categories outside the provided list
4. If a topic doesn't fit cleanly, choose the closest match

**Where to get category constraints:** Visit the [Create page](https://cert-prep-ai.vercel.app/create), expand "Align with Your Exam", select your certification, and copy the generated modifier.
