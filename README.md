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
<div id="cars-flashcards"></div>
<script src="https://cdn.jsdelivr.net/gh/JohnBThomas/cars-flashcards@main/flashcards.js"></script>
```

Study progress is saved only in each visitor's browser (localStorage). No accounts, and no data is collected.

## Content

- Question pools are published by the NCVEC Question Pool Committee and are in the public domain.
- Explanations and concept cards are written for this project and reviewed by CARS members.

## Status

Planning. Technician pilot first.
