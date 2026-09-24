# CARS Ham Exam Flashcards

Study flashcards for the US amateur radio license exams (Technician, General, and Extra), built for the Columbia Amateur Radio Society (CARS, NF4CQ).

The goal is learning, not memorizing a test bank:

- Lessons grouped by topic, with short concept cards before any questions
- Recall mode: think of the answer before you see the choices
- Answer choices shuffled every time
- A "why" explanation on every card
- Spaced repetition: missed cards come back sooner
- Practice exams drawn the same way as the real exam

## How it runs

The page is plain JavaScript with no build step or server. The CARS WordPress site loads it with a Custom HTML block:

```html
<div id="cars-flashcards" data-exam-link="https://nf4cq.com/..." data-elmer-link="https://nf4cq.com/..."></div>
<script src="https://cdn.jsdelivr.net/gh/JohnBThomas/cars-flashcards@v0.1.0/flashcards.js"></script>
```

The script loads `data/` and `images/` from the same version, so pinning the tag (`@v0.1.0`) keeps the page stable. To publish an update: commit, push, create a new tag (for example `v0.2.0`), then change the tag in the WordPress block.

Study progress is saved only in each visitor's browser (localStorage key `cars-flashcards-v1`). No accounts, and no data is collected.

To try it locally, serve this folder with any static web server and open `index.html`.

## Files

| Path | What it is |
| --- | --- |
| `flashcards.js` | The whole app |
| `data/pools.json` | Which exams exist and which files they use |
| `data/technician-2026-2030.json` | The Technician question pool, built from the NCVEC .docx |
| `data/notes/technician-T1.json` etc. | Lesson cards and explanations, one file per subelement |
| `images/` | Pool diagrams (T-1, T-2, T-3) |
| `source/` | The original NCVEC release file |
| `scripts/build-pool.mjs` | Turns an NCVEC .docx into pool JSON |
| `scripts/check-notes.mjs` | Checks notes files against the pool |

## Content

- Question pools are published by the NCVEC Question Pool Committee and are in the public domain. The Technician file is built from the Feb 19 2026 errata release and was cross-checked against an independent copy (all 409 questions and answer keys match).
- Lesson cards and explanations are written for this project, not copied from other study guides.
- Every lesson card and explanation starts as `"status": "draft"` and shows a "Draft, awaiting club review" badge. When a club Elmer has checked one, change it to `"status": "reviewed"`.
- Explanations never mention answer letters, because the app shuffles the choices ("All these choices are correct" always stays last).
- After editing notes, run `node scripts/check-notes.mjs`.

## Status

Technician pilot: all 409 questions work for practice and exams. Lesson cards and explanations exist for T1 (Rules) and T5 (Electrical Principles); the other subelements show questions without explanations for now. General and Extra are listed as coming soon.

## License

Code: MIT (see LICENSE). Question pools and diagrams: public domain.
