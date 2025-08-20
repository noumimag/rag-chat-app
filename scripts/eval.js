#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

// super tiny mock to show "we eval grounding"
const args = Object.fromEntries(
  process.argv.slice(2).map(a => a.split('=').map(s => s.replace(/^--/, '')))
);
const qPath = args.questions || './data/samples/questions.json';
const k = Number(args.k || 5);

const qs = JSON.parse(fs.readFileSync(qPath, 'utf8'));

function mockRetrieve(question, k) {
  // TODO: replace with your real retrieval call
  return Array.from({ length: k }, (_, i) => ({
    id: i + 1,
    score: Math.random(),
    text: 'chunk ' + (i + 1),
  }));
}

let hits = 0;
qs.forEach(q => {
  const retrieved = mockRetrieve(q.question, k);
  const got = retrieved.some(r => (q.expectedChunkIds || []).includes(r.id));
  if (got) hits++;
});

console.log(`Top-${k} recall: ${((hits / qs.length) * 100).toFixed(1)}% (${hits}/${qs.length})`);
