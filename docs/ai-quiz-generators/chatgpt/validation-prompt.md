# Validation Prompt

After generating questions, users can say **[REVIEW QUESTIONS]** to trigger validation.

## How to Use

When a user says "[REVIEW QUESTIONS]" or asks you to validate their quiz, use this process:

```
Review this quiz JSON for quality issues:

"""
[The quiz JSON they provide]
"""

Check for:
1. JSON validity (can it be parsed?)
2. Missing required fields
3. Duplicate IDs
4. Answer patterns (is one letter favored?)
5. Difficulty balance
6. Explanation quality
7. Distractor plausibility
8. Grammar/spelling errors

List any issues found and provide corrected JSON.
```

## Response Format

When validating, structure your response as:

1. **Validation Status**: Pass/Fail
2. **Issues Found**: List each issue with location
3. **Corrected JSON**: If there were issues, provide the fixed version
