# Writing lesson cards and explanations

Each exam subelement has one notes file, for example `data/notes/general-G2.json`. It holds the lesson cards (taught before any questions) and one explanation per question. The finished Technician files (`data/notes/technician-T1.json` for rules, `technician-T5.json` for math) are the models to copy.

## File shape

```json
{
  "subelement": "G2",
  "concepts": [
    { "id": "g2a-sideband-choice", "group": "G2A", "title": "Which sideband to use", "body": ["Paragraph.", "• A bullet line"], "formula": "optional", "status": "draft" }
  ],
  "explanations": {
    "G2A01": { "why": "…", "work": ["only for math", "one step per line"], "concept": "g2a-sideband-choice", "status": "draft" }
  }
}
```

## Lesson cards (`concepts`)

- 3 to 6 per group, in teaching order. Big groups may use up to 8.
- Each card is 1 to 3 short paragraphs in plain language. Teach the idea and the reason behind it, so a learner could answer the question even if it were worded differently.
- Together, a group's cards must cover every fact needed to answer every question in that group.
- `id`: lowercase, unique, and starting with the group (`g2a-…`).
- `formula` (optional): one plain-text formula, using ×, ÷, Ω, √, π, and λ.
- Cards can't show images. For schematic symbols or figures, describe in words what to look for.
- The reading level rises with the exam: Technician assumes no background, General assumes a Technician, and Extra can assume General-level knowledge. Keep the wording plain at every level.

## Explanations

- One for every question in the subelement. Deleted questions aren't in the pool file, so skip them.
- `why`: 1 to 3 sentences on why the correct answer is right, and when it helps, why a tempting wrong answer is wrong.
- **Never mention answer letters or positions.** The app shuffles the choices. Refer to the answer's content instead.
- `work`: required for every calculation. Show the steps from the formula to the answer, with units, and make sure the result matches the keyed answer.
- `concept`: the id of the lesson card that teaches it. It must be in the same group.
- If the keyed answer seems wrong or the pool has a typo, still explain the keyed answer, and add `"reviewNote": "…"` for the Elmers.

## Rules

- Write everything in your own words. Don't copy or closely paraphrase HamStudy, the ARRL manuals, Gordon West, or other copyrighted study guides. Checking facts against 47 CFR Part 97 and other references is fine.
- Accuracy comes first. Recompute every calculation.
- Plain text only: no HTML or Markdown. "•" at the start of a body line makes a bullet.
- New content is always `"status": "draft"`. Only a club reviewer changes it to `"reviewed"`.
- Run `node scripts/check-notes.mjs` after editing.
