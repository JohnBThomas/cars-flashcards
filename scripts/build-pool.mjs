// Builds a question pool JSON file from the official NCVEC .docx release.
//
// Usage:
//   node scripts/build-pool.mjs <pool.docx> <out.json> "<pool name>" <effective-from> <effective-to> "<revision>"
//
// Example:
//   node scripts/build-pool.mjs source/tech-2026-2030-feb19-2026.docx data/technician-2026-2030.json \
//     "Technician 2026-2030" 2026-07-01 2030-06-30 "NCVEC public release, Feb 19 2026 errata"
//
// No npm packages needed: the .docx (a zip file) is read with Node's built-in zlib.

import { readFileSync, writeFileSync } from 'node:fs';
import { inflateRawSync } from 'node:zlib';

const [docxPath, outPath, poolName, effectiveFrom, effectiveTo, revision] = process.argv.slice(2);
if (!revision) {
  console.error('Usage: node scripts/build-pool.mjs <pool.docx> <out.json> "<pool name>" <from> <to> "<revision>"');
  process.exit(1);
}

// Read one file out of a zip archive using the central directory.
function readZipEntry(buf, wanted) {
  let eocd = buf.length - 22;
  while (eocd >= 0 && buf.readUInt32LE(eocd) !== 0x06054b50) eocd--;
  if (eocd < 0) throw new Error('Not a zip file');
  const count = buf.readUInt16LE(eocd + 10);
  let p = buf.readUInt32LE(eocd + 16);
  for (let i = 0; i < count; i++) {
    const method = buf.readUInt16LE(p + 10);
    const size = buf.readUInt32LE(p + 20);
    const nameLen = buf.readUInt16LE(p + 28);
    const extraLen = buf.readUInt16LE(p + 30);
    const commentLen = buf.readUInt16LE(p + 32);
    const localOffset = buf.readUInt32LE(p + 42);
    const name = buf.toString('utf8', p + 46, p + 46 + nameLen);
    if (name === wanted) {
      const dataStart = localOffset + 30 + buf.readUInt16LE(localOffset + 26) + buf.readUInt16LE(localOffset + 28);
      const data = buf.subarray(dataStart, dataStart + size);
      return (method === 8 ? inflateRawSync(data) : data).toString('utf8');
    }
    p += 46 + nameLen + extraLen + commentLen;
  }
  throw new Error(`${wanted} not found in zip`);
}

const decode = (s) => s
  .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'")
  .replace(/&amp;/g, '&');

// Turn document.xml into one line of plain text per paragraph.
const xml = readZipEntry(readFileSync(docxPath), 'word/document.xml');
const lines = xml.split('</w:p>').map((para) =>
  (para.match(/<w:t[^>]*>[^<]*<\/w:t>|<w:tab\/>/g) || [])
    .map((t) => (t === '<w:tab/>' ? '\t' : decode(t.replace(/<[^>]+>/g, ''))))
    .join('')
    .replace(/ /g, ' ')
    .trim());

const subelements = [];
const questions = [];
let current = null;

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];

  // "SUBELEMENT T1 - COMMISSION'S RULES [6 Exam Questions - 6 Groups]  68 Questions"
  const sub = line.match(/^SUBELEMENT ([A-Z]\d) - (.+?) \[(\d+) Exam Questions/);
  if (sub) {
    if (!subelements.some((s) => s.id === sub[1])) {
      subelements.push({ id: sub[1], title: titleCase(sub[2]), examQuestions: +sub[3], groups: [] });
    }
    continue;
  }

  // "T1A Purpose and permissible use of ..."
  const grp = line.match(/^([A-Z]\d[A-Z]) (.+)$/);
  if (grp) {
    const s = subelements.find((x) => x.id === grp[1].slice(0, 2));
    if (s && !s.groups.some((g) => g.id === grp[1])) s.groups.push({ id: grp[1], title: grp[2] });
    continue;
  }

  // "T1A01 (C) [97.1]" followed by the question, four answers, and "~~"
  const q = line.match(/^([A-Z]\d[A-Z]\d{2}) \(([A-D])\)\s*(\[.*\])?/);
  if (q) {
    current = { id: q[1], correct: 'ABCD'.indexOf(q[2]), refs: (q[3] || '').replace(/^\[|\]$/g, ''), q: '', a: [] };
    let j = i + 1;
    while (j < lines.length && lines[j] === '') j++;
    current.q = lines[j];
    for (const letter of 'ABCD') {
      j++;
      while (j < lines.length && lines[j] === '') j++;
      const m = lines[j].match(new RegExp(`^${letter}\\.\\s*(.*)$`));
      if (!m) throw new Error(`${current.id}: expected answer ${letter}, got "${lines[j]}"`);
      current.a.push(m[1].trim());
    }
    const fig = current.q.match(/figure ([A-Z]-\d+)/i);
    if (fig) current.fig = fig[1].toUpperCase();
    current.group = current.id.slice(0, 3);
    questions.push(current);
    i = j;
  }
}

function titleCase(s) {
  return s.toLowerCase().replace(/(^|[\s/-])([a-z])/g, (_, a, b) => a + b.toUpperCase())
    .replace(/’S\b/g, '’s').replace(/'S\b/g, "'s")
    .replace(/ (And|Of|The|For|In|To) /g, (m) => m.toLowerCase());
}

// Sanity checks: every group has questions, exam draws one question per group.
for (const s of subelements) {
  if (s.groups.length !== s.examQuestions) throw new Error(`${s.id}: ${s.groups.length} groups but ${s.examQuestions} exam questions`);
  for (const g of s.groups) {
    if (!questions.some((q) => q.group === g.id)) throw new Error(`${g.id} has no questions`);
  }
}
const ids = new Set(questions.map((q) => q.id));
if (ids.size !== questions.length) throw new Error('Duplicate question IDs');

const pool = {
  name: poolName,
  effective: { from: effectiveFrom, to: effectiveTo },
  source: 'NCVEC Question Pool Committee (public domain)',
  revision,
  examSize: subelements.reduce((n, s) => n + s.examQuestions, 0),
  subelements,
  questions,
};
writeFileSync(outPath, JSON.stringify(pool, null, 1) + '\n');
console.log(`${poolName}: ${questions.length} questions, ${subelements.length} subelements, ${pool.examSize}-question exam -> ${outPath}`);
