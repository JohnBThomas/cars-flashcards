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
<script src="https://cdn.jsdelivr.net/gh/JohnBThomas/cars-flashcards@v0.2.1/flashcards.js"></script>
```

The script loads `data/` and `images/` from the same version, so pinning the tag (`@v0.1.0`) keeps the page stable. To publish an update: commit, push, create a new tag (for example `v0.2.0`), then change the tag in the WordPress block.

Study progress is saved only in each visitor's browser (localStorage key `cars-flashcards-v1`). No accounts, and no data is collected.

To try it locally, serve this folder with any static web server and open `index.html`.

## Files

| Path | What it is |
| --- | --- |
| `flashcards.js` | The whole app |
| `data/pools.json` | Which exams exist and which files they use |
| `data/technician-2026-2030.json`, `general-2023-2027.json`, `extra-2024-2028.json` | The question pools, built from the NCVEC .docx files |
| `data/notes/technician-T1.json` etc. | Lesson cards and explanations, one file per subelement |
| `images/` | Pool diagrams (T-1 to T-3, G7-1, E5-1 to E9-3), taken from the NCVEC .docx files |
| `source/` | The original NCVEC release files |
| `scripts/build-pool.mjs` | Turns an NCVEC .docx into pool JSON |
| `scripts/check-notes.mjs` | Checks notes files against the pool |
| `WRITING-NOTES.md` | How to write lesson cards and explanations |
| `REVIEW-CHECKLIST.md` | Items the writers flagged for Elmer review |

## Content

- Question pools are published by the NCVEC Question Pool Committee and are in the public domain. Current files: Technician 2026-2030 (Feb 19 2026 errata, 409 questions), General 2023-2027 (6th errata, Feb 4 2026, 423 questions), Extra 2024-2028 (4th errata, Feb 4 2026, 599 questions). Withdrawn questions are left out. Each pool was cross-checked against an independent copy.
- Lesson cards and explanations are written for this project, not copied from other study guides.
- Every lesson card and explanation starts as `"status": "draft"` and shows a "Draft, awaiting club review" badge. When a club Elmer has checked one, change it to `"status": "reviewed"`.
- Explanations never mention answer letters, because the app shuffles the choices ("All these choices are correct" always stays last).
- After editing notes, run `node scripts/check-notes.mjs`.

## Status

All three exams can be studied and practiced. Every subelement has draft lesson cards and explanations that are waiting for club review.

The General pool ends June 30, 2027. When NCVEC publishes the 2027-2031 pool, build it with `scripts/build-pool.mjs`, add it to `data/pools.json`, and write new notes files for it. The app warns learners during the last 180 days of a pool.

## License

Code: MIT (see LICENSE). Question pools and diagrams: public domain.
