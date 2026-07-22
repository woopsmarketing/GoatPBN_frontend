/**
 * 스핀택스 엔진 데모
 * 실제 생성 결과를 보여준다.
 * 실행: cd seed/spintax-engine && node test/demo.js
 */

import { SpintaxEngine, validateContent } from '../src/index.js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const template = JSON.parse(readFileSync(join(__dirname, 'sample-template.json'), 'utf-8'));

console.log('╔══════════════════════════════════════════════════════╗');
console.log('║         스핀택스 엔진 데모 - 콘텐츠 3편 생성          ║');
console.log('╚══════════════════════════════════════════════════════╝');
console.log(`\n키워드: "${template.main_keyword}"`);

const engine = new SpintaxEngine(template);

// 추정 조합 수
const combinations = engine.estimateTotalCombinations();
console.log(`추정 조합 수: ${combinations.toLocaleString()}개\n`);

// 3편 생성
for (let i = 1; i <= 3; i++) {
  const content = engine.spin({ includeToc: true });
  const quality = validateContent(content, {
    mainKeyword: template.main_keyword,
    minWordCount: 300,
    maxWordCount: 5000
  });

  console.log(`${'─'.repeat(60)}`);
  console.log(`📄 콘텐츠 #${i}`);
  console.log(`${'─'.repeat(60)}`);
  console.log(`제목: ${content.title}`);
  console.log(`설명: ${content.description}`);
  console.log(`Slug: ${content.slug}`);
  console.log(`단어 수: ${content.wordCount}`);
  console.log(`섹션 수: ${content.sections.length}`);
  console.log(`섹션 순서: ${content.sections.map((s) => s.id).join(' → ')}`);
  console.log(`고유 해시: ${content.hash}`);
  console.log(`품질 점수: ${quality.score}/100 (${quality.valid ? '통과' : '실패'})`);

  // 각 섹션 헤딩만 출력
  console.log(`\n구조:`);
  for (const section of content.sections) {
    console.log(`  H2: ${section.heading}`);
    if (section.subheadings) {
      for (const sub of section.subheadings) {
        console.log(`    H3: ${sub.heading}`);
      }
    }
  }
  console.log('');
}

// 대량 생성 테스트
console.log(`${'═'.repeat(60)}`);
console.log('📊 대량 생성 테스트 (1000개)');
console.log(`${'═'.repeat(60)}`);

const start = performance.now();
const batch = engine.spinBatch(1000);
const elapsed = performance.now() - start;

const uniqueHashes = new Set(batch.map((c) => c.hash));
const uniqueTitles = new Set(batch.map((c) => c.title));
const wordCounts = batch.map((c) => c.wordCount);
const avgWords = Math.round(wordCounts.reduce((a, b) => a + b, 0) / wordCounts.length);
const minWords = Math.min(...wordCounts);
const maxWords = Math.max(...wordCounts);

console.log(`생성 시간: ${elapsed.toFixed(0)}ms (건당 ${(elapsed / 1000).toFixed(2)}ms)`);
console.log(`고유 콘텐츠: ${uniqueHashes.size}/1000 (${((uniqueHashes.size / 1000) * 100).toFixed(1)}%)`);
console.log(`고유 제목: ${uniqueTitles.size}/1000`);
console.log(`단어 수: 평균 ${avgWords} / 최소 ${minWords} / 최대 ${maxWords}`);
