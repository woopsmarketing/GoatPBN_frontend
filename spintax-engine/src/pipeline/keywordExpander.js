/**
 * Step 1: 키워드 확장
 * 메인 키워드 1개를 입력받아 관련 키워드 10~20개를 추출한다.
 *
 * @module pipeline/keywordExpander
 */

const SYSTEM_PROMPT = `당신은 SEO 키워드 리서치 전문가입니다.
사용자가 제공하는 메인 키워드에 대해 관련 키워드를 추출해야 합니다.

규칙:
1. LSI(Latent Semantic Indexing) 키워드 5~8개: 메인 키워드와 의미적으로 관련된 키워드
2. 롱테일 키워드 5~8개: 메인 키워드를 포함하는 구체적이고 긴 검색어
3. 관련 주제 키워드 3~5개: 같은 분야에서 자주 함께 검색되는 키워드
4. 모든 키워드는 한국어로 작성
5. 실제 사람들이 검색할 법한 자연스러운 키워드여야 함

반드시 아래 JSON 형식으로 응답:
{
  "main_keyword": "메인 키워드",
  "lsi_keywords": ["키워드1", "키워드2", ...],
  "longtail_keywords": ["롱테일1", "롱테일2", ...],
  "related_topics": ["주제1", "주제2", ...],
  "all_keywords": ["모든 키워드를 하나의 배열로"]
}`;

/**
 * 키워드 확장 실행
 * @param {import('./llmClient.js').LLMClient} llmClient
 * @param {string} mainKeyword - 메인 키워드
 * @returns {Promise<object>} 확장된 키워드 데이터
 */
export async function expandKeywords(llmClient, mainKeyword) {
  const userPrompt = `메인 키워드: "${mainKeyword}"

이 키워드에 대해 SEO 관점에서 관련 키워드를 추출해주세요.
LSI 키워드, 롱테일 키워드, 관련 주제 키워드를 포함하여 총 15~20개를 추출해주세요.`;

  const response = await llmClient.call({
    step: 'keyword_expand',
    systemPrompt: SYSTEM_PROMPT,
    userPrompt,
    responseFormat: 'json'
  });

  const result = typeof response === 'string' ? JSON.parse(response) : response;

  // 검증
  if (!result.main_keyword) result.main_keyword = mainKeyword;
  if (!result.all_keywords || result.all_keywords.length === 0) {
    result.all_keywords = [...(result.lsi_keywords || []), ...(result.longtail_keywords || []), ...(result.related_topics || [])];
  }

  return result;
}

export { SYSTEM_PROMPT as KEYWORD_EXPAND_PROMPT };
