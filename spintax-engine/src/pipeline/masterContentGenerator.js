/**
 * Step 3: 마스터 콘텐츠 생성
 * 키워드 전체 + 제목 후보를 참고하여 고품질 SEO 최적화 콘텐츠 1편을 생성한다.
 *
 * @module pipeline/masterContentGenerator
 */

const SYSTEM_PROMPT = `당신은 SEO 전문 콘텐츠 작가입니다.
제공된 키워드와 제목 후보를 참고하여 최고 품질의 SEO 최적화 블로그 글을 작성해야 합니다.

## 콘텐츠 요구사항

### 구조
- H2 기준 8~10개 섹션
- 각 섹션에 H3 소제목 1~3개 포함
- 도입부(intro)와 결론부(outro) 별도 작성
- 총 단어 수: 4,000~5,000 단어 (한국어 기준)

### SEO 최적화
- 메인 키워드를 제목, 도입부, 각 섹션에 자연스럽게 배치
- 관련 키워드와 롱테일 키워드를 본문 전체에 고르게 분포
- 키워드 밀도: 메인 키워드 1.5~2.5%
- 메타 설명(description) 포함: 150~160자
- URL slug 제안 포함

### 품질
- 전문적이고 신뢰할 수 있는 톤
- 구체적인 수치, 예시, 비교를 포함
- 실용적이고 실행 가능한 정보 제공
- 자연스러운 한국어 문체 (번역체 금지)
- 리스트, 표, 단계별 설명 등 다양한 포맷 활용

### 출력 형식
반드시 아래 JSON 형식으로 응답:
{
  "title": "최종 선택된 제목",
  "description": "메타 설명 (150~160자)",
  "slug": "url-slug",
  "intro": "도입부 HTML (2~3 단락, <p> 태그 사용)",
  "sections": [
    {
      "id": "section_1",
      "heading": "H2 제목",
      "body": "본문 HTML (<p>, <ul>, <li>, <strong> 등 사용)",
      "subheadings": [
        {
          "heading": "H3 소제목",
          "body": "소제목 본문 HTML"
        }
      ]
    }
  ],
  "outro": "결론부 HTML (2~3 단락)",
  "word_count": 4500,
  "keywords_used": ["사용된 키워드 목록"]
}`;

/**
 * 마스터 콘텐츠 생성
 * @param {import('./llmClient.js').LLMClient} llmClient
 * @param {object} keywordData - Step 1의 출력
 * @param {object} titleData - Step 2의 출력
 * @returns {Promise<object>} 마스터 콘텐츠 데이터
 */
export async function generateMasterContent(llmClient, keywordData, titleData) {
  const titleList = titleData.titles.map((t, i) => `${i + 1}. ${t.title} (${t.type})`).join('\n');

  const userPrompt = `## 입력 데이터

### 메인 키워드
"${keywordData.main_keyword}"

### 관련 키워드 전체
- LSI: ${(keywordData.lsi_keywords || []).join(', ')}
- 롱테일: ${(keywordData.longtail_keywords || []).join(', ')}
- 관련 주제: ${(keywordData.related_topics || []).join(', ')}

### 제목 후보 (참고용)
${titleList}

## 요청
위 키워드와 제목 후보를 모두 참고하여 최고 품질의 SEO 최적화 블로그 글 1편을 작성해주세요.

필수 조건:
1. 4,000~5,000 단어
2. H2 섹션 8~10개, 각 섹션에 H3 소제목 1~3개
3. 모든 관련 키워드가 본문에 자연스럽게 포함
4. 도입부와 결론부 별도 작성
5. 전문적이면서도 읽기 쉬운 한국어 문체
6. JSON 형식으로 출력`;

  const response = await llmClient.call({
    step: 'master_content',
    systemPrompt: SYSTEM_PROMPT,
    userPrompt,
    responseFormat: 'json'
  });

  const result = typeof response === 'string' ? JSON.parse(response) : response;

  // 검증
  if (!result.title) throw new Error('제목이 없습니다');
  if (!result.sections || result.sections.length === 0) throw new Error('섹션이 없습니다');

  return result;
}

export { SYSTEM_PROMPT as MASTER_CONTENT_PROMPT };
