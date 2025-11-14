/**
 * 콘텐츠 구조 생성 API 클라이언트
 * 제목과 키워드들을 기반으로 콘텐츠의 구조(목차)를 생성하는 API 호출 함수들
 */

const API_BASE_URL = 'http://localhost:8000';

/**
 * 콘텐츠 구조 생성 API 호출
 * @param {Object} data - 콘텐츠 구조 생성 요청 데이터
 * @param {string} data.title - 콘텐츠 제목
 * @param {string} data.main_keyword - 메인 키워드
 * @param {Array<string>} data.lsi_keywords - LSI 키워드 리스트
 * @param {Array<string>} data.longtail_keywords - 롱테일 키워드 리스트
 * @param {string} [data.persona="expert"] - 페르소나
 * @param {number} [data.section_count=6] - 섹션 개수 (5-10개)
 * @param {string} [data.api_key] - OpenAI API 키 (선택사항)
 * @returns {Promise<Object>} 콘텐츠 구조 생성 결과
 */
export const generateContentStructure = async (data) => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/content-structure/generate`, {
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
    console.error('콘텐츠 구조 생성 API 호출 실패:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * 콘텐츠 구조 생성 API 상태 확인
 * @returns {Promise<Object>} API 상태 정보
 */
export const checkContentStructureApiHealth = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/content-structure/health`, {
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
    console.error('콘텐츠 구조 생성 API 상태 확인 실패:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// 명명된 내보내기
export const contentStructureAPI = {
  generateContentStructure,
  checkContentStructureApiHealth
};

// 기본 내보내기 (하위 호환성을 위해)
export default contentStructureAPI;
