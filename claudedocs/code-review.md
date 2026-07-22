## 코드 리뷰: Spintax Integration (Full Stack)

**리뷰 범위**: backend/src/core/spintax/, backend/src/api/spintax_api.py, backend/src/tasks/spintax_tasks.py + campaign_tasks.py, backend/migrations/add_spintax_integration.sql, seed/src/lib/api/spintax.js + campaigns.js, seed/src/app/(dashboard)/campaigns/create/page.jsx + templates/*, seed/src/menu-items/pbn-dashboard.js, seed/src/utils/locales/en.json

---

### 빌드 상태

| 검사 | 결과 | 비고 |
|------|------|------|
| `npx tsc --noEmit` | PASS | TypeScript 에러 없음 |
| `npm run lint` | PASS | ESLint 에러 없음 |
| `npm run build` | 실행 불가 | `.next/trace` 파일이 WSL/Windows 파일시스템 오류로 깨져 있음 (코드 문제 아님) |
| Python AST (백엔드 6개 파일) | PASS | 구문 오류 없음 |

> **빌드 차단 원인**: WSL2에서 `.next/trace` 파일이 `-?????????` 권한으로 깨져 있음. Windows 측에서 `del /f /q .next\trace` 후 PowerShell에서 `npm run build` 실행 필요. 코드 자체의 결함이 아님.

---

### 발견 항목

| 심각도 | 파일:라인 | 문제 | 제안 |
|--------|----------|------|------|
| HIGH | `backend/src/tasks/campaign_tasks.py:292` | `content_mode == "spintax"` 이지만 `spintax_template_id`가 없어 `spintax_producer`가 `None`인 경우, `else` 브랜치로 진입해 `pipeline.wp_site_data`를 호출함. 그런데 `pipeline`도 `None`이므로 `AttributeError` 발생 후 조용히 `continue` 처리됨. 실질적으로는 콘텐츠가 0건 생성되면서 에러 로그만 남음. | `if content_mode == "spintax" and not spintax_producer: raise Exception("스핀택스 모드이지만 유효한 템플릿이 없습니다.")` 로 조기 실패 처리 권장. |
| HIGH | `backend/migrations/add_spintax_integration.sql:17-18` | `campaigns` 테이블에 `spintax_template_id UUID REFERENCES spintax_templates(id)` FK를 추가하는데, `spintax_templates` 테이블 생성 SQL(`tests/spintax-pipeline/sql/create_spintax_tables.sql`)이 `migrations/` 폴더 밖에 있음. 마이그레이션을 `add_spintax_integration.sql` 단독으로 실행하면 FK 대상 테이블이 없어 실패함. | `create_spintax_tables.sql`을 `migrations/` 폴더로 복사하거나 `add_spintax_integration.sql` 파일 상단에 `CREATE TABLE IF NOT EXISTS spintax_templates ...` 구문을 포함시키는 등, 실행 순서를 문서화하고 단일 파일로 통합할 것. |
| HIGH | `backend/src/core/spintax/template_generator.py:62-66` | `sys.path.insert(0, str(PIPELINE_DIR))` 후 `from pipeline import ...` 를 사용하는 패턴은 격리된 테스트 코드에 직접 의존함. `PIPELINE_DIR`의 `pipeline.py`가 `BASE_DIR = Path(__file__).parent`를 기준으로 `output/` 폴더를 생성하고 파일을 저장(`step1-keywords.json`, `spintax-template.json`)하는데, 이 경로가 `tests/spintax-pipeline/output/`로 하드코딩됨. Celery 워커가 여러 프로세스에서 동시에 같은 경로에 쓰면 **레이스 컨디션**이 발생하여 서로 다른 유저의 템플릿 데이터가 덮어씌워질 수 있음. | `generate()` 메서드에서 `template_id` 기반의 임시 디렉터리(`/tmp/spintax/{template_id}/`)를 사용하도록 `output_dir`을 주입하거나, `pipeline.py` 함수들이 경로를 파라미터로 받도록 리팩토링 필요. |
| HIGH | `backend/.env:9` | `OPENAI_API_KEY`가 평문으로 `.env`에 하드코딩되어 있고, 같은 파일에 `SUPABASE_SERVICE_ROLE_KEY`도 포함됨. 이 파일이 `.gitignore`에 포함되지 않으면 자격증명이 저장소에 커밋될 수 있음. | `.env`가 `.gitignore`에 있는지 확인. Supabase Service Role Key와 OpenAI Key는 환경변수 관리 서비스(Cloudtype Secret, Vercel Env) 또는 `.env.local`로 관리. `.env`는 빈 플레이스홀더만 포함한 `.env.example`로 대체 권장. |
| MEDIUM | `backend/src/tasks/campaign_tasks.py:323-341` | 스핀택스 모드에서 `else` 브랜치(LLM 모드)는 `campaign_data`에서 읽은 파라미터(`persona`, `section_count`, `include_toc` 등)를 무시하고 `persona_id="expert"`, `section_count=6` 등 하드코딩된 값을 사용함. LLM 모드 캠페인에서 프론트엔드 설정이 적용되지 않는 기존 버그는 스핀택스 추가와 무관하지만, 두 모드의 불일치가 더욱 두드러짐. | 스핀택스 브랜치와 동일하게 `campaign_data.get("persona", "expert")`, `campaign_data.get("section_count", 6)` 등으로 변경 권장. |
| MEDIUM | `backend/src/core/spintax/template_generator.py:105` | `json.load(open(working_path, 'r', encoding='utf-8'))` — `open()`을 컨텍스트 매니저 없이 사용. 파일 핸들이 닫히지 않을 수 있음. | `with open(working_path, 'r', encoding='utf-8') as f: enriched = json.load(f)` 형태로 변경. |
| MEDIUM | `backend/src/api/spintax_api.py:56-63` | 중복 이름 체크 후 UUID를 생성해 DB에 삽입하는데, `name`에 대한 유니크 제약이 `spintax_templates` 테이블에 있으면(스키마에 `UNIQUE` 선언됨) 체크와 삽입 사이 레이스 컨디션이 있을 수 있음. 또한 Celery 태스크 `generate_spintax_template.delay()` 실행 전 DB 삽입이 완료되지 않으면 태스크가 해당 레코드를 찾지 못할 수 있음(비동기 지연). | DB 삽입 후 `.execute()` 결과를 확인하고, `delay()` 호출 전 `execute()` 성공 여부를 검증하는 코드 추가. |
| MEDIUM | `backend/src/tasks/spintax_tasks.py:67` | `model_used: f"gpt-5.4-mini x {result['master_count']}"` — `gpt-5.4-mini`는 존재하지 않는 모델명. 현재 실제 사용 모델명은 `pipeline.py`의 `LLM` 클래스에서 결정됨. | `pipeline.py`의 `LLM` 클래스에서 `model_name` 속성을 노출하고 `result['llm_model']` 로 전달하거나, 실제 모델명을 사용할 것. |
| MEDIUM | `seed/src/app/(dashboard)/templates/page.jsx:19-39` | 폴링 `useEffect`에서 `loadTemplates()` 함수를 의존성 배열에 포함하지 않음(`eslint-disable`이 적용돼 있어 경고는 없지만). 더 큰 문제는 `status.progress !== t.progress` 로 비교 후 `updated = true` 설정은 하지만 실제로는 `loadTemplates()`를 호출할 때 `updated` 변수의 값이 이미 스코프 밖이 됨. 결과적으로 진행률 비교에 관계없이 매번 `loadTemplates()`가 호출되지는 않고, 어떤 템플릿이든 변경이 있으면 전체를 리로드함. 로직 자체는 동작하지만 의도가 불명확함. | `if (updated) loadTemplates()` 직전에 `if (updated)` 조건이 동작하도록 `status` 객체 전체를 교체하는 방식으로 리팩토링하거나, 단순히 항상 `loadTemplates()`를 호출하도록 명시. |
| MEDIUM | `seed/src/app/(dashboard)/templates/page.jsx:77` | `router.push('/templates/create')` — 절대경로 `/templates/create` 사용. Next.js App Router에서 이 경로는 대시보드 레이아웃 바깥으로 나갈 수 있음. 실제 파일 위치는 `app/(dashboard)/templates/create/page.jsx`이므로 경로가 맞지만, 한국어/영어 locale prefix(`/ko/`, `/en/`)가 붙는 환경에서 링크가 깨질 수 있음. | `usePathname()`으로 현재 locale prefix 감지 후 상대 경로 구성하거나, 영문 locale용 라우팅을 별도로 처리할 것. 동일한 문제가 `templates/create/page.jsx:57`의 `router.push('/templates')`에도 있음. |
| MEDIUM | `backend/migrations/add_spintax_integration.sql:88` | `auth.role() = 'service_role'` RLS 정책은 Supabase에서 실제로 동작하지 않음. Supabase에서 서비스 롤 키로 접근 시 RLS 자체를 우회하지, `auth.role()`이 `'service_role'`을 반환하지 않음. 이 정책은 실질적으로 죽은 코드임. | 해당 정책 제거. 서비스 롤은 RLS를 우회하므로 별도 정책이 불필요함. 혼동을 방지하기 위해 주석으로 설명 추가. |
| LOW | `backend/src/core/spintax/spin_engine.py:232` | `_fix_korean_particles()` 함수의 `fixes` 딕셔너리에 `r'([가-힣])는([가-힣])': None` 항목이 있음. `None`은 falsy이므로 `if right and wrong != right:` 조건에서 걸러져 실제로 아무 치환도 수행하지 않는 **죽은 코드**. | 이 항목을 제거하거나, 의도한 바를 실제 치환 규칙으로 완성할 것. |
| LOW | `backend/src/core/spintax/content_producer.py:73` | `img_count == 'random'` 비교 후 `int(img_count)` 호출 — `img_count`가 문자열 `'random'`일 때 `randint` 분기로 들어가므로 `int()` 호출은 없지만, `img_count == 0` 이후 `int(0) = 0`이므로 이미지가 삽입되지 않음. 이 경우에도 랜덤으로 처리하려는 의도인지 불명확함. | 조건 로직을 `if not isinstance(img_count, int) or img_count <= 0:` 형태로 명확화. |
| LOW | `seed/src/app/(dashboard)/campaigns/create/page.jsx:458` | `onKeyPress` 이벤트 핸들러 사용 — `onKeyPress`는 deprecated. | `onKeyDown`으로 교체 (같은 파일 내 `templates/create/page.jsx`는 이미 `onKeyDown` 사용 중). |
| LOW | `seed/src/menu-items/pbn-dashboard.js:115` | `spintax-templates` 그룹과 `content-generator` 메뉴 아이템 모두 `icons.contentGenerator` (`MagicStar`)를 아이콘으로 사용하여 시각적 중복 발생. | `spintax-templates`용 별도 아이콘 할당 권장 (예: `Layer` 또는 `DocumentFilter`). |
| LOW | `seed/src/lib/api/spintax.js:36` | `getTemplates()` 에서 `user_id`를 쿼리 파라미터로 전달: `buildApiUrl('/api/spintax/templates?user_id=${userId}')`. 이 방식은 `buildApiUrl`이 path에 이미 쿼리스트링이 포함된 경우를 처리하도록 설계되지 않았지만 실제로는 동작함. 그러나 클라이언트가 `user_id`를 직접 전달하는 것은 서버 측에서 인증 토큰으로 검증하지 않는 한 보안상 취약. 현재 백엔드는 `user_id` 파라미터를 신뢰하고 있음. | 백엔드 API에 인증 미들웨어(JWT Bearer 토큰 또는 Supabase Auth 헤더) 추가 후 서버 측에서 user_id를 파생하는 방식으로 변경 권장. 현재 구조에서는 어떤 `user_id`로도 타인의 템플릿 조회가 가능함. |

---

### 요약

- **총 이슈**: 14개 (HIGH: 4, MEDIUM: 7, LOW: 3)

**즉시 수정 필요 (HIGH)**:

1. **campaign_tasks.py:292** — `content_mode=spintax + spintax_template_id=없음` 조합 시 `pipeline=None`에서 AttributeError 발생. 조기 실패 로직 추가 필요.
2. **add_spintax_integration.sql** — `spintax_templates` 테이블이 먼저 존재해야 FK 추가가 성공함. `create_spintax_tables.sql`을 선행 실행해야 한다는 의존성이 문서화되지 않음. 운영 DB에 마이그레이션 적용 전 순서 확인 필수.
3. **template_generator.py** — Celery 병렬 실행 시 `tests/spintax-pipeline/output/` 파일 경로가 공유되어 레이스 컨디션 발생. 프로덕션 배포 전 template_id 기반 임시 경로 분리 필요.
4. **backend/.env** — OpenAI API Key 및 Supabase Service Role Key 평문 포함. `.gitignore` 확인 및 시크릿 관리 방식 점검 필요.

**개선 권장 (MEDIUM)**:

- campaign_tasks.py LLM 브랜치에서 campaign_data 파라미터 무시 문제 수정
- spintax_api.py Celery delay() 전 DB 삽입 완료 검증 추가
- model_used 필드의 잘못된 모델명 수정
- RLS 정책에서 불필요한 service_role 정책 제거 (혼동 유발)
- 템플릿 리스트/생성 페이지의 locale-aware 라우팅 처리

**LLM 기존 플로우 영향 여부**: 스핀택스 코드 추가로 인한 LLM 기존 플로우 파손 없음. `content_mode` 기본값이 `"llm"` 이고, `else` 브랜치가 기존 LLM 파이프라인을 그대로 호출함. 단, HIGH 이슈 #1로 인해 `content_mode=spintax`이지만 `spintax_template_id`가 없는 예외 케이스에서 `pipeline=None` AttributeError가 발생한 뒤 `continue`로 넘어가므로 LLM 처리 자체는 건드리지 않음.
