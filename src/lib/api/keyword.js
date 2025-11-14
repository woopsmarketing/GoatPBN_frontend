/**
 * 키워드 생성 API 클라이언트
 * 메인 키워드로부터 LSI 키워드와 롱테일 키워드를 생성하는 API 호출 함수들
 */

const API_BASE_URL = 'http://localhost:8000';

/**
 * 키워드 생성 API 호출
 * @param {Object} data - 키워드 생성 요청 데이터
 * @param {string} data.main_keyword - 메인 키워드
 * @param {number} [data.lsi_count=5] - LSI 키워드 개수
 * @param {number} [data.longtail_count=5] - 롱테일 키워드 개수
 * @param {string} [data.api_key] - OpenAI API 키 (선택사항)
 * @returns {Promise<Object>} 키워드 생성 결과
 */
export const generateKeywords = async (data) => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/keyword/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    return {
      success: true,
      data: result
    };
  } catch (error) {
    console.error('키워드 생성 API 호출 실패:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * 키워드 생성 API 상태 확인
 * @returns {Promise<Object>} API 상태 정보
 */
export const checkKeywordApiHealth = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/keyword/health`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    return {
      success: true,
      data: result
    };
  } catch (error) {
    console.error('키워드 생성 API 상태 확인 실패:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// 명명된 내보내기
export const keywordAPI = {
  generateKeywords,
  checkKeywordApiHealth
};

// 기본 내보내기 (하위 호환성을 위해)
export default keywordAPI;
