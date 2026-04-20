#!/usr/bin/env node
/**
 * ヒーロー画像（image_local）が未設定の種に対して:
 *  1. images_remote[0] を WebP に変換して public/images/mushrooms/{id}.webp に保存
 *  2. image_local を設定
 *  3. 使用した images_remote[0] を除去
 *  4. iNat から補充画像を 1 枚取得して images_remote に追加（元の枚数を維持）
 *
 * Usage:
 *   node scripts/fix_missing_hero_images.mjs [--dry-run] [--only=id1,id2]
 */

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { downloadAndConvert, getInatPhotos } from './phase13/fetch_v2_photos.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const MUSHROOMS_PATH = join(ROOT, 'src/data/mushrooms.json');
const IMAGES_DIR = join(ROOT, 'public/images/mushrooms');

function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }

function parseArgs() {
  const args = process.argv.slice(2);
  const onlyArg = args.find((a) => a.startsWith('--only='));
  return {
    dryRun: args.includes('--dry-run'),
    only: onlyArg ? onlyArg.split('=')[1].split(',') : null,
  };
}

async function main() {
  const { dryRun, only } = parseArgs();
  mkdirSync(IMAGES_DIR, { recursive: true });

  const mushrooms = JSON.parse(readFileSync(MUSHROOMS_PATH, 'utf-8'));

  // ヒーロー画像なし & images_remote あり の種に絞る
  let targets = mushrooms.filter(
    (m) => !m.image_local && m.images_remote && m.images_remote.length > 0,
  );
  if (only) targets = targets.filter((m) => only.includes(m.id));

  console.log(`対象: ${targets.length} 種${dryRun ? ' [DRY RUN]' : ''}`);

  const stats = { ok: 0, heroFail: 0, refillOk: 0, refillFail: 0 };

  for (let i = 0; i < targets.length; i++) {
    const m = targets[i];
    const heroUrl = m.images_remote[0];
    const outputPath = join(IMAGES_DIR, `${m.id}.webp`);

    console.log(`\n[${i + 1}/${targets.length}] ${m.names.ja} (${m.id})`);
    console.log(`  hero URL: ${heroUrl}`);

    // --- Step 1: ヒーロー画像ダウンロード & WebP 変換 ---
    if (!dryRun) {
      try {
        const bytes = await downloadAndConvert(heroUrl, outputPath);
        console.log(`  ✓ hero saved (${(bytes / 1024).toFixed(1)} KB)`);
        m.image_local = `/images/mushrooms/${m.id}.webp`;
      } catch (err) {
        console.error(`  ✗ hero download failed: ${err.message}`);
        stats.heroFail++;
        continue;
      }
    } else {
      console.log(`  [dry] would save to ${outputPath}`);
      m.image_local = `/images/mushrooms/${m.id}.webp`;
    }

    // --- Step 2: 使用した URL を images_remote から除去 ---
    const removedUrl = m.images_remote.shift();
    m.images_remote_credits = (m.images_remote_credits || []);
    const removedCredit = m.images_remote_credits.shift();
    console.log(`  removed from remote: ${removedUrl?.slice(0, 60)}...`);
    console.log(`  remaining remote: ${m.images_remote.length} 枚`);
    stats.ok++;

    // --- Step 3: iNat から補充画像を 1 枚取得 ---
    if (!dryRun) {
      await sleep(1000);
      try {
        const existingUrls = new Set(m.images_remote);
        const synonyms = m.names.scientific_synonyms || [];
        const { photos } = await getInatPhotos(m.names.scientific, synonyms, 10);

        // 既存 URL と heroUrl を除いた新規写真を 1 枚選ぶ
        const newPhoto = photos.find(
          (p) => !existingUrls.has(p.url) && p.url !== heroUrl,
        );

        if (newPhoto) {
          m.images_remote.push(newPhoto.url);
          m.images_remote_credits.push(newPhoto.attribution);
          console.log(`  ✓ refill: ${newPhoto.url.slice(0, 60)}...`);
          stats.refillOk++;
        } else {
          console.log(`  - refill: 新規写真なし (remote=${m.images_remote.length} 枚のまま)`);
          stats.refillFail++;
        }

        await sleep(1000);
      } catch (err) {
        console.error(`  ✗ refill fetch failed: ${err.message}`);
        stats.refillFail++;
      }
    } else {
      console.log(`  [dry] would refill from iNat`);
    }
  }

  // --- mushrooms.json 書き込み ---
  if (!dryRun) {
    writeFileSync(MUSHROOMS_PATH, JSON.stringify(mushrooms, null, 2), 'utf-8');
    console.log('\nmushrooms.json updated');
  }

  console.log('\n=== 完了 ===');
  console.log(`hero 取得成功: ${stats.ok}`);
  console.log(`hero 取得失敗: ${stats.heroFail}`);
  console.log(`refill 成功: ${stats.refillOk}`);
  console.log(`refill 失敗/新規なし: ${stats.refillFail}`);
}

main().catch((err) => {
  console.error('Fatal:', err);
  process.exit(1);
});
