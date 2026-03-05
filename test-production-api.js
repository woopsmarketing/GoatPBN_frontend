// v1.0 - 프로덕션 API 테스트 스크립트 (2026.03.05)
// 한글 주석: app.goatpbn.com 서버의 API를 로컬에서 테스트
// 목적: 실제 서버에서 캠페인이 정상적으로 생성되는지 확인

/**
 * 🚀 사용 방법:
 * 
 * 1. 먼저 app.goatpbn.com에서 API 키를 생성하세요:
 *    - https://app.goatpbn.com/settings/api-keys 접속
 *    - 로그인 후 "새 API 키 생성" 클릭
 *    - 생성된 API 키 복사
 * 
 * 2. 사이트 ID를 확인하세요:
 *    - https://app.goatpbn.com/sites 접속
 *    - 사용할 사이트의 ID 복사
 * 
 * 3. 아래 명령으로 실행:
 *    node test-production-api.js
 * 
 * 4. 프롬프트에 따라 API 키와 사이트 ID 입력
 */

const readline = require('readline');

// 사용자 입력을 받기 위한 인터페이스
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// 프롬프트 함수
function prompt(question) {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer);
    });
  });
}

// 메인 테스트 함수
async function testProductionApi() {
  console.log('='.repeat(70));
  console.log('🧪 app.goatpbn.com API 테스트');
  console.log('='.repeat(70));
  console.log('');

  try {
    // 1. API 키 입력 받기
    console.log('📝 1단계: API 키 입력');
    console.log('   https://app.goatpbn.com/settings/api-keys 에서 생성하세요.\n');
    const apiKey = await prompt('API 키를 입력하세요: ');

    if (!apiKey || apiKey.trim().length === 0) {
      console.error('❌ API 키가 입력되지 않았습니다.');
      rl.close();
      return;
    }

    console.log('✅ API 키 입력 완료\n');

    // 2. 사이트 ID 입력 받기
    console.log('📝 2단계: 사이트 ID 입력');
    console.log('   https://app.goatpbn.com/sites 에서 확인하세요.\n');
    const siteId = await prompt('사이트 UUID를 입력하세요: ');

    if (!siteId || siteId.trim().length === 0) {
      console.error('❌ 사이트 ID가 입력되지 않았습니다.');
      rl.close();
      return;
    }

    console.log('✅ 사이트 ID 입력 완료\n');

    // 3. 테스트 캠페인 데이터 준비
    console.log('📝 3단계: 테스트 캠페인 데이터 준비\n');
    
    const testData = {
      campaignName: `API 테스트 캠페인 - ${new Date().toLocaleString('ko-KR')}`,
      siteId: siteId.trim(),
      targetSite: 'https://example.com',
      keywords: ['테스트 키워드1', '테스트 키워드2', '테스트 키워드3'],
      quantity: 5,
      duration: 3,
      description: 'API 연동 테스트용 캠페인 (로컬에서 생성)',
      persona: 'expert',
      sectionCount: 5,
      includeImages: false,
      includeToc: true,
      includeBacklinks: true,
      contentLanguage: 'ko',
      startType: 'delayed',
      delayMinutes: 5
    };

    console.log('테스트 데이터:');
    console.log(JSON.stringify(testData, null, 2));
    console.log('');

    const confirm = await prompt('이 데이터로 실제 캠페인을 생성하시겠습니까? (y/n): ');
    
    if (confirm.toLowerCase() !== 'y') {
      console.log('❌ 테스트가 취소되었습니다.');
      rl.close();
      return;
    }

    // 4. API 호출
    console.log('\n🚀 4단계: API 호출 중...\n');

    const response = await fetch('https://app.goatpbn.com/api/external/create-campaign', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey.trim()}`
      },
      body: JSON.stringify(testData)
    });

    const result = await response.json();

    console.log(`📥 응답 상태: ${response.status} ${response.statusText}\n`);

    // 5. 결과 확인
    if (response.ok && result.success) {
      console.log('✅ 캠페인 생성 성공!\n');
      console.log('='.repeat(70));
      console.log('📊 생성된 캠페인 정보:');
      console.log('='.repeat(70));
      console.log(`캠페인 ID: ${result.campaign_id}`);
      console.log(`캠페인 이름: ${result.campaign_name}`);
      console.log(`상태: ${result.status}`);
      console.log(`수량: ${result.details.quantity}개`);
      console.log(`기간: ${result.details.duration}일`);
      console.log(`키워드: ${result.details.keywords.join(', ')}`);
      console.log(`타겟 사이트: ${result.details.target_site}`);
      console.log(`시작 타입: ${result.details.start_type}`);
      console.log('='.repeat(70));
      console.log('');
      console.log('🎉 테스트 성공! 다음 단계:');
      console.log('   1. https://app.goatpbn.com/campaigns 에서 캠페인 확인');
      console.log('   2. https://app.goatpbn.com/logs 에서 로그 모니터링');
      console.log('   3. https://app.goatpbn.com/dashboard 에서 진행 상황 확인');
      console.log('');
    } else {
      console.error('❌ 캠페인 생성 실패!\n');
      console.error('='.repeat(70));
      console.error('에러 정보:');
      console.error('='.repeat(70));
      console.error(`상태 코드: ${response.status}`);
      console.error(`에러 메시지: ${result.error || result.message || '알 수 없는 오류'}`);
      console.error('');
      console.error('전체 응답:');
      console.error(JSON.stringify(result, null, 2));
      console.error('='.repeat(70));
      console.error('');
      console.error('💡 문제 해결 방법:');
      
      if (response.status === 401) {
        console.error('   - API 키가 올바른지 확인하세요');
        console.error('   - API 키가 활성화되어 있는지 확인하세요');
      } else if (response.status === 404) {
        console.error('   - 사이트 ID가 올바른지 확인하세요');
        console.error('   - 해당 사이트가 존재하는지 확인하세요');
      } else if (response.status === 429) {
        console.error('   - 요청이 너무 많습니다. 잠시 후 다시 시도하세요');
      } else if (response.status === 400) {
        console.error('   - 요청 데이터 형식을 확인하세요');
      }
      console.error('');
    }
  } catch (error) {
    console.error('❌ API 호출 중 예외 발생:', error.message);
    console.error('');
    console.error('💡 문제 해결:');
    console.error('   - 인터넷 연결을 확인하세요');
    console.error('   - app.goatpbn.com이 정상 작동하는지 확인하세요');
    console.error('   - Node.js 버전을 확인하세요 (v18 이상 권장)');
  } finally {
    rl.close();
  }
}

// 테스트 실행
console.log('\n');
testProductionApi().catch((error) => {
  console.error('치명적 오류:', error);
  rl.close();
  process.exit(1);
});
