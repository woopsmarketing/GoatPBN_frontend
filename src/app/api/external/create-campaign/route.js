// v1.1 - Rate Limiting 추가 (2026.03.05)
// v1.0 - 외부 API 연동 캠페인 생성 엔드포인트 (2026.03.05)
// 한글 주석: 외부 웹앱에서 API 키 인증을 통해 캠페인을 자동 생성하는 API
// 목적: 다른 프로젝트에서 주문 발생 시 자동으로 백링크 캠페인을 생성

import { NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/api/apiKeyAuth';
import { createClient } from '@supabase/supabase-js';
import { buildApiUrl, jsonHeaders } from '@/lib/api/httpClient';
import { checkMultipleRateLimits, getRateLimitHeaders } from '@/lib/api/rateLimiter';

/**
 * 서버 사이드 Supabase 클라이언트 생성
 * 한글 주석: 서비스 역할 키를 사용하여 사용자 인증 없이 데이터 삽입
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
 * 캠페인 스케줄 초기화 (Celery 작업 트리거)
 * 한글 주석: FastAPI 백엔드에 스케줄 초기화 요청을 보내 자동 콘텐츠 생성 시작
 */
async function initializeCampaignSchedule(campaignId, userId, startType, delayMinutes = 5) {
  try {
    const requestBody = {
      campaign_id: String(campaignId),
      user_id: String(userId),
      start_type: String(startType),
      delay_minutes: parseInt(delayMinutes)
    };

    console.log('스케줄 초기화 요청:', requestBody);

    const response = await fetch(buildApiUrl('/api/campaigns/initialize-schedule'), {
      method: 'POST',
      headers: jsonHeaders(),
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('스케줄 초기화 API 오류:', response.status, errorText);
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }

    const result = await response.json();
    console.log('스케줄 초기화 성공:', result);
    return result;
  } catch (error) {
    console.error('스케줄 초기화 실패:', error);
    throw error;
  }
}

/**
 * POST /api/external/create-campaign
 * 한글 주석: 외부 웹앱에서 캠페인 생성 요청을 받아 처리하는 메인 엔드포인트
 *
 * 인증: Authorization: Bearer YOUR_API_KEY
 *
 * 요청 본문:
 * {
 *   "campaignName": "캠페인 이름",
 *   "siteId": "site-uuid",
 *   "siteIds": ["site1-uuid", "site2-uuid"],
 *   "targetSite": "https://target-site.com",
 *   "keywords": ["키워드1", "키워드2"],
 *   "quantity": 50,
 *   "duration": 30,
 *   "persona": "expert",
 *   "sectionCount": 5,
 *   "includeImages": true,
 *   "sectionImageCount": 2,
 *   "includeToc": true,
 *   "includeBacklinks": true,
 *   "includeInternalLinks": false,
 *   "contentLanguage": "ko",
 *   "startType": "immediate",
 *   "delayMinutes": 5
 * }
 */
export async function POST(request) {
  try {
    // 1. API 키 인증
    const auth = await authenticateRequest(request);
    if (!auth.authenticated) {
      console.error('API 키 인증 실패');
      return auth.error;
    }

    const userId = auth.userId;
    const apiKeyId = auth.apiKeyId;
    console.log('✅ API 키 인증 성공:', {
      userId,
      keyName: auth.keyName
    });

    // 2. Rate Limiting 체크 (분당 + 시간당)
    const rateLimitResult = checkMultipleRateLimits(apiKeyId, ['perMinute', 'perHour']);

    if (!rateLimitResult.allowed) {
      const failedLimit = rateLimitResult.details[rateLimitResult.failedLimit];
      const resetDate = new Date(failedLimit.resetAt);

      console.warn('⚠️ Rate Limit 초과:', {
        apiKeyId,
        failedLimit: rateLimitResult.failedLimit,
        requestCount: failedLimit.requestCount,
        resetAt: resetDate.toISOString()
      });

      return NextResponse.json(
        {
          success: false,
          error: 'Too Many Requests',
          message: `요청 제한을 초과했습니다. ${resetDate.toLocaleString('ko-KR')}에 다시 시도하세요.`,
          retry_after: Math.ceil((failedLimit.resetAt - Date.now()) / 1000) // 초 단위
        },
        {
          status: 429,
          headers: {
            'Retry-After': Math.ceil((failedLimit.resetAt - Date.now()) / 1000).toString(),
            'X-RateLimit-Limit': '10',
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': resetDate.toISOString()
          }
        }
      );
    }

    console.log('✅ Rate Limit 체크 통과:', {
      perMinute: `${rateLimitResult.details.perMinute.requestCount}/10`,
      perHour: `${rateLimitResult.details.perHour.requestCount}/100`
    });

    // 3. 요청 본문 파싱
    let orderData;
    try {
      orderData = await request.json();
    } catch (parseError) {
      return NextResponse.json(
        {
          success: false,
          error: '요청 본문이 올바른 JSON 형식이 아닙니다.'
        },
        { status: 400 }
      );
    }

    console.log('📥 외부 주문 데이터 수신:', orderData);

    // 4. 필수 파라미터 검증
    const requiredFields = ['campaignName', 'siteId', 'targetSite', 'keywords', 'quantity', 'duration'];
    const missingFields = requiredFields.filter((field) => !orderData[field]);

    if (missingFields.length > 0) {
      return NextResponse.json(
        {
          success: false,
          error: `필수 파라미터가 누락되었습니다: ${missingFields.join(', ')}`
        },
        { status: 400 }
      );
    }

    // 5. 데이터 검증
    if (!Array.isArray(orderData.keywords) || orderData.keywords.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'keywords는 비어있지 않은 배열이어야 합니다.'
        },
        { status: 400 }
      );
    }

    if (orderData.quantity <= 0 || orderData.duration <= 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'quantity와 duration은 0보다 커야 합니다.'
        },
        { status: 400 }
      );
    }

    // 6. 사이트 존재 여부 확인
    const supabase = getServiceSupabaseClient();
    const { data: siteData, error: siteError } = await supabase
      .from('sites')
      .select('id, name, url, status')
      .eq('id', orderData.siteId)
      .eq('user_id', userId)
      .single();

    if (siteError || !siteData) {
      return NextResponse.json(
        {
          success: false,
          error: '유효하지 않은 siteId입니다. 사이트가 존재하지 않거나 접근 권한이 없습니다.'
        },
        { status: 404 }
      );
    }

    console.log('✅ 사이트 검증 완료:', siteData.name);

    // 7. 캠페인 데이터 준비
    const quantity = parseInt(orderData.quantity);
    const duration = parseInt(orderData.duration);
    const now = new Date();
    const nowIso = now.toISOString();
    const kstNowIso = new Date(now.getTime() + 9 * 60 * 60 * 1000).toISOString();
    const todayKst = kstNowIso.split('T')[0];

    // 선택된 사이트 ID 배열 처리
    const selectedSiteIds = Array.isArray(orderData.siteIds) ? Array.from(new Set(orderData.siteIds.filter(Boolean))) : [orderData.siteId];

    const newCampaign = {
      user_id: userId,
      name: orderData.campaignName,
      description: orderData.description || '외부 API를 통해 자동 생성된 캠페인',
      site_id: orderData.siteId,
      selected_site_ids: selectedSiteIds,
      target_site: orderData.targetSite,
      keywords: orderData.keywords,
      quantity,
      duration,

      // 콘텐츠 생성 옵션
      persona: orderData.persona || 'expert',
      section_count: parseInt(orderData.sectionCount) || 5,
      include_images: orderData.includeImages ?? false,
      section_image_count: parseInt(orderData.sectionImageCount) || 0,
      include_toc: orderData.includeToc ?? false,
      include_backlinks: orderData.includeBacklinks ?? true,
      include_internal_links: orderData.includeInternalLinks ?? false,

      // 크레딧 및 언어
      credits_per_content: parseInt(orderData.creditsPerContent) || 10,
      content_language: orderData.contentLanguage || 'ko',

      // 시작 시간 설정
      start_type: orderData.startType || 'immediate',
      scheduled_start: orderData.scheduledStart || null,

      // 상태 및 진행률
      status: 'pending',
      completed_count: 0,

      // 스케줄링 관련
      daily_execution_count: 0,
      remaining_quantity: quantity,
      remaining_days: duration,
      pending_execution_etas: [],
      next_execution_at: orderData.startType === 'scheduled' ? orderData.scheduledStart : nowIso,
      last_execution_date: todayKst,

      // 타임스탬프
      created_at: nowIso,
      updated_at: nowIso
    };

    console.log('📝 캠페인 데이터 준비 완료:', {
      name: newCampaign.name,
      quantity: newCampaign.quantity,
      duration: newCampaign.duration,
      keywords: newCampaign.keywords
    });

    // 8. Supabase에 캠페인 생성
    const { data: campaignData, error: campaignError } = await supabase.from('campaigns').insert([newCampaign]).select().single();

    if (campaignError) {
      console.error('❌ 캠페인 생성 실패:', campaignError);
      return NextResponse.json(
        {
          success: false,
          error: `캠페인 생성 실패: ${campaignError.message}`
        },
        { status: 500 }
      );
    }

    console.log('✅ 캠페인 생성 성공:', {
      campaign_id: campaignData.id,
      name: campaignData.name
    });

    // 9. 캠페인 스케줄 초기화 (Celery 작업 트리거)
    try {
      const delayMinutes = orderData.delayMinutes || 5;
      await initializeCampaignSchedule(campaignData.id, userId, newCampaign.start_type, delayMinutes);

      console.log('✅ 스케줄 초기화 완료');
    } catch (scheduleError) {
      console.error('⚠️ 스케줄 초기화 실패 (캠페인은 생성됨):', scheduleError);
      // 스케줄 초기화 실패해도 캠페인은 생성되었으므로 성공으로 처리
    }

    // 10. 성공 응답 반환 (Rate Limit 헤더 포함)
    const rateLimitHeaders = getRateLimitHeaders(rateLimitResult.details.perMinute);

    return NextResponse.json(
      {
        success: true,
        campaign_id: campaignData.id,
        campaign_name: campaignData.name,
        status: campaignData.status,
        message: '캠페인이 성공적으로 생성되었습니다.',
        details: {
          quantity: campaignData.quantity,
          duration: campaignData.duration,
          keywords: campaignData.keywords,
          target_site: campaignData.target_site,
          start_type: campaignData.start_type
        }
      },
      {
        status: 201,
        headers: rateLimitHeaders
      }
    );
  } catch (error) {
    console.error('❌ 캠페인 생성 API 예외 발생:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || '서버 오류가 발생했습니다.'
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/external/create-campaign
 * 한글 주석: API 엔드포인트 정보 및 사용 방법 안내
 */
export async function GET() {
  return NextResponse.json({
    endpoint: '/api/external/create-campaign',
    method: 'POST',
    description: '외부 웹앱에서 캠페인을 자동으로 생성하는 API',
    authentication: {
      type: 'Bearer Token',
      header: 'Authorization: Bearer YOUR_API_KEY',
      note: 'API 키는 대시보드의 설정 페이지에서 생성할 수 있습니다.'
    },
    required_parameters: {
      campaignName: 'string - 캠페인 이름',
      siteId: 'uuid - 워드프레스 사이트 ID',
      targetSite: 'string - 타겟 사이트 URL',
      keywords: 'string[] - 키워드 배열',
      quantity: 'number - 생성할 콘텐츠 수량',
      duration: 'number - 캠페인 기간 (일)'
    },
    optional_parameters: {
      siteIds: 'uuid[] - 다중 사이트 선택 (기본: [siteId])',
      description: 'string - 캠페인 설명',
      persona: 'string - 페르소나 (기본: expert)',
      sectionCount: 'number - 섹션 개수 (기본: 5)',
      includeImages: 'boolean - 이미지 포함 여부 (기본: false)',
      sectionImageCount: 'number - 섹션당 이미지 개수 (기본: 0)',
      includeToc: 'boolean - 목차 포함 여부 (기본: false)',
      includeBacklinks: 'boolean - 백링크 포함 여부 (기본: true)',
      includeInternalLinks: 'boolean - 내부 링크 포함 여부 (기본: false)',
      contentLanguage: 'string - 콘텐츠 언어 (기본: ko)',
      startType: 'string - 시작 타입 (immediate/delayed/scheduled, 기본: immediate)',
      scheduledStart: 'string - 예약 시작 시간 (ISO 8601)',
      delayMinutes: 'number - 지연 시작 시 분 단위 (기본: 5)',
      creditsPerContent: 'number - 콘텐츠당 크레딧 (기본: 10)'
    },
    response_example: {
      success: true,
      campaign_id: 'uuid',
      campaign_name: '캠페인 이름',
      status: 'pending',
      message: '캠페인이 성공적으로 생성되었습니다.',
      details: {
        quantity: 50,
        duration: 30,
        keywords: ['키워드1', '키워드2'],
        target_site: 'https://target-site.com',
        start_type: 'immediate'
      }
    },
    error_responses: {
      401: 'Unauthorized - API 키가 유효하지 않음',
      400: 'Bad Request - 필수 파라미터 누락 또는 잘못된 형식',
      404: 'Not Found - 사이트가 존재하지 않음',
      500: 'Internal Server Error - 서버 오류'
    },
    example_curl: `curl -X POST https://your-domain.com/api/external/create-campaign \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -d '{
    "campaignName": "테스트 캠페인",
    "siteId": "your-site-uuid",
    "targetSite": "https://example.com",
    "keywords": ["키워드1", "키워드2"],
    "quantity": 10,
    "duration": 5
  }'`
  });
}
