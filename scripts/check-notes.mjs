// Checks every notes file listed in data/pools.json against its question pool.
// Run after editing explanations or lesson cards:  node scripts/check-notes.mjs

import { readFileSync } from 'node:fs';

const read = (p) => JSON.parse(readFileSync(new URL(`../${p}`, import.meta.url), 'utf8'));
const { pools } = read('data/pools.json');
let problems = 0;
const fail = (msg) => { problems++; console.log('  ✗ ' + msg); };

for (const entry of pools.filter((p) => p.file)) {
  const pool = read(entry.file);
  const questions = new Map(pool.questions.map((q) => [q.id, q]));
  console.log(`${entry.name}:`);
  for (const file of entry.notes || []) {
    const notes = read(file);
    const concepts = new Map(notes.concepts.map((c) => [c.id, c]));
    if (concepts.size !== notes.concepts.length) fail(`${file}: duplicate concept ids`);
    for (const c of notes.concepts) {
      if (!c.title || !Array.isArray(c.body) || !c.body.length) fail(`${c.id}: needs a title and body`);
    }
    const sub = notes.subelement;
    for (const q of pool.questions.filter((q) => q.id.startsWith(sub))) {
      if (!notes.explanations[q.id]) fail(`${q.id}: no explanation`);
    }
    for (const [id, e] of Object.entries(notes.explanations)) {
      const q = questions.get(id);
      if (!q) { fail(`${id}: not in the question pool`); continue; }
      if (!e.why) fail(`${id}: empty "why"`);
      if (/\b(answer|choice|option) [A-D]\b|\([A-D]\)/.test(e.why)) fail(`${id}: refers to an answer letter, but choices are shuffled`);
      const c = concepts.get(e.concept);
      if (!c) fail(`${id}: concept "${e.concept}" does not exist`);
      else if (c.group !== q.group) fail(`${id}: concept "${e.concept}" is in ${c.group}, question is in ${q.group}`);
      if (e.reviewNote) console.log(`  ! ${id} review note: ${e.reviewNote}`);
    }
    const reviewed = Object.values(notes.explanations).filter((e) => e.status === 'reviewed').length;
    console.log(`  ${file}: ${notes.concepts.length} lesson cards, ${Object.keys(notes.explanations).length} explanations (${reviewed} reviewed)`);
  }
}
console.log(problems ? `\n${problems} problem(s) found.` : '\nAll notes look good.');
process.exit(problems ? 1 : 0);
