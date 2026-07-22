/**
 * Step 2: 제목 후보 생성
 * 메인 키워드 + 관련 키워드를 조합하여 블로그 글 제목 10~20개를 생성한다.
 *
 * @module pipeline/titleGenerator
 */

const SYSTEM_PROMPT = `당신은 SEO 최적화된 블로그 제목을 작성하는 전문가입니다.
사용자가 제공하는 키워드들을 활용하여 클릭률이 높고 SEO에 최적화된 블로그 글 제목을 생성해야 합니다.

규칙:
1. 제목 15~20개를 생성
2. 메인 키워드를 반드시 포함하는 제목 최소 10개
3. 관련 키워드를 조합한 제목 5~10개
4. 제목 유형을 다양하게 (가이드형, 리스트형, 질문형, 비교형, How-to형 등)
5. 한국어로 작성
6. 제목 길이: 20~60자
7. SEO 관점에서 검색 의도를 반영

반드시 아래 JSON 형식으로 응답:
{
  "titles": [
    {"title": "제목 텍스트", "type": "가이드형", "keywords_used": ["사용된 키워드들"]},
    ...
  ]
}`;

/**
 * 제목 후보 생성
 * @param {import('./llmClient.js').LLMClient} llmClient
 * @param {object} keywordData - Step 1의 출력
 * @returns {Promise<object>} 제목 후보 데이터
 */
export async function generateTitles(llmClient, keywordData) {
  const userPrompt = `메인 키워드: "${keywordData.main_keyword}"

관련 키워드:
- LSI: ${(keywordData.lsi_keywords || []).join(', ')}
- 롱테일: ${(keywordData.longtail_keywords || []).join(', ')}
- 관련 주제: ${(keywordData.related_topics || []).join(', ')}

위 키워드들을 활용하여 SEO 최적화된 블로그 글 제목 15~20개를 생성해주세요.
다양한 유형(가이드형, 리스트형, 질문형, 비교형, How-to형 등)으로 만들어주세요.`;

  const response = await llmClient.call({
    step: 'title_generate',
    systemPrompt: SYSTEM_PROMPT,
    userPrompt,
    responseFormat: 'json'
  });

  const result = typeof response === 'string' ? JSON.parse(response) : response;

  // 검증
  if (!result.titles || result.titles.length === 0) {
    throw new Error('제목이 생성되지 않았습니다');
  }

  return result;
}

export { SYSTEM_PROMPT as TITLE_GENERATE_PROMPT };
