/**
 * 품질 검증기
 * 생성된 콘텐츠가 SEO 기준과 품질 요건을 충족하는지 검사한다.
 */

/**
 * @param {object} content - 스핀 엔진 출력
 * @param {object} config - 검증 설정
 * @param {string} config.mainKeyword - 메인 키워드
 * @param {number} [config.minWordCount=1500] - 최소 단어 수
 * @param {number} [config.maxWordCount=4000] - 최대 단어 수
 * @param {number} [config.minKeywordDensity=0.5] - 최소 키워드 밀도 (%)
 * @param {number} [config.maxKeywordDensity=3.5] - 최대 키워드 밀도 (%)
 * @returns {object} { valid: boolean, checks: object[], score: number }
 */
export function validateContent(content, config) {
  const checks = [
    checkWordCount(content, config),
    checkBrokenSpintax(content),
    checkKeywordDensity(content, config),
    checkHeadingPresence(content),
    checkTitleLength(content),
    checkDescriptionLength(content),
    checkSectionCount(content)
  ];

  const passed = checks.filter((c) => c.passed).length;
  const score = Math.round((passed / checks.length) * 100);
  const valid = checks.every((c) => c.passed || !c.critical);

  return { valid, checks, score };
}

function checkWordCount(content, config) {
  const min = config.minWordCount ?? 1500;
  const max = config.maxWordCount ?? 4000;
  const count = content.wordCount;
  const passed = count >= min && count <= max;

  return {
    name: 'word_count',
    passed,
    critical: true,
    message: passed ? `단어 수 ${count} (${min}~${max} 범위 내)` : `단어 수 ${count} (${min}~${max} 범위 벗어남)`,
    value: count
  };
}

function checkBrokenSpintax(content) {
  const body = content.body || '';
  const hasBroken = /\{[^}]*$/.test(body) || /^[^{]*\}/.test(body) || (body.match(/\{/g)?.length || 0) !== (body.match(/\}/g)?.length || 0);

  return {
    name: 'broken_spintax',
    passed: !hasBroken,
    critical: true,
    message: hasBroken ? '해석되지 않은 스핀택스가 남아 있음' : '모든 스핀택스 정상 해석됨'
  };
}

function checkKeywordDensity(content, config) {
  const keyword = config.mainKeyword;
  if (!keyword) return { name: 'keyword_density', passed: true, critical: false, message: '키워드 미지정 (건너뜀)' };

  const text = (content.body || '').replace(/<[^>]+>/g, ' ').toLowerCase();
  const keywordLower = keyword.toLowerCase();
  const words = text.split(/\s+/).filter(Boolean);
  const totalWords = words.length;

  if (totalWords === 0) {
    return { name: 'keyword_density', passed: false, critical: true, message: '본문이 비어 있음', value: 0 };
  }

  // 키워드 출현 횟수 (부분 문자열 매칭)
  let count = 0;
  let pos = 0;
  while ((pos = text.indexOf(keywordLower, pos)) !== -1) {
    count++;
    pos += keywordLower.length;
  }

  const density = (count / totalWords) * 100;
  const min = config.minKeywordDensity ?? 0.5;
  const max = config.maxKeywordDensity ?? 3.5;
  const passed = density >= min && density <= max;

  return {
    name: 'keyword_density',
    passed,
    critical: false,
    message: `키워드 "${keyword}" 밀도: ${density.toFixed(2)}% (${count}회/${totalWords}단어)`,
    value: density
  };
}

function checkHeadingPresence(content) {
  const sections = content.sections || [];
  const passed = sections.length > 0 && sections.every((s) => s.heading && s.heading.trim().length > 0);

  return {
    name: 'heading_presence',
    passed,
    critical: true,
    message: passed ? `${sections.length}개 섹션 모두 제목 있음` : '제목이 없는 섹션 존재'
  };
}

function checkTitleLength(content) {
  const title = content.title || '';
  const len = title.length;
  const passed = len >= 10 && len <= 100;

  return {
    name: 'title_length',
    passed,
    critical: false,
    message: `제목 길이: ${len}자 (${passed ? '적정' : '10~100자 권장'})`
  };
}

function checkDescriptionLength(content) {
  const desc = content.description || '';
  const len = desc.length;
  const passed = len >= 50 && len <= 200;

  return {
    name: 'description_length',
    passed,
    critical: false,
    message: `설명 길이: ${len}자 (${passed ? '적정' : '50~200자 권장'})`
  };
}

function checkSectionCount(content) {
  const count = (content.sections || []).length;
  const passed = count >= 3 && count <= 10;

  return {
    name: 'section_count',
    passed,
    critical: true,
    message: `섹션 수: ${count}개 (${passed ? '적정' : '3~10개 권장'})`
  };
}
