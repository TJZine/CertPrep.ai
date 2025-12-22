# AI Quiz Generators

This folder contains prompts and configurations for creating custom quizzes using AI tools. These are designed to generate quizzes compatible with the CertPrep.ai JSON format.

## 📁 Folder Structure

```text
ai-quiz-generators/
├── README.md                          ← You are here
├── gemini/                            ← Google Gemini Gems
│   └── quiz-generator-generic.md          ← General-purpose quiz generator
└── chatgpt/                           ← OpenAI ChatGPT GPTs
    ├── gpt-instructions.md                ← Main GPT instructions
    ├── user-templates.md                  ← Upload as Knowledge file
    ├── validation-prompt.md               ← Upload as Knowledge file
    └── sample-output.json                 ← Upload as Knowledge file
```

---

## 🔷 Gemini Gems

### Setup

1. Go to [Gemini Gems](https://gemini.google.com/gems)
2. Create a new Gem
3. Copy the entire contents of `gemini/quiz-generator-generic.md` into the "Gem Instructions" field
4. Save and publish

---

## 🟢 ChatGPT GPTs

### Setup

1. Go to [ChatGPT GPT Builder](https://chatgpt.com/gpts/editor)
2. Create a new GPT
3. **Instructions**: Copy contents of `chatgpt/gpt-instructions.md` (~7.5K chars)
4. **Knowledge**: Upload these 3 files:
   - `user-templates.md`
   - `validation-prompt.md`
   - `sample-output.json`
5. **Conversation Starters** (recommended):
   - "Create a quiz from my study notes"
   - "Generate 10 questions for [my certification]"
   - "Remix these questions for more practice"
   - "What format should I use?"
6. Save and publish

### Why the split?

ChatGPT GPTs have an 8,000 character limit for instructions. We moved templates and examples to Knowledge files to stay under the limit while keeping full functionality.

---

## 🎯 Live Examples

| Platform         | Link                                                                                                          |
| ---------------- | ------------------------------------------------------------------------------------------------------------- |
| **Create Guide** | [cert-prep-ai.vercel.app/create](https://cert-prep-ai.vercel.app/create)                                      |
| **ChatGPT GPT**  | [CertPrep AI Test Creator](https://chatgpt.com/g/g-6948d766074c8191a09e7a8c723bf9b7-certprep-ai-test-creator) |
| **Gemini Gem**   | [CertPrep Quiz Generator](https://gemini.google.com/gem/1Oi-QnRrxQ_7a18s9SvyKxWX4ak52nPyI)                    |

---

## 📋 Output Format

All generators produce JSON compatible with CertPrep.ai import:

```json
{
  "title": "Quiz Title",
  "description": "Description",
  "category": "Parent Category",
  "subcategory": "Specific Topic",
  "questions": [
    {
      "id": "unique-id",
      "category": "Topic",
      "difficulty": "Easy|Medium|Hard",
      "question": "Question text",
      "options": { "A": "...", "B": "...", "C": "...", "D": "..." },
      "correct_answer": "B",
      "explanation": "Why B is correct...",
      "distractor_logic": "Why other options are wrong..."
    }
  ],
  "tags": ["tag1", "tag2"]
}
```

---

## 🛠️ Customizing for Your Needs

### Creating Domain-Specific Variants

You can create specialized versions for different certification types:

- Medical/healthcare certifications
- IT/cloud certifications (AWS, Azure, GCP)
- Legal/compliance certifications
- Financial certifications (CFA, CPA)
- Insurance licensing exams

### Key sections to customize

1. **Question Type Distribution**: Define the mix of question types for your domain
2. **Terminology**: Add domain-specific terms and concepts
3. **Example Output**: Provide examples relevant to your certification
4. **Hallucination Prevention**: Add domain-specific rules to prevent common AI errors

---

## 📄 License

These prompts are part of the CertPrep.ai open source project. Feel free to modify and adapt them for your own quiz generation needs.
