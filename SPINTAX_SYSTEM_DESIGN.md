# Spintax 콘텐츠 생성 시스템 설계서

## 1. 개요

### 1.1 현재 시스템 (AS-IS)
```
매 콘텐츠 생성 요청마다:
  키워드 → OpenAI(키워드 확장) → OpenAI(제목 생성) → OpenAI(구조 생성) → OpenAI(섹션별 본문 생성)
  = 건당 4+ LLM 호출 (gpt-5-nano)
```

**문제점:**
- 건당 LLM API 비용 발생
- 생성 시간 수십 초 소요
- 품질이 nano 모델에 의존

### 1.2 새 시스템 (TO-BE)
```
Phase 1 - 마스터 생성 (1회, 고급 모델):
  키워드 → 고급 LLM → SEO 최적화 마스터 콘텐츠 → 고급 LLM → 멀티레이어 스핀택스 변환
  = 키워드당 2회 LLM 호출 (최고급 모델)

Phase 2 - 콘텐츠 생산 (무제한, LLM 불필요):
  스핀택스 템플릿 → 스핀 엔진(순수 코드) → 고유 콘텐츠
  = 건당 0원, 밀리초 단위
```

---

## 2. 멀티레이어 스핀택스 구조

### 2.1 레이어 정의

| 레이어 | 대상 | 효과 | 경우의 수 기여 |
|--------|------|------|---------------|
| **L1 구조 스핀** | 섹션 순서, H2/H3 배치, 전체 흐름 | 글의 골격이 달라짐 | x5~10 |
| **L2 단락 스핀** | 같은 주제의 완전히 다른 단락 | 읽는 느낌이 다름 | x3~5/단락 |
| **L3 문장 스핀** | 문장 내 표현, 접속사, 어순 | 문장 지문이 달라짐 | x3~5/문장 |
| **L4 단어 스핀** | 동의어, 유사 표현 | 기본적 중복 회피 | x2~4/위치 |
| **L5 메타 스핀** | title, description, slug, intro/outro | SEO 메타데이터 다양화 | x5~10 |

### 2.2 경우의 수 계산 예시
```
5개 섹션 × 셔플 가능(순서 변형 5가지)
× 섹션당 3개 대체 단락 (3^5 = 243)
× 단락당 평균 5개 문장, 문장당 3개 변형 (3^25 = 847,288,609,443)
× 단어 레벨 스핀 (추가 수백~수천 배)
= 사실상 무한 조합
```

### 2.3 스핀택스 문법

```
기본 문법: {옵션A|옵션B|옵션C}
중첩 문법: {옵션A {하위1|하위2}|옵션B|옵션C}
섹션 블록: [SECTION:id]{블록A|블록B|블록C}[/SECTION]
셔플 지시: [SHUFFLE]{섹션들}[/SHUFFLE]
필수 포함: [REQUIRED]{반드시 포함할 내용}[/REQUIRED]
조건부:   [IF:include_toc]{목차 HTML}[/IF]
```

---

## 3. 데이터 모델

### 3.1 Supabase 테이블: `spintax_templates`

```sql
CREATE TABLE spintax_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),

  -- 키워드 정보
  main_keyword TEXT NOT NULL,
  lsi_keywords TEXT[] DEFAULT '{}',
  longtail_keywords TEXT[] DEFAULT '{}',

  -- 메타 스핀택스 (L5)
  title_spintax TEXT NOT NULL,          -- 제목 스핀택스
  description_spintax TEXT NOT NULL,    -- 메타 설명 스핀택스
  slug_spintax TEXT NOT NULL,           -- URL slug 스핀택스

  -- 구조 스핀택스 (L1)
  structure_variants JSONB NOT NULL,    -- 섹션 순서/조합 변형들

  -- 본문 스핀택스 (L2 + L3 + L4 통합)
  intro_spintax TEXT NOT NULL,          -- 도입부 스핀택스
  sections_spintax JSONB NOT NULL,      -- 섹션별 스핀택스 배열
  outro_spintax TEXT NOT NULL,          -- 결론부 스핀택스

  -- 설정
  persona TEXT DEFAULT 'expert',
  content_language TEXT DEFAULT 'ko',
  min_word_count INT DEFAULT 2000,
  max_word_count INT DEFAULT 3500,

  -- 생성 메타
  model_used TEXT NOT NULL,             -- 생성에 사용된 모델명
  estimated_combinations BIGINT,        -- 추정 경우의 수
  generation_cost DECIMAL(10,4),        -- 생성 비용 (USD)

  -- 통계
  spin_count INT DEFAULT 0,             -- 이 템플릿에서 생성된 콘텐츠 수
  last_spun_at TIMESTAMPTZ,

  -- 타임스탬프
  status TEXT DEFAULT 'generating',     -- generating, ready, error
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_spintax_keyword ON spintax_templates(user_id, main_keyword);
CREATE INDEX idx_spintax_status ON spintax_templates(status);
```

### 3.2 sections_spintax JSONB 구조

```jsonc
[
  {
    "id": "section_1",
    "heading_spintax": "{도메인 분석이란 무엇인가?|도메인 분석의 정의와 개념|도메인 분석: 기초부터 이해하기}",
    "subheadings": [
      {
        "heading_spintax": "{기본 개념|핵심 정의|주요 용어}",
        "body_variants": [
          "단락 변형 A (L2) - 내부에 {문장 스핀|문장 변형}과 {단어|어휘} 스핀 포함",
          "단락 변형 B (L2) - 완전히 다른 설명 방식",
          "단락 변형 C (L2) - 또 다른 접근"
        ]
      }
    ],
    "body_variants": [
      "본문 변형 A - {도메인 분석|도메인 평가|도메인 진단}은 {웹사이트|사이트|온라인 플랫폼}의...",
      "본문 변형 B - 완전히 다른 구조의 설명...",
      "본문 변형 C - 또 다른 설명 방식..."
    ],
    "shuffleable": true,    // 이 섹션의 위치를 다른 섹션과 교체 가능
    "required": false        // false면 생략 가능 (구조 다양화)
  }
]
```

### 3.3 structure_variants JSONB 구조

```jsonc
{
  "required_sections": ["intro", "section_1", "outro"],
  "optional_sections": ["section_2", "section_3", "section_4", "section_5"],
  "min_sections": 4,
  "max_sections": 6,
  "shuffle_groups": [
    ["section_2", "section_3"],           // 이 그룹 내 순서 교체 가능
    ["section_4", "section_5"]            // 이 그룹 내 순서 교체 가능
  ],
  "preset_orders": [                      // 미리 검증된 순서 조합
    ["section_1", "section_2", "section_3", "section_4", "section_5"],
    ["section_1", "section_3", "section_2", "section_5", "section_4"],
    ["section_1", "section_4", "section_2", "section_3", "section_5"]
  ]
}
```

---

## 4. 시스템 아키텍처

### 4.1 전체 흐름

```
┌─────────────────────────────────────────────────────────────────┐
│                     Phase 1: 마스터 생성                          │
│                                                                 │
│  사용자 입력(키워드)                                               │
│       │                                                         │
│       ▼                                                         │
│  ┌──────────┐    ┌─────────────┐    ┌──────────────────┐       │
│  │ 키워드    │───▶│ 마스터 콘텐츠 │───▶│ 스핀택스 변환      │       │
│  │ 확장 API  │    │ 생성 API     │    │ API               │       │
│  │(고급 LLM) │    │ (고급 LLM)   │    │ (고급 LLM)        │       │
│  └──────────┘    └─────────────┘    └──────────────────┘       │
│                                            │                    │
│                                            ▼                    │
│                                     Supabase에 저장              │
│                                     (spintax_templates)         │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                     Phase 2: 콘텐츠 생산                          │
│                                                                 │
│  캠페인 실행 / 수동 생성 요청                                       │
│       │                                                         │
│       ▼                                                         │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐     │
│  │ 스핀택스 로드  │───▶│ 스핀 엔진     │───▶│ WordPress     │     │
│  │ (DB 조회)     │    │ (순수 코드)   │    │ 업로드         │     │
│  └──────────────┘    └──────────────┘    └──────────────┘     │
│                           │                                     │
│                           ├── 해시 중복 체크                      │
│                           ├── 단어 수 검증                        │
│                           └── 밀리초 단위 완료                     │
└─────────────────────────────────────────────────────────────────┘
```

### 4.2 API 엔드포인트 설계

#### 새로 추가할 백엔드 엔드포인트 (FastAPI)

```
POST /api/spintax/generate-master     - 마스터 스핀택스 템플릿 생성
GET  /api/spintax/templates           - 사용자 템플릿 목록 조회
GET  /api/spintax/templates/{id}      - 특정 템플릿 상세 조회
POST /api/spintax/spin                - 스핀택스 돌려서 콘텐츠 생성
POST /api/spintax/spin-and-publish    - 스핀 + WordPress 업로드
DELETE /api/spintax/templates/{id}    - 템플릿 삭제
```

#### 프론트엔드 API 클라이언트

```
src/lib/api/spintax.js                - 스핀택스 API 클라이언트
```

### 4.3 프론트엔드 변경사항

#### 새로 추가할 페이지/컴포넌트

```
src/app/(dashboard)/spintax-templates/page.jsx          - 템플릿 관리 목록
src/app/(dashboard)/spintax-templates/create/page.jsx   - 마스터 템플릿 생성
src/app/(dashboard)/spintax-templates/[id]/page.jsx     - 템플릿 상세/미리보기
```

#### 기존 페이지 수정

```
src/app/(dashboard)/content-generator/page.jsx          - 스핀택스 모드 추가
src/app/(dashboard)/campaigns/create/page.jsx           - 스핀택스 기반 캠페인 옵션 추가
```

---

## 5. 스핀 엔진 설계 (백엔드 - Python)

### 5.1 핵심 알고리즘

```python
import re
import random
import hashlib

class SpintaxEngine:
    """멀티레이어 스핀택스 엔진"""

    def __init__(self, template: dict, seed: int = None):
        self.template = template
        self.rng = random.Random(seed)
        self.used_hashes = set()

    def spin(self) -> dict:
        """스핀택스 템플릿에서 고유한 콘텐츠 1편 생성"""
        max_attempts = 10
        for _ in range(max_attempts):
            content = self._generate_one()
            content_hash = self._hash(content['body'])
            if content_hash not in self.used_hashes:
                self.used_hashes.add(content_hash)
                return content
        return content  # fallback

    def _generate_one(self) -> dict:
        # L5: 메타 스핀
        title = self._resolve_spintax(self.template['title_spintax'])
        description = self._resolve_spintax(self.template['description_spintax'])
        slug = self._resolve_spintax(self.template['slug_spintax'])

        # L1: 구조 결정
        section_order = self._pick_structure()

        # L2+L3+L4: 본문 조립
        intro = self._resolve_spintax(self.template['intro_spintax'])
        body_sections = []
        for section_id in section_order:
            section = self._get_section(section_id)
            heading = self._resolve_spintax(section['heading_spintax'])
            body_variant = self.rng.choice(section['body_variants'])
            body = self._resolve_spintax(body_variant)
            body_sections.append({'heading': heading, 'body': body})
        outro = self._resolve_spintax(self.template['outro_spintax'])

        return {
            'title': title,
            'description': description,
            'slug': slug,
            'intro': intro,
            'sections': body_sections,
            'outro': outro,
            'body': self._assemble_html(intro, body_sections, outro)
        }

    def _resolve_spintax(self, text: str) -> str:
        """중첩 스핀택스를 재귀적으로 해석"""
        pattern = r'\{([^{}]*)\}'
        while re.search(pattern, text):
            text = re.sub(pattern, lambda m: self.rng.choice(m.group(1).split('|')), text)
        return text

    def _pick_structure(self) -> list:
        """섹션 순서 결정 (L1)"""
        sv = self.template['structure_variants']
        if sv.get('preset_orders'):
            return self.rng.choice(sv['preset_orders'])
        # 동적 생성
        required = sv['required_sections']
        optional = sv['optional_sections']
        n = self.rng.randint(sv['min_sections'], sv['max_sections'])
        picked = self.rng.sample(optional, min(n - len(required), len(optional)))
        order = required + picked
        # 셔플 그룹 내 순서 랜덤화
        for group in sv.get('shuffle_groups', []):
            group_items = [s for s in order if s in group]
            self.rng.shuffle(group_items)
            idx = 0
            for i, s in enumerate(order):
                if s in group:
                    order[i] = group_items[idx]
                    idx += 1
        return order

    def _hash(self, text: str) -> str:
        return hashlib.md5(text.encode()).hexdigest()
```

### 5.2 품질 보장

```python
class QualityChecker:
    """생성된 콘텐츠 품질 검증"""

    def validate(self, content: dict, config: dict) -> bool:
        checks = [
            self._check_word_count(content, config),
            self._check_no_broken_spintax(content),
            self._check_keyword_density(content, config),
            self._check_heading_hierarchy(content),
        ]
        return all(checks)

    def _check_word_count(self, content, config):
        word_count = len(content['body'].split())
        return config['min_word_count'] <= word_count <= config['max_word_count']

    def _check_no_broken_spintax(self, content):
        """해석되지 않은 스핀택스 잔존 확인"""
        return '{' not in content['body'] and '}' not in content['body']

    def _check_keyword_density(self, content, config):
        """키워드 밀도 1~3% 확인"""
        keyword = config['main_keyword']
        body = content['body'].lower()
        count = body.count(keyword.lower())
        total_words = len(body.split())
        density = (count / total_words) * 100 if total_words else 0
        return 1.0 <= density <= 3.0

    def _check_heading_hierarchy(self, content):
        """H2 > H3 > H4 순서 유지 확인"""
        # HTML 파싱하여 헤딩 순서 검증
        return True
```

---

## 6. 마스터 콘텐츠 생성 프롬프트 전략

### 6.1 Phase 1-A: 마스터 콘텐츠 생성 (고급 모델)

프롬프트 핵심 요소:
- 키워드 + LSI/롱테일 키워드 전체 제공
- 2500~3000 단어급 SEO 최적화 글
- 자연스러운 한국어 / 영어
- H2/H3 구조 명확히 분리
- 키워드 밀도 1.5~2.5%
- 도입부/본문/결론 구분

### 6.2 Phase 1-B: 스핀택스 변환 (고급 모델)

프롬프트 핵심 요소:
- 마스터 콘텐츠를 입력으로 받음
- 각 섹션에 대해 3~5개 대체 단락 생성
- 각 문장에 대해 2~4개 표현 변형 생성
- 각 핵심 단어에 대해 동의어 제공
- 결과를 정해진 JSON 스키마로 출력

---

## 7. 캠페인 통합 방식

### 7.1 기존 캠페인 생성 시 변경점

```javascript
// campaigns.js createCampaign 에 추가할 필드
{
  // ... 기존 필드 유지

  // 스핀택스 관련 신규 필드
  content_mode: 'spintax',           // 'llm' (기존) | 'spintax' (신규)
  spintax_template_id: 'uuid...',    // 사용할 스핀택스 템플릿 ID
}
```

### 7.2 백엔드 Celery 태스크 변경

```python
# 기존: 매번 LLM 호출
async def generate_content_task(campaign_id, keyword, options):
    content = await call_openai_pipeline(keyword, options)
    await publish_to_wordpress(content)

# 변경: 스핀택스 모드 분기
async def generate_content_task(campaign_id, keyword, options):
    if options.get('content_mode') == 'spintax':
        template = await load_spintax_template(options['spintax_template_id'])
        engine = SpintaxEngine(template)
        content = engine.spin()
        await publish_to_wordpress(content)
    else:
        # 기존 LLM 파이프라인 유지 (하위 호환)
        content = await call_openai_pipeline(keyword, options)
        await publish_to_wordpress(content)
```

---

## 8. 구현 순서

### Phase 1: 백엔드 (FastAPI)
1. `spintax_templates` Supabase 테이블 생성
2. `SpintaxEngine` 클래스 구현 (스핀 파서 + 구조 셔플)
3. `QualityChecker` 클래스 구현
4. 마스터 생성 프롬프트 체인 구현 (콘텐츠 생성 → 스핀택스 변환)
5. API 엔드포인트 구현 (`/api/spintax/*`)
6. 기존 Celery 태스크에 스핀택스 모드 분기 추가

### Phase 2: 프론트엔드 (Next.js)
1. `src/lib/api/spintax.js` API 클라이언트 작성
2. 스핀택스 템플릿 관리 페이지 구현 (목록/생성/상세)
3. 콘텐츠 생성기 페이지에 스핀택스 모드 추가
4. 캠페인 생성 폼에 스핀택스 옵션 추가
5. 템플릿 미리보기 (스핀 시뮬레이션) 기능

### Phase 3: 최적화
1. 스핀 결과 해시 캐싱 (중복 방지)
2. 템플릿별 생성 통계 대시보드
3. 스핀택스 품질 점수 시스템

---

## 9. 비용 비교

| 항목 | 기존 (LLM 매번) | 신규 (스핀택스) |
|------|-----------------|---------------|
| 콘텐츠 100개 생성 시 | LLM 400+ 호출 | LLM 2회 + 코드 100회 |
| 콘텐츠 1000개 생성 시 | LLM 4000+ 호출 | LLM 2회 + 코드 1000회 |
| 생성 속도 (건당) | 30~60초 | < 100ms |
| 품질 | nano 모델 의존 | 최고급 모델 1회 생성 |
| 다양성 | 매번 다름 (좋음) | 스핀택스 깊이에 비례 |

---

## 10. 리스크 및 대응

| 리스크 | 대응 |
|--------|------|
| 스핀택스 품질 부족 | L2(단락) 변형을 최소 3개 이상 확보, 프리뷰로 검증 |
| 부자연스러운 조합 | preset_orders로 검증된 구조만 사용 옵션 제공 |
| 검색엔진 탐지 | L1(구조 스핀) 충분히 확보, heading 순서와 수를 다양화 |
| 키워드 밀도 이탈 | QualityChecker에서 생성 후 검증, 실패 시 재스핀 |
