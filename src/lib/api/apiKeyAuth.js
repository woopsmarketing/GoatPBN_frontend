// v1.0 - API 키 인증 로직 (2026.03.05)
// 한글 주석: 외부 API 요청에 대한 API 키 검증 시스템
// 목적: Authorization 헤더의 Bearer 토큰을 검증하여 사용자 인증

import { createClient } from '@supabase/supabase-js';

/**
 * 서버 사이드 Supabase 클라이언트 생성
 * 한글 주석: 서비스 역할 키를 사용하여 RLS 정책을 우회하고 API 키 검증
 */
function getServiceSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Supabase 환경 변수가 설정되지 않았습니다.');
  }

  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
}

/**
 * API 키 검증 함수
 * 한글 주석: Authorization 헤더에서 API 키를 추출하고 검증하여 사용자 정보 반환
 *
 * @param {string} authHeader - Authorization 헤더 값 (예: "Bearer abc123...")
 * @returns {Promise<{valid: boolean, userId?: string, error?: string}>}
 *
 * @example
 * const result = await validateApiKey(request.headers.get('Authorization'));
 * if (result.valid) {
 *   console.log('인증된 사용자 ID:', result.userId);
 * }
 */
export async function validateApiKey(authHeader) {
  try {
    // Authorization 헤더 검증
    if (!authHeader) {
      return {
        valid: false,
        error: 'Authorization 헤더가 없습니다.'
      };
    }

    // Bearer 토큰 형식 검증
    if (!authHeader.startsWith('Bearer ')) {
      return {
        valid: false,
        error: 'Authorization 헤더 형식이 올바르지 않습니다. "Bearer YOUR_API_KEY" 형식이어야 합니다.'
      };
    }

    // API 키 추출
    const apiKey = authHeader.substring(7).trim(); // "Bearer " 제거

    if (!apiKey || apiKey.length === 0) {
      return {
        valid: false,
        error: 'API 키가 비어있습니다.'
      };
    }

    // Supabase 서비스 클라이언트로 API 키 조회
    const supabase = getServiceSupabaseClient();

    const { data, error } = await supabase
      .from('api_keys')
      .select('id, user_id, key_name, is_active, last_used_at')
      .eq('api_key', apiKey)
      .single();

    // 조회 오류 처리
    if (error) {
      console.error('API 키 조회 오류:', error);
      return {
        valid: false,
        error: '유효하지 않은 API 키입니다.'
      };
    }

    // API 키가 존재하지 않음
    if (!data) {
      return {
        valid: false,
        error: '유효하지 않은 API 키입니다.'
      };
    }

    // API 키가 비활성화됨
    if (!data.is_active) {
      return {
        valid: false,
        error: 'API 키가 비활성화되었습니다. 관리자에게 문의하세요.'
      };
    }

    // 마지막 사용 시간 업데이트 (비동기로 처리하여 응답 속도에 영향 없음)
    supabase
      .from('api_keys')
      .update({ last_used_at: new Date().toISOString() })
      .eq('id', data.id)
      .then(() => {
        console.log(`API 키 사용 기록 업데이트: ${data.key_name} (${data.id})`);
      })
      .catch((err) => {
        console.error('API 키 사용 시간 업데이트 실패:', err);
      });

    // 검증 성공
    return {
      valid: true,
      userId: data.user_id,
      apiKeyId: data.id,
      keyName: data.key_name
    };
  } catch (error) {
    console.error('API 키 검증 중 예외 발생:', error);
    return {
      valid: false,
      error: '서버 오류가 발생했습니다.'
    };
  }
}

/**
 * Next.js API Route에서 사용할 인증 미들웨어
 * 한글 주석: API 키 검증 후 사용자 ID를 반환하거나 에러 응답
 *
 * @param {Request} request - Next.js Request 객체
 * @returns {Promise<{authenticated: boolean, userId?: string, error?: Response}>}
 *
 * @example
 * export async function POST(request) {
 *   const auth = await authenticateRequest(request);
 *   if (!auth.authenticated) {
 *     return auth.error; // 에러 응답 반환
 *   }
 *   const userId = auth.userId;
 *   // ... 비즈니스 로직 처리
 * }
 */
export async function authenticateRequest(request) {
  const authHeader = request.headers.get('Authorization');
  const result = await validateApiKey(authHeader);

  if (!result.valid) {
    return {
      authenticated: false,
      error: Response.json(
        {
          success: false,
          error: result.error || '인증 실패'
        },
        { status: 401 }
      )
    };
  }

  return {
    authenticated: true,
    userId: result.userId,
    apiKeyId: result.apiKeyId,
    keyName: result.keyName
  };
}
