/**
 * 스핀택스 엔진 테스트
 * 실행: cd seed/spintax-engine && node test/test-engine.js
 */

import { SpintaxEngine, resolveSpintax, splitOptions, estimateCombinations, validateContent } from '../src/index.js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const template = JSON.parse(readFileSync(join(__dirname, 'sample-template.json'), 'utf-8'));

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    passed++;
    console.log(`  ✓ ${name}`);
  } catch (err) {
    failed++;
    console.log(`  ✗ ${name}`);
    console.log(`    ${err.message}`);
  }
}

function assert(condition, message) {
  if (!condition) throw new Error(message || 'Assertion failed');
}

// ─── Parser Tests ───

console.log('\n=== Parser Tests ===');

test('기본 스핀택스 해석', () => {
  const result = resolveSpintax('{A|B|C}', () => 0);
  assert(result === 'A', `Expected "A", got "${result}"`);
});

test('마지막 옵션 선택', () => {
  const result = resolveSpintax('{A|B|C}', () => 0.99);
  assert(result === 'C', `Expected "C", got "${result}"`);
});

test('중첩 스핀택스 해석', () => {
  const result = resolveSpintax('{A {1|2}|B}', () => 0);
  assert(result === 'A 1', `Expected "A 1", got "${result}"`);
});

test('여러 스핀택스 블록 해석', () => {
  const result = resolveSpintax('{A|B} and {C|D}', () => 0);
  assert(result === 'A and C', `Expected "A and C", got "${result}"`);
});

test('스핀택스 없는 텍스트는 그대로 반환', () => {
  const result = resolveSpintax('Hello World');
  assert(result === 'Hello World', `Expected "Hello World", got "${result}"`);
});

test('빈 문자열 처리', () => {
  const result = resolveSpintax('');
  assert(result === '', `Expected "", got "${result}"`);
});

test('null/undefined 처리', () => {
  assert(resolveSpintax(null) === '', 'null should return ""');
  assert(resolveSpintax(undefined) === '', 'undefined should return ""');
});

test('splitOptions: 기본 분리', () => {
  const opts = splitOptions('A|B|C');
  assert(opts.length === 3, `Expected 3 options, got ${opts.length}`);
  assert(opts[0] === 'A' && opts[1] === 'B' && opts[2] === 'C');
});

test('splitOptions: 중첩된 {} 내부 파이프 무시', () => {
  const opts = splitOptions('A {1|2}|B');
  assert(opts.length === 2, `Expected 2 options, got ${opts.length}`);
  assert(opts[0] === 'A {1|2}', `Expected "A {1|2}", got "${opts[0]}"`);
});

test('estimateCombinations: 기본 계산', () => {
  const count = estimateCombinations('{A|B|C} {1|2}');
  assert(count === 6, `Expected 6, got ${count}`);
});

// ─── Engine Tests ───

console.log('\n=== Engine Tests ===');

test('엔진 생성', () => {
  const engine = new SpintaxEngine(template);
  assert(engine instanceof SpintaxEngine);
});

test('시드 기반 재현 가능성', () => {
  const engine1 = new SpintaxEngine(template, { seed: 42 });
  const engine2 = new SpintaxEngine(template, { seed: 42 });
  const result1 = engine1.spin();
  const result2 = engine2.spin();
  assert(result1.title === result2.title, `같은 시드에서 다른 제목: "${result1.title}" vs "${result2.title}"`);
  assert(result1.hash === result2.hash, '같은 시드에서 다른 해시');
});

test('다른 시드 → 다른 결과', () => {
  const engine1 = new SpintaxEngine(template, { seed: 42 });
  const engine2 = new SpintaxEngine(template, { seed: 99 });
  const result1 = engine1.spin();
  const result2 = engine2.spin();
  // 이론적으로 같을 수 있지만 확률적으로 매우 낮음
  assert(result1.hash !== result2.hash, '다른 시드인데 같은 해시 (매우 드문 경우)');
});

test('콘텐츠 구조 검증', () => {
  const engine = new SpintaxEngine(template, { seed: 42 });
  const result = engine.spin();

  assert(result.title && result.title.length > 0, '제목이 비어있음');
  assert(result.description && result.description.length > 0, '설명이 비어있음');
  assert(result.slug && result.slug.length > 0, 'slug가 비어있음');
  assert(result.intro && result.intro.length > 0, '도입부가 비어있음');
  assert(result.sections && result.sections.length > 0, '섹션이 없음');
  assert(result.outro && result.outro.length > 0, '결론부가 비어있음');
  assert(result.body && result.body.length > 0, '본문이 비어있음');
  assert(result.wordCount > 0, '단어 수가 0');
  assert(result.hash && result.hash.length === 32, '해시가 올바르지 않음');
});

test('섹션 수가 structure_variants 범위 내', () => {
  const engine = new SpintaxEngine(template, { seed: 42 });
  const result = engine.spin();
  const sv = template.structure_variants;
  assert(
    result.sections.length >= sv.min_sections && result.sections.length <= sv.max_sections,
    `섹션 수 ${result.sections.length}이 ${sv.min_sections}~${sv.max_sections} 범위 밖`
  );
});

test('필수 섹션 포함 확인', () => {
  const engine = new SpintaxEngine(template, { seed: 42 });
  const result = engine.spin();
  const requiredIds = template.structure_variants.required_sections;
  for (const reqId of requiredIds) {
    assert(
      result.sections.some((s) => s.id === reqId),
      `필수 섹션 "${reqId}"가 누락됨`
    );
  }
});

test('중복 없는 배치 생성', () => {
  const engine = new SpintaxEngine(template);
  const batch = engine.spinBatch(10);
  assert(batch.length === 10, `10개 요청했는데 ${batch.length}개 생성됨`);

  const hashes = new Set(batch.map((c) => c.hash));
  assert(hashes.size === 10, `10개 중 ${hashes.size}개만 고유 (${10 - hashes.size}개 중복)`);
});

test('배치 생성 시 모든 결과에 제목 있음', () => {
  const engine = new SpintaxEngine(template);
  const batch = engine.spinBatch(5);
  for (const content of batch) {
    assert(content.title && content.title.length > 0, '제목이 없는 콘텐츠 발견');
  }
});

test('HTML에 해석되지 않은 스핀택스 없음', () => {
  const engine = new SpintaxEngine(template);
  const batch = engine.spinBatch(20);
  for (const content of batch) {
    const brokenOpen = (content.body.match(/\{/g) || []).length;
    const brokenClose = (content.body.match(/\}/g) || []).length;
    assert(brokenOpen === brokenClose, `스핀택스 잔존: { ${brokenOpen}개, } ${brokenClose}개`);
  }
});

test('목차 포함/제외 옵션', () => {
  const engine1 = new SpintaxEngine(template, { seed: 10 });
  const withToc = engine1.spin({ includeToc: true });
  assert(withToc.body.includes('<nav class="toc">'), '목차가 포함되어야 함');

  const engine2 = new SpintaxEngine(template, { seed: 10 });
  const withoutToc = engine2.spin({ includeToc: false });
  assert(!withoutToc.body.includes('<nav class="toc">'), '목차가 제외되어야 함');
});

test('백링크 삽입 옵션', () => {
  const engine = new SpintaxEngine(template, { seed: 10 });
  const result = engine.spin({ targetUrl: 'https://example.com' });
  assert(result.body.includes('https://example.com'), '타겟 URL이 본문에 포함되어야 함');
});

test('조합 수 추정', () => {
  const engine = new SpintaxEngine(template);
  const combinations = engine.estimateTotalCombinations();
  assert(combinations > 1000, `조합 수가 너무 적음: ${combinations}`);
  console.log(`    → 추정 조합 수: ${combinations.toLocaleString()}`);
});

// ─── Quality Tests ───

console.log('\n=== Quality Checker Tests ===');

test('정상 콘텐츠 검증 통과', () => {
  const engine = new SpintaxEngine(template, { seed: 42 });
  const content = engine.spin();
  const result = validateContent(content, {
    mainKeyword: '도메인 분석',
    minWordCount: 300,
    maxWordCount: 5000
  });
  assert(result.valid, `검증 실패: ${result.checks.filter((c) => !c.passed).map((c) => c.message).join(', ')}`);
  assert(result.score > 0, `점수가 0: ${result.score}`);
  console.log(`    → 품질 점수: ${result.score}/100`);
});

test('단어 수 부족 탐지', () => {
  const engine = new SpintaxEngine(template, { seed: 42 });
  const content = engine.spin();
  const result = validateContent(content, {
    mainKeyword: '도메인 분석',
    minWordCount: 99999
  });
  const wordCheck = result.checks.find((c) => c.name === 'word_count');
  assert(!wordCheck.passed, '단어 수 부족을 탐지해야 함');
});

test('키워드 밀도 검사', () => {
  const engine = new SpintaxEngine(template, { seed: 42 });
  const content = engine.spin();
  const result = validateContent(content, {
    mainKeyword: '도메인 분석',
    minWordCount: 300,
    maxWordCount: 5000
  });
  const densityCheck = result.checks.find((c) => c.name === 'keyword_density');
  console.log(`    → ${densityCheck.message}`);
});

// ─── 대량 생성 성능 테스트 ───

console.log('\n=== Performance Test ===');

test('100개 콘텐츠 생성 성능', () => {
  const engine = new SpintaxEngine(template);
  const start = performance.now();
  const batch = engine.spinBatch(100);
  const elapsed = performance.now() - start;

  const uniqueHashes = new Set(batch.map((c) => c.hash));
  console.log(`    → 100개 생성 시간: ${elapsed.toFixed(1)}ms`);
  console.log(`    → 고유 콘텐츠: ${uniqueHashes.size}/100`);
  console.log(`    → 건당 평균: ${(elapsed / 100).toFixed(2)}ms`);

  assert(elapsed < 5000, `너무 느림: ${elapsed.toFixed(0)}ms (5초 제한)`);
  assert(uniqueHashes.size >= 95, `고유 콘텐츠 부족: ${uniqueHashes.size}/100`);
});

// ─── 결과 ───

console.log('\n' + '='.repeat(40));
console.log(`결과: ${passed} passed, ${failed} failed (total: ${passed + failed})`);
console.log('='.repeat(40));

process.exit(failed > 0 ? 1 : 0);
