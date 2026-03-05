// v1.0 - API 키 CRUD 함수 (2026.03.05)
// 한글 주석: API 키 생성, 조회, 수정, 삭제 기능 제공
// 목적: 사용자가 외부 연동을 위한 API 키를 관리할 수 있도록 함

import { supabase } from '../supabase';
import crypto from 'crypto';

/**
 * 안전한 랜덤 API 키 생성
 * 한글 주석: 32바이트 랜덤 문자열을 생성하여 64자 16진수 문자열로 변환
 *
 * @returns {string} 64자 16진수 API 키
 *
 * @example
 * const apiKey = generateApiKey();
 * // 결과: "a1b2c3d4e5f6..."
 */
export function generateApiKey() {
  // 32바이트 랜덤 데이터를 생성하여 64자 16진수 문자열로 변환
  return crypto.randomBytes(32).toString('hex');
}

/**
 * API 키 목록 조회
 * 한글 주석: 현재 로그인한 사용자의 모든 API 키를 조회
 *
 * @returns {Promise<{data: Array, error: string|null}>}
 */
export async function getApiKeys() {
  try {
    const {
      data: { user }
    } = await supabase.auth.getUser();

    if (!user) {
      throw new Error('로그인이 필요합니다.');
    }

    const { data, error } = await supabase
      .from('api_keys')
      .select('id, key_name, api_key, is_active, last_used_at, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return { data: data || [], error: null };
  } catch (error) {
    console.error('API 키 목록 조회 오류:', error);
    return { data: [], error: error.message };
  }
}

/**
 * 새 API 키 생성
 * 한글 주석: 사용자를 위한 새로운 API 키를 생성하고 데이터베이스에 저장
 *
 * @param {string} keyName - API 키 이름 (식별용)
 * @returns {Promise<{data: object|null, error: string|null}>}
 *
 * @example
 * const result = await createApiKey("외부 프로젝트 연동");
 * if (result.data) {
 *   console.log('생성된 API 키:', result.data.api_key);
 * }
 */
export async function createApiKey(keyName) {
  try {
    const {
      data: { user }
    } = await supabase.auth.getUser();

    if (!user) {
      throw new Error('로그인이 필요합니다.');
    }

    // 키 이름 검증
    if (!keyName || keyName.trim().length === 0) {
      throw new Error('API 키 이름을 입력해주세요.');
    }

    // 안전한 랜덤 API 키 생성
    const apiKey = generateApiKey();

    // 데이터베이스에 저장
    const newApiKey = {
      user_id: user.id,
      key_name: keyName.trim(),
      api_key: apiKey,
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const { data, error } = await supabase.from('api_keys').insert([newApiKey]).select().single();

    if (error) throw error;

    console.log('API 키 생성 성공:', {
      id: data.id,
      key_name: data.key_name,
      created_at: data.created_at
    });

    return { data, error: null };
  } catch (error) {
    console.error('API 키 생성 오류:', error);
    return { data: null, error: error.message };
  }
}

/**
 * API 키 활성화/비활성화 토글
 * 한글 주석: API 키의 활성화 상태를 변경 (삭제하지 않고 비활성화)
 *
 * @param {string} apiKeyId - API 키 ID
 * @param {boolean} isActive - 활성화 여부
 * @returns {Promise<{data: object|null, error: string|null}>}
 */
export async function toggleApiKey(apiKeyId, isActive) {
  try {
    const {
      data: { user }
    } = await supabase.auth.getUser();

    if (!user) {
      throw new Error('로그인이 필요합니다.');
    }

    const { data, error } = await supabase
      .from('api_keys')
      .update({
        is_active: isActive,
        updated_at: new Date().toISOString()
      })
      .eq('id', apiKeyId)
      .eq('user_id', user.id)
      .select()
      .single();

    if (error) throw error;

    console.log(`API 키 ${isActive ? '활성화' : '비활성화'} 성공:`, data.key_name);

    return { data, error: null };
  } catch (error) {
    console.error('API 키 상태 변경 오류:', error);
    return { data: null, error: error.message };
  }
}

/**
 * API 키 삭제
 * 한글 주석: API 키를 데이터베이스에서 완전히 삭제 (복구 불가)
 *
 * @param {string} apiKeyId - API 키 ID
 * @returns {Promise<{success: boolean, error: string|null}>}
 */
export async function deleteApiKey(apiKeyId) {
  try {
    const {
      data: { user }
    } = await supabase.auth.getUser();

    if (!user) {
      throw new Error('로그인이 필요합니다.');
    }

    const { error } = await supabase.from('api_keys').delete().eq('id', apiKeyId).eq('user_id', user.id);

    if (error) throw error;

    console.log('API 키 삭제 성공:', apiKeyId);

    return { success: true, error: null };
  } catch (error) {
    console.error('API 키 삭제 오류:', error);
    return { success: false, error: error.message };
  }
}

/**
 * API 키 이름 변경
 * 한글 주석: 기존 API 키의 이름을 변경 (키 값은 변경하지 않음)
 *
 * @param {string} apiKeyId - API 키 ID
 * @param {string} newKeyName - 새 API 키 이름
 * @returns {Promise<{data: object|null, error: string|null}>}
 */
export async function updateApiKeyName(apiKeyId, newKeyName) {
  try {
    const {
      data: { user }
    } = await supabase.auth.getUser();

    if (!user) {
      throw new Error('로그인이 필요합니다.');
    }

    if (!newKeyName || newKeyName.trim().length === 0) {
      throw new Error('API 키 이름을 입력해주세요.');
    }

    const { data, error } = await supabase
      .from('api_keys')
      .update({
        key_name: newKeyName.trim(),
        updated_at: new Date().toISOString()
      })
      .eq('id', apiKeyId)
      .eq('user_id', user.id)
      .select()
      .single();

    if (error) throw error;

    console.log('API 키 이름 변경 성공:', data.key_name);

    return { data, error: null };
  } catch (error) {
    console.error('API 키 이름 변경 오류:', error);
    return { data: null, error: error.message };
  }
}

/**
 * 특정 API 키 상세 조회
 * 한글 주석: API 키 ID로 상세 정보 조회
 *
 * @param {string} apiKeyId - API 키 ID
 * @returns {Promise<{data: object|null, error: string|null}>}
 */
export async function getApiKeyById(apiKeyId) {
  try {
    const {
      data: { user }
    } = await supabase.auth.getUser();

    if (!user) {
      throw new Error('로그인이 필요합니다.');
    }

    const { data, error } = await supabase.from('api_keys').select('*').eq('id', apiKeyId).eq('user_id', user.id).single();

    if (error) throw error;

    return { data, error: null };
  } catch (error) {
    console.error('API 키 조회 오류:', error);
    return { data: null, error: error.message };
  }
}

/**
 * 사용자의 활성 API 키 개수 조회
 * 한글 주석: 사용자가 생성한 활성 API 키의 총 개수를 반환
 *
 * @returns {Promise<{count: number, error: string|null}>}
 */
export async function getActiveApiKeyCount() {
  try {
    const {
      data: { user }
    } = await supabase.auth.getUser();

    if (!user) {
      throw new Error('로그인이 필요합니다.');
    }

    const { count, error } = await supabase
      .from('api_keys')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('is_active', true);

    if (error) throw error;

    return { count: count || 0, error: null };
  } catch (error) {
    console.error('활성 API 키 개수 조회 오류:', error);
    return { count: 0, error: error.message };
  }
}
