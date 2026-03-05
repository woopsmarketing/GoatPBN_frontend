// v1.0 - Backlinkshop 연동 테스트 스크립트 (2026.03.05)
// 한글 주석: backlinkshop.co.kr 주문 시뮬레이션 테스트
// 목적: 실제 주문 데이터 형식으로 app.goatpbn.com API 호출 테스트

/**
 * 🚀 사용 방법:
 * 
 * 1. 터미널에서 실행:
 *    node test-backlinkshop-api.js
 * 
 * 2. 자동으로 테스트 데이터로 캠페인 생성
 * 
 * 3. app.goatpbn.com 에서 결과 확인
 */

// API 설정
const API_URL = 'https://app.goatpbn.com';
const API_KEY = 'e6d352ff307ffc1214dc68297ce018e39d6b554ccc871f0c64650007f6fbc678';

// 테스트 주문 데이터 (backlinkshop.co.kr에서 넘어올 데이터 시뮬레이션)
const testOrder = {
  productName: 'PBN50_테스트',
  customerEmail: 'vnfm0580@gmail.com',
  targetSite: 'https://backlinkshop.co.kr',
  keywords: ['백링크샵', 'PBN백링크', '고품질백링크'],
  quantity: 50, // PBN50 상품
  duration: 30 // 30일 기간 (상품에 따라 변경)
};

/**
 * 사이트 설정 (자동 배포용)
 * 한글 주석: API에서 자동으로 모든 사이트를 선택하도록 null 반환
 * 
 * ⚠️ 중요: 실제 캠페인 생성 페이지와 동일한 방식
 * - siteId: null → API에서 자동으로 첫 번째 사이트 선택
 * - siteIds: [] → API에서 자동으로 모든 사이트 선택
 */
function getSiteConfig() {
  console.log('📋 자동 배포 모드 설정...\n');
  console.log('   → API에서 자동으로 모든 사이트를 조회하여 배포합니다.\n');

  // 한글 주석: null과 빈 배열을 전달하면 API에서 자동으로 처리
  return {
    siteId: null, // null이면 API에서 첫 번째 사이트 자동 선택
    siteIds: [] // 빈 배열이면 API에서 모든 사이트 자동 선택
  };
}

/**
 * 캠페인 데이터 생성
 * 한글 주석: backlinkshop 주문 데이터를 PBN API 형식으로 변환
 */
function createCampaignData(order, siteConfig) {
  const now = new Date();
  const timestamp = now.toLocaleString('ko-KR', { 
    year: 'numeric',
    month: '2-digit', 
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  }).replace(/\. /g, '-').replace(/\./g, '').replace(/ /g, '_');

  // 캠페인 이름: {상품명}_{호출날짜}_{주문자이메일}
  const campaignName = `${order.productName}_${timestamp}_${order.customerEmail}`;

  return {
    // 기본 정보
    campaignName: campaignName,
    description: 'Backlinkshop 에서 주문 생성됨',

    // 사이트 설정 (자동 배포)
    siteId: siteConfig.siteId, // null이면 API에서 자동 선택
    siteIds: siteConfig.siteIds, // 빈 배열이면 모든 사이트 선택

    // 백링크 설정
    targetSite: order.targetSite,
    keywords: order.keywords,

    // 수량 및 기간
    quantity: order.quantity,
    duration: order.duration,

    // 콘텐츠 생성 옵션 (하드코딩)
    persona: 'expert', // 전문가 톤앤매너
    sectionCount: 7, // 섹션 수
    includeImages: true, // 이미지 생성 활성화
    sectionImageCount: 2, // 섹션당 이미지 2개
    includeToc: true, // 목차 포함
    includeBacklinks: true, // 외부 백링크 생성
    includeInternalLinks: true, // 내부 링크 생성
    contentLanguage: 'ko', // 한국어

    // 시작 설정
    startType: 'immediate', // 즉시 시작
    delayMinutes: 0 // 지연 없음
  };
}

/**
 * API 호출 및 캠페인 생성
 */
async function createCampaign(campaignData) {
  console.log('🚀 캠페인 생성 API 호출 중...\n');

  try {
    const response = await fetch(`${API_URL}/api/external/create-campaign`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${API_KEY}`
      },
      body: JSON.stringify(campaignData)
    });

    const result = await response.json();

    console.log(`📥 응답 상태: ${response.status} ${response.statusText}\n`);

    if (response.ok && result.success) {
      return { success: true, data: result };
    } else {
      return { success: false, error: result.error || result.message };
    }
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * 메인 테스트 실행
 */
async function runTest() {
  console.log('='.repeat(80));
  console.log('🧪 Backlinkshop 연동 테스트 - app.goatpbn.com');
  console.log('='.repeat(80));
  console.log('');

  // 1. 테스트 주문 데이터 출력
  console.log('📦 테스트 주문 정보:');
  console.log('─'.repeat(80));
  console.log(`상품명: ${testOrder.productName}`);
  console.log(`주문자: ${testOrder.customerEmail}`);
  console.log(`백링크 받을 사이트: ${testOrder.targetSite}`);
  console.log(`키워드: ${testOrder.keywords.join(', ')}`);
  console.log(`수량: ${testOrder.quantity}개`);
  console.log(`기간: ${testOrder.duration}일`);
  console.log('─'.repeat(80));
  console.log('');

  // 2. 사이트 설정 (자동 배포용)
  const siteConfig = getSiteConfig();

  // 3. 캠페인 데이터 생성
  const campaignData = createCampaignData(testOrder, siteConfig);

  console.log('📝 생성될 캠페인 데이터:');
  console.log('─'.repeat(80));
  console.log(JSON.stringify(campaignData, null, 2));
  console.log('─'.repeat(80));
  console.log('');

  // 4. 확인 메시지
  console.log('⚠️  실제 캠페인이 생성됩니다!');
  console.log('   - 59개 사이트에 자동 배포됩니다');
  console.log('   - 50개의 콘텐츠가 30일간 생성됩니다');
  console.log('   - 즉시 시작됩니다');
  console.log('');

  // 5초 대기
  console.log('5초 후 자동으로 진행됩니다... (Ctrl+C로 취소 가능)');
  await new Promise(resolve => setTimeout(resolve, 5000));
  console.log('');

  // 5. API 호출
  const result = await createCampaign(campaignData);

  // 6. 결과 출력
  console.log('='.repeat(80));
  if (result.success) {
    console.log('✅ 캠페인 생성 성공!');
    console.log('='.repeat(80));
    console.log('');
    console.log('📊 생성된 캠페인 정보:');
    console.log('─'.repeat(80));
    console.log(`캠페인 ID: ${result.data.campaign_id}`);
    console.log(`캠페인 이름: ${result.data.campaign_name}`);
    console.log(`상태: ${result.data.status}`);
    console.log(`수량: ${result.data.details.quantity}개`);
    console.log(`기간: ${result.data.details.duration}일`);
    console.log(`키워드: ${result.data.details.keywords.join(', ')}`);
    console.log(`타겟 사이트: ${result.data.details.target_site}`);
    console.log(`시작 타입: ${result.data.details.start_type}`);
    console.log('─'.repeat(80));
    console.log('');
    console.log('🎉 테스트 성공! 다음 단계:');
    console.log('');
    console.log('1. 캠페인 확인:');
    console.log(`   ${API_URL}/campaigns`);
    console.log('');
    console.log('2. 대시보드 확인:');
    console.log(`   ${API_URL}/dashboard`);
    console.log('');
    console.log('3. 로그 모니터링 (5분 후부터):');
    console.log(`   ${API_URL}/logs`);
    console.log('');
    console.log('4. 통계 확인:');
    console.log(`   ${API_URL}/statistics`);
    console.log('');
    console.log('='.repeat(80));
  } else {
    console.log('❌ 캠페인 생성 실패!');
    console.log('='.repeat(80));
    console.log('');
    console.log('에러 정보:');
    console.log('─'.repeat(80));
    console.log(result.error);
    console.log('─'.repeat(80));
    console.log('');
    console.log('💡 문제 해결:');
    console.log('');
    console.log('1. API 키 확인:');
    console.log(`   현재 키: ${API_KEY.substring(0, 16)}...`);
    console.log(`   확인 페이지: ${API_URL}/settings/api-keys`);
    console.log('');
    console.log('2. 사이트 등록 확인:');
    console.log(`   확인 페이지: ${API_URL}/sites`);
    console.log('');
    console.log('3. 서버 상태 확인:');
    console.log(`   ${API_URL}`);
    console.log('');
    console.log('='.repeat(80));
  }
}

// 테스트 실행
console.log('\n');
runTest().catch((error) => {
  console.error('치명적 오류:', error);
  process.exit(1);
});
