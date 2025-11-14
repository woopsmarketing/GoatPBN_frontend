/**
 * 섹션별 콘텐츠 생성 API 클라이언트
 * 각 섹션의 제목을 기반으로 상세한 콘텐츠를 생성하는 API
 */

const API_BASE_URL = 'http://localhost:8000'; // 하드코딩된 API URL

/**
 * 섹션별 콘텐츠 생성 API 호출
 * @param {Object} requestData - 요청 데이터
 * @param {Array} requestData.sections - 섹션 구조 정보
 * @param {string} requestData.main_keyword - 메인 키워드
 * @param {Array} requestData.lsi_keywords - LSI 키워드 리스트
 * @param {Array} requestData.longtail_keywords - 롱테일 키워드 리스트
 * @param {string} requestData.persona - 페르소나
 * @returns {Promise<Object>} 생성된 섹션 콘텐츠 정보
 */
export const sectionContentAPI = {
  /**
   * 섹션별 콘텐츠 생성
   * @param {Object} requestData - 요청 데이터
   * @returns {Promise<Object>} 생성 결과
   */
  async generateSectionContent(requestData) {
    try {
      console.log('섹션별 콘텐츠 생성 요청:', requestData);

      const response = await fetch(`${API_BASE_URL}/api/section-content/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      console.log('섹션별 콘텐츠 생성 성공:', result);

      return {
        success: true,
        data: result,
        error: null
      };
    } catch (error) {
      console.error('섹션별 콘텐츠 생성 실패:', error);
      return {
        success: false,
        data: null,
        error: error.message
      };
    }
  },

  /**
   * 섹션별 콘텐츠 생성 API 상태 확인
   * @returns {Promise<Object>} API 상태 정보
   */
  async healthCheck() {
    try {
      const response = await fetch(`${API_BASE_URL}/api/section-content/health`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      return {
        success: true,
        data: result,
        error: null
      };
    } catch (error) {
      console.error('섹션별 콘텐츠 생성 API 상태 확인 실패:', error);
      return {
        success: false,
        data: null,
        error: error.message
      };
    }
  }
};

export default sectionContentAPI;
