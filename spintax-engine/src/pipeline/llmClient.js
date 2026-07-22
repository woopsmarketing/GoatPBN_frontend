/**
 * LLM 클라이언트 추상화 레이어
 * mock 모드와 실제 API 호출 모드를 스위칭할 수 있다.
 *
 * 향후 실제 구현 시 callLLM() 내부만 교체하면 된다.
 */

/**
 * @typedef {'mock' | 'openai' | 'anthropic'} LLMProvider
 */

/**
 * LLM 호출 클라이언트
 */
export class LLMClient {
  /**
   * @param {object} options
   * @param {LLMProvider} [options.provider='mock'] - 사용할 LLM 제공자
   * @param {string} [options.model] - 모델명
   * @param {string} [options.apiKey] - API 키
   * @param {object} [options.mockResponses] - mock 모드용 사전 정의 응답
   */
  constructor(options = {}) {
    this.provider = options.provider || 'mock';
    this.model = options.model || 'mock';
    this.apiKey = options.apiKey || '';
    this.mockResponses = options.mockResponses || {};
    this.callCount = 0;
  }

  /**
   * LLM에 프롬프트를 보내고 응답을 받는다.
   * @param {object} params
   * @param {string} params.step - 파이프라인 단계 식별자 (e.g. 'keyword_expand')
   * @param {string} params.systemPrompt - 시스템 프롬프트
   * @param {string} params.userPrompt - 사용자 프롬프트
   * @param {string} [params.responseFormat='text'] - 'text' | 'json'
   * @returns {Promise<string>} LLM 응답 텍스트
   */
  async call({ step, systemPrompt, userPrompt, responseFormat = 'text' }) {
    this.callCount++;

    if (this.provider === 'mock') {
      return this._mockCall(step, userPrompt);
    }

    // 향후 실제 API 구현 위치
    // if (this.provider === 'openai') { ... }
    // if (this.provider === 'anthropic') { ... }

    throw new Error(`지원하지 않는 provider: ${this.provider}`);
  }

  /**
   * Mock 모드: 사전 정의된 응답을 반환
   */
  _mockCall(step, userPrompt) {
    if (this.mockResponses[step]) {
      const response = this.mockResponses[step];
      return typeof response === 'function' ? response(userPrompt) : response;
    }
    throw new Error(`Mock 응답이 정의되지 않음: step="${step}"`);
  }
}
