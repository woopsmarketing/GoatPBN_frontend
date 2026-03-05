// v1.0 - API 연동 테스트 스크립트 (2026.03.05)
// 한글 주석: 외부 API 엔드포인트를 테스트하는 Node.js 스크립트
// 목적: 로컬 또는 프로덕션 환경에서 API 연동을 검증

/**
 * 사용 방법:
 * 1. API_KEY, API_URL, SITE_ID 환경 변수 설정
 * 2. node test-api-integration.js 실행
 * 
 * 또는 직접 실행:
 * API_KEY=your_api_key API_URL=http://localhost:3000 SITE_ID=your_site_uuid node test-api-integration.js
 */

// 환경 변수에서 설정 가져오기
const API_KEY = process.env.API_KEY || 'YOUR_API_KEY_HERE';
const API_URL = process.env.API_URL || 'http://localhost:3000';
const SITE_ID = process.env.SITE_ID || 'YOUR_SITE_UUID_HERE';

// 테스트 데이터
const testCampaignData = {
  campaignName: '테스트 캠페인 - API 연동',
  siteId: SITE_ID,
  targetSite: 'https://example.com',
  keywords: ['테스트 키워드1', '테스트 키워드2', '테스트 키워드3'],
  quantity: 10,
  duration: 5,
  description: 'API 연동 테스트용 캠페인',
  persona: 'expert',
  sectionCount: 5,
  includeImages: true,
  sectionImageCount: 2,
  includeToc: true,
  includeBacklinks: true,
  includeInternalLinks: false,
  contentLanguage: 'ko',
  startType: 'delayed',
  delayMinutes: 5
};

/**
 * API 엔드포인트 정보 조회 (GET 요청)
 */
async function getApiInfo() {
  console.log('\n📋 API 정보 조회 중...\n');

  try {
    const response = await fetch(`${API_URL}/api/external/create-campaign`, {
      method: 'GET'
    });

    const data = await response.json();
    console.log('✅ API 정보:');
    console.log(JSON.stringify(data, null, 2));
    return true;
  } catch (error) {
    console.error('❌ API 정보 조회 실패:', error.message);
    return false;
  }
}

/**
 * 캠페인 생성 테스트 (POST 요청)
 */
async function testCreateCampaign() {
  console.log('\n🚀 캠페인 생성 테스트 시작...\n');
  console.log('📤 요청 데이터:');
  console.log(JSON.stringify(testCampaignData, null, 2));
  console.log('');

  try {
    const response = await fetch(`${API_URL}/api/external/create-campaign`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${API_KEY}`
      },
      body: JSON.stringify(testCampaignData)
    });

    const data = await response.json();

    console.log(`📥 응답 상태: ${response.status} ${response.statusText}\n`);

    if (response.ok && data.success) {
      console.log('✅ 캠페인 생성 성공!\n');
      console.log('📊 생성된 캠페인 정보:');
      console.log(`  - 캠페인 ID: ${data.campaign_id}`);
      console.log(`  - 캠페인 이름: ${data.campaign_name}`);
      console.log(`  - 상태: ${data.status}`);
      console.log(`  - 수량: ${data.details.quantity}개`);
      console.log(`  - 기간: ${data.details.duration}일`);
      console.log(`  - 키워드: ${data.details.keywords.join(', ')}`);
      console.log(`  - 타겟 사이트: ${data.details.target_site}`);
      console.log(`  - 시작 타입: ${data.details.start_type}`);
      console.log('');
      return true;
    } else {
      console.error('❌ 캠페인 생성 실패!\n');
      console.error('에러 메시지:', data.error);
      console.error('전체 응답:', JSON.stringify(data, null, 2));
      return false;
    }
  } catch (error) {
    console.error('❌ API 호출 중 예외 발생:', error.message);
    return false;
  }
}

/**
 * 인증 실패 테스트 (잘못된 API 키)
 */
async function testInvalidApiKey() {
  console.log('\n🔒 인증 실패 테스트 (잘못된 API 키)...\n');

  try {
    const response = await fetch(`${API_URL}/api/external/create-campaign`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer invalid_api_key_12345'
      },
      body: JSON.stringify(testCampaignData)
    });

    const data = await response.json();

    if (response.status === 401 && !data.success) {
      console.log('✅ 인증 실패 테스트 통과 (예상대로 401 에러 반환)');
      console.log(`에러 메시지: ${data.error}\n`);
      return true;
    } else {
      console.error('❌ 인증 실패 테스트 실패 (잘못된 API 키인데 성공함)');
      return false;
    }
  } catch (error) {
    console.error('❌ 테스트 중 예외 발생:', error.message);
    return false;
  }
}

/**
 * 필수 파라미터 누락 테스트
 */
async function testMissingParameters() {
  console.log('\n⚠️ 필수 파라미터 누락 테스트...\n');

  const invalidData = {
    campaignName: '테스트',
    // siteId 누락
    targetSite: 'https://example.com'
    // keywords, quantity, duration 누락
  };

  try {
    const response = await fetch(`${API_URL}/api/external/create-campaign`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${API_KEY}`
      },
      body: JSON.stringify(invalidData)
    });

    const data = await response.json();

    if (response.status === 400 && !data.success) {
      console.log('✅ 파라미터 검증 테스트 통과 (예상대로 400 에러 반환)');
      console.log(`에러 메시지: ${data.error}\n`);
      return true;
    } else {
      console.error('❌ 파라미터 검증 테스트 실패 (필수 파라미터 없는데 성공함)');
      return false;
    }
  } catch (error) {
    console.error('❌ 테스트 중 예외 발생:', error.message);
    return false;
  }
}

/**
 * 메인 테스트 실행
 */
async function runTests() {
  console.log('='.repeat(60));
  console.log('🧪 PBN API 연동 테스트 시작');
  console.log('='.repeat(60));
  console.log(`API URL: ${API_URL}`);
  console.log(`API KEY: ${API_KEY.substring(0, 8)}...${API_KEY.substring(API_KEY.length - 8)}`);
  console.log(`SITE ID: ${SITE_ID}`);
  console.log('='.repeat(60));

  const results = {
    apiInfo: false,
    createCampaign: false,
    invalidApiKey: false,
    missingParameters: false
  };

  // 1. API 정보 조회
  results.apiInfo = await getApiInfo();

  // 2. 캠페인 생성 테스트
  results.createCampaign = await testCreateCampaign();

  // 3. 인증 실패 테스트
  results.invalidApiKey = await testInvalidApiKey();

  // 4. 파라미터 검증 테스트
  results.missingParameters = await testMissingParameters();

  // 결과 요약
  console.log('='.repeat(60));
  console.log('📊 테스트 결과 요약');
  console.log('='.repeat(60));
  console.log(`API 정보 조회: ${results.apiInfo ? '✅ 통과' : '❌ 실패'}`);
  console.log(`캠페인 생성: ${results.createCampaign ? '✅ 통과' : '❌ 실패'}`);
  console.log(`인증 실패 테스트: ${results.invalidApiKey ? '✅ 통과' : '❌ 실패'}`);
  console.log(`파라미터 검증 테스트: ${results.missingParameters ? '✅ 통과' : '❌ 실패'}`);
  console.log('='.repeat(60));

  const allPassed = Object.values(results).every((result) => result === true);
  if (allPassed) {
    console.log('\n🎉 모든 테스트 통과!\n');
    process.exit(0);
  } else {
    console.log('\n⚠️ 일부 테스트 실패. 위 로그를 확인하세요.\n');
    process.exit(1);
  }
}

// 테스트 실행
runTests().catch((error) => {
  console.error('❌ 테스트 실행 중 치명적 오류:', error);
  process.exit(1);
});
