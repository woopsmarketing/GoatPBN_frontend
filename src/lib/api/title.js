/**
 * 제목 생성 API 클라이언트
 * 키워드들을 조합하여 다양한 페르소나로 제목을 생성하는 API 호출 함수들
 */

import { buildApiUrl, jsonHeaders } from './httpClient';

/**
 * 제목 생성 API 호출
 * @param {Object} data - 제목 생성 요청 데이터
 * @param {string} data.main_keyword - 메인 키워드
 * @param {string[]} data.lsi_keywords - LSI 키워드 리스트
 * @param {string[]} data.longtail_keywords - 롱테일 키워드 리스트
 * @param {string} data.persona - 페르소나 (기본값: expert)
 * @param {string} [data.api_key] - OpenAI API 키 (선택사항)
 * @returns {Promise<Object>} 제목 생성 결과
 */
export const generateTitle = async (data) => {
  try {
    const response = await fetch(buildApiUrl('/api/title/generate'), {
      method: 'POST',
      headers: jsonHeaders(),
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
    console.error('제목 생성 API 호출 실패:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * 페르소나 목록 조회 API 호출
 * @returns {Promise<Object>} 페르소나 목록
 */
export const getPersonas = async () => {
  try {
    const response = await fetch(buildApiUrl('/api/title/personas'), { method: 'GET', headers: jsonHeaders() });

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
    console.error('페르소나 목록 조회 API 호출 실패:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * 특정 페르소나 정보 조회 API 호출
 * @param {string} personaId - 페르소나 ID
 * @returns {Promise<Object>} 페르소나 정보
 */
export const getPersona = async (personaId) => {
  try {
    const response = await fetch(buildApiUrl(`/api/title/personas/${personaId}`), { method: 'GET', headers: jsonHeaders() });

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
    console.error('페르소나 정보 조회 API 호출 실패:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * 페르소나 카테고리 목록 조회 API 호출
 * @returns {Promise<Object>} 카테고리 목록
 */
export const getCategories = async () => {
  try {
    const response = await fetch(buildApiUrl('/api/title/categories'), { method: 'GET', headers: jsonHeaders() });

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
    console.error('페르소나 카테고리 목록 조회 API 호출 실패:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * 제목 생성 API 상태 확인
 * @returns {Promise<Object>} API 상태 정보
 */
export const checkTitleApiHealth = async () => {
  try {
    const response = await fetch(buildApiUrl('/api/title/health'), { method: 'GET', headers: jsonHeaders() });

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
    console.error('제목 생성 API 상태 확인 실패:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// 명명된 내보내기
export const titleAPI = {
  generateTitle,
  getPersonas,
  getPersona,
  getCategories,
  checkTitleApiHealth
};

// 기본 내보내기 (하위 호환성을 위해)
export default titleAPI;
