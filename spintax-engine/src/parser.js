/**
 * 스핀택스 파서
 * 중첩 스핀택스 문법을 재귀적으로 해석하여 랜덤 변형을 생성한다.
 *
 * 지원 문법:
 *   {옵션A|옵션B|옵션C}         — 기본 스핀택스
 *   {옵션A {하위1|하위2}|옵션B}  — 중첩 스핀택스
 */

/**
 * 중첩 스핀택스 문자열에서 가장 안쪽 {} 블록부터 해석한다.
 * @param {string} text - 스핀택스 문자열
 * @param {function} rng - () => 0~1 사이 랜덤 숫자 반환 함수
 * @returns {string} 해석된 문자열
 */
export function resolveSpintax(text, rng = Math.random) {
  if (!text || typeof text !== 'string') return text || '';

  // 가장 안쪽 {} 블록부터 반복 해석
  const pattern = /\{([^{}]+)\}/;
  let result = text;
  let safety = 0;
  const maxIterations = 1000;

  while (pattern.test(result) && safety < maxIterations) {
    result = result.replace(pattern, (_, group) => {
      const options = splitOptions(group);
      if (options.length === 0) return '';
      const index = Math.floor(rng() * options.length);
      return options[index];
    });
    safety++;
  }

  return result;
}

/**
 * 파이프(|)로 옵션을 분리한다.
 * 중첩된 {} 내부의 파이프는 무시한다.
 * @param {string} group - {} 내부 문자열
 * @returns {string[]} 옵션 배열
 */
export function splitOptions(group) {
  const options = [];
  let current = '';
  let depth = 0;

  for (let i = 0; i < group.length; i++) {
    const char = group[i];
    if (char === '{') {
      depth++;
      current += char;
    } else if (char === '}') {
      depth--;
      current += char;
    } else if (char === '|' && depth === 0) {
      options.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  options.push(current);

  return options;
}

/**
 * 스핀택스 문자열에서 가능한 조합 수를 추정한다.
 * @param {string} text - 스핀택스 문자열
 * @returns {number} 추정 조합 수
 */
export function estimateCombinations(text) {
  if (!text || typeof text !== 'string') return 1;

  let combinations = 1;
  const pattern = /\{([^{}]+)\}/g;
  let working = text;
  let safety = 0;

  while (pattern.test(working) && safety < 100) {
    working = working.replace(/\{([^{}]+)\}/g, (_, group) => {
      const options = splitOptions(group);
      combinations *= options.length;
      return options[0]; // 첫 번째 옵션으로 치환하여 중첩 처리
    });
    pattern.lastIndex = 0;
    safety++;
  }

  return combinations;
}
