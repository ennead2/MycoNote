#!/usr/bin/env node
// combined JSON の長大 extract を Read 可能な Markdown に展開する。
// 出力: .cache/phase13/combined-md/<slug>.md
// 各ソースを見出しで区切り、text/extract は実改行で展開。

import fs from 'node:fs';
import path from 'node:path';

const INPUT_DIR = '.cache/phase13/combined';
const OUTPUT_DIR = '.cache/phase13/combined-md';

function formatSource(name, src) {
  if (!src) return `## ${name}\n\n_(null)_\n`;
  const lines = [`## ${name}\n`];
  for (const [k, v] of Object.entries(src)) {
    if (v === null || v === undefined) continue;
    if (typeof v === 'string') {
      if (v.length > 200) {
        lines.push(`### ${k}\n`);
        lines.push(v);
        lines.push('');
      } else {
        lines.push(`- **${k}**: ${v}`);
      }
    } else if (Array.isArray(v)) {
      lines.push(`### ${k}\n`);
      lines.push('```json');
      lines.push(JSON.stringify(v, null, 2));
      lines.push('```');
      lines.push('');
    } else if (typeof v === 'object') {
      lines.push(`### ${k}\n`);
      lines.push('```json');
      lines.push(JSON.stringify(v, null, 2));
      lines.push('```');
      lines.push('');
    } else {
      lines.push(`- **${k}**: ${v}`);
    }
  }
  return lines.join('\n') + '\n';
}

function run() {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  const files = fs.readdirSync(INPUT_DIR).filter((f) => f.endsWith('.json'));
  let count = 0;
  for (const f of files) {
    const slug = f.replace(/\.json$/, '');
    const data = JSON.parse(fs.readFileSync(path.join(INPUT_DIR, f), 'utf8'));
    const sources = data.sources || {};
    const out = [];
    out.push(`# ${slug}\n`);
    out.push(`- 和名: ${data.japaneseName || '-'}`);
    out.push(`- 学名: ${data.scientificName || '-'}`);
    out.push(`- 安全区分: ${data.safety || '-'}`);
    out.push('');
    for (const [name, src] of Object.entries(sources)) {
      out.push(formatSource(name, src));
    }
    fs.writeFileSync(path.join(OUTPUT_DIR, `${slug}.md`), out.join('\n'), 'utf8');
    count++;
  }
  console.log(`wrote ${count} .md files to ${OUTPUT_DIR}`);
}

run();
