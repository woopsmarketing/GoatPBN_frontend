/**
 * 마스터 콘텐츠 생성 파이프라인 오케스트레이터
 *
 * Step 1: 키워드 확장
 * Step 2: 제목 후보 생성
 * Step 3: 마스터 콘텐츠 생성
 * (Step 4: 스핀택스 변환 — 추후 구현)
 */

import { LLMClient } from './llmClient.js';
import { expandKeywords } from './keywordExpander.js';
import { generateTitles } from './titleGenerator.js';
import { generateMasterContent } from './masterContentGenerator.js';

/**
 * 마스터 콘텐츠 생성 파이프라인 실행
 * @param {string} keyword - 메인 키워드
 * @param {object} [options]
 * @param {import('./llmClient.js').LLMClient} [options.llmClient] - 커스텀 LLM 클라이언트
 * @param {function} [options.onStep] - 단계별 콜백 (step, data) => void
 * @returns {Promise<object>} 파이프라인 최종 결과
 */
export async function runPipeline(keyword, options = {}) {
  const llmClient = options.llmClient || new LLMClient();
  const onStep = options.onStep || (() => {});

  const result = {
    keyword,
    steps: {},
    startedAt: new Date().toISOString()
  };

  // Step 1: 키워드 확장
  onStep('keyword_expand', { status: 'started' });
  const keywordData = await expandKeywords(llmClient, keyword);
  result.steps.keywordExpand = keywordData;
  onStep('keyword_expand', { status: 'completed', data: keywordData });

  // Step 2: 제목 후보 생성
  onStep('title_generate', { status: 'started' });
  const titleData = await generateTitles(llmClient, keywordData);
  result.steps.titleGenerate = titleData;
  onStep('title_generate', { status: 'completed', data: titleData });

  // Step 3: 마스터 콘텐츠 생성
  onStep('master_content', { status: 'started' });
  const masterContent = await generateMasterContent(llmClient, keywordData, titleData);
  result.steps.masterContent = masterContent;
  onStep('master_content', { status: 'completed', data: masterContent });

  result.completedAt = new Date().toISOString();
  result.llmCallCount = llmClient.callCount;

  return result;
}

export { LLMClient } from './llmClient.js';
export { expandKeywords } from './keywordExpander.js';
export { generateTitles } from './titleGenerator.js';
export { generateMasterContent } from './masterContentGenerator.js';
