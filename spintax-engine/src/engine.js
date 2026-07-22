/**
 * 멀티레이어 스핀택스 엔진
 *
 * L1 구조 스핀 — 섹션 순서, 포함/제외
 * L2 단락 스핀 — 같은 주제의 대체 단락 선택
 * L3 문장 스핀 — 문장 내 표현 변형 ({A|B|C})
 * L4 단어 스핀 — 동의어 치환 (L3에 통합)
 * L5 메타 스핀 — title, description, slug 변형
 */

import { resolveSpintax, estimateCombinations } from './parser.js';
import crypto from 'crypto';

export class SpintaxEngine {
  /**
   * @param {object} template - spintax_templates 테이블의 레코드
   * @param {object} [options]
   * @param {number} [options.seed] - 재현 가능한 랜덤 시드
   */
  constructor(template, options = {}) {
    this.template = template;
    this.usedHashes = new Set();

    // 시드 기반 난수 생성기 (mulberry32)
    if (options.seed != null) {
      this._seedState = options.seed | 0;
      this.rng = () => {
        this._seedState |= 0;
        this._seedState = (this._seedState + 0x6d2b79f5) | 0;
        let t = Math.imul(this._seedState ^ (this._seedState >>> 15), 1 | this._seedState);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
      };
    } else {
      this.rng = Math.random;
    }
  }

  /**
   * 고유한 콘텐츠 1편을 생성한다.
   * @param {object} [overrides] - 옵션 오버라이드
   * @param {boolean} [overrides.includeToc] - 목차 포함 여부
   * @param {string} [overrides.targetUrl] - 백링크 타겟 URL
   * @returns {object} 생성된 콘텐츠
   */
  spin(overrides = {}) {
    const maxAttempts = 20;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const content = this._generateOne(overrides);
      const hash = this._hash(content.body);

      if (!this.usedHashes.has(hash)) {
        this.usedHashes.add(hash);
        return { ...content, hash, unique: true, attempt: attempt + 1 };
      }
    }

    // fallback: 해시 충돌이 계속되면 마지막 결과라도 반환
    const content = this._generateOne(overrides);
    return { ...content, hash: this._hash(content.body), unique: false, attempt: maxAttempts };
  }

  /**
   * 여러 편의 콘텐츠를 한 번에 생성한다.
   * @param {number} count - 생성할 콘텐츠 수
   * @param {object} [overrides]
   * @returns {object[]} 생성된 콘텐츠 배열
   */
  spinBatch(count, overrides = {}) {
    const results = [];
    for (let i = 0; i < count; i++) {
      results.push(this.spin(overrides));
    }
    return results;
  }

  /**
   * 내부: 콘텐츠 1편 생성 (중복 체크 없이)
   */
  _generateOne(overrides = {}) {
    const t = this.template;
    const rng = this.rng;

    // L5: 메타 스핀
    const title = resolveSpintax(t.title_spintax, rng);
    const description = resolveSpintax(t.description_spintax, rng);
    const slug = resolveSpintax(t.slug_spintax, rng);

    // L1: 구조 결정
    const sectionOrder = this._pickStructure();

    // 도입부
    const intro = resolveSpintax(t.intro_spintax, rng);

    // L2 + L3 + L4: 섹션별 본문
    const sections = [];
    for (const sectionId of sectionOrder) {
      const sectionDef = this._getSection(sectionId);
      if (!sectionDef) continue;

      const heading = resolveSpintax(sectionDef.heading_spintax, rng);

      // L2: 단락 변형 선택
      const variantIndex = Math.floor(rng() * sectionDef.body_variants.length);
      const chosenVariant = sectionDef.body_variants[variantIndex];

      // L3+L4: 스핀택스 해석
      const body = resolveSpintax(chosenVariant, rng);

      // 서브헤딩 처리
      const subheadings = [];
      if (sectionDef.subheadings) {
        for (const sub of sectionDef.subheadings) {
          const subHeading = resolveSpintax(sub.heading_spintax, rng);
          const subVariantIndex = Math.floor(rng() * sub.body_variants.length);
          const subBody = resolveSpintax(sub.body_variants[subVariantIndex], rng);
          subheadings.push({ heading: subHeading, body: subBody });
        }
      }

      sections.push({ id: sectionId, heading, body, subheadings });
    }

    // 결론부
    const outro = resolveSpintax(t.outro_spintax, rng);

    // HTML 조립
    const body = this._assembleHtml(intro, sections, outro, {
      includeToc: overrides.includeToc ?? true,
      targetUrl: overrides.targetUrl
    });

    const wordCount = this._countWords(body);

    return { title, description, slug, intro, sections, outro, body, wordCount };
  }

  /**
   * L1: 섹션 순서 결정
   */
  _pickStructure() {
    const sv = this.template.structure_variants;
    if (!sv) {
      // structure_variants가 없으면 sections_spintax 순서대로
      return this.template.sections_spintax.map((s) => s.id);
    }

    // 미리 검증된 순서가 있으면 그 중에서 선택
    if (sv.preset_orders && sv.preset_orders.length > 0) {
      const idx = Math.floor(this.rng() * sv.preset_orders.length);
      return sv.preset_orders[idx];
    }

    // 동적 생성
    const required = [...(sv.required_sections || [])];
    const optional = [...(sv.optional_sections || [])];
    const min = sv.min_sections || required.length;
    const max = sv.max_sections || required.length + optional.length;
    const targetCount = min + Math.floor(this.rng() * (max - min + 1));
    const optionalCount = Math.min(targetCount - required.length, optional.length);

    // 옵션 섹션 랜덤 선택
    this._shuffle(optional);
    const picked = optional.slice(0, Math.max(0, optionalCount));

    const order = [...required, ...picked];

    // 셔플 그룹 내 순서 랜덤화
    if (sv.shuffle_groups) {
      for (const group of sv.shuffle_groups) {
        const groupItems = order.filter((s) => group.includes(s));
        this._shuffle(groupItems);
        let idx = 0;
        for (let i = 0; i < order.length; i++) {
          if (group.includes(order[i])) {
            order[i] = groupItems[idx++];
          }
        }
      }
    }

    return order;
  }

  /**
   * 섹션 ID로 섹션 정의를 가져온다.
   */
  _getSection(sectionId) {
    return this.template.sections_spintax.find((s) => s.id === sectionId) || null;
  }

  /**
   * HTML 조립
   */
  _assembleHtml(intro, sections, outro, options = {}) {
    const parts = [];

    // 목차
    if (options.includeToc && sections.length > 0) {
      parts.push('<nav class="toc">');
      parts.push('<h2>목차</h2>');
      parts.push('<ul>');
      for (const section of sections) {
        const anchorId = section.id.replace(/[^a-zA-Z0-9_-]/g, '-');
        parts.push(`<li><a href="#${anchorId}">${section.heading}</a></li>`);
      }
      parts.push('</ul>');
      parts.push('</nav>');
      parts.push('');
    }

    // 도입부
    parts.push(intro);
    parts.push('');

    // 본문 섹션
    for (const section of sections) {
      const anchorId = section.id.replace(/[^a-zA-Z0-9_-]/g, '-');
      parts.push(`<h2 id="${anchorId}">${section.heading}</h2>`);
      parts.push(section.body);

      // 서브헤딩
      if (section.subheadings && section.subheadings.length > 0) {
        for (const sub of section.subheadings) {
          parts.push(`<h3>${sub.heading}</h3>`);
          parts.push(sub.body);
        }
      }

      parts.push('');
    }

    // 결론부
    parts.push(outro);

    // 백링크
    if (options.targetUrl) {
      parts.push('');
      parts.push(`<p>자세한 내용은 <a href="${options.targetUrl}" target="_blank">여기</a>에서 확인하세요.</p>`);
    }

    return parts.join('\n');
  }

  /**
   * Fisher-Yates 셔플 (in-place)
   */
  _shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(this.rng() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  /**
   * 한국어/영어 단어 수 계산 (HTML 태그 제외)
   */
  _countWords(html) {
    const text = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    if (!text) return 0;
    // 한국어: 공백 기준 토큰 수
    return text.split(/\s+/).length;
  }

  /**
   * MD5 해시
   */
  _hash(text) {
    return crypto.createHash('md5').update(text).digest('hex');
  }

  /**
   * 이 템플릿의 추정 조합 수를 계산한다.
   */
  estimateTotalCombinations() {
    let total = 1;

    // 메타 스핀
    total *= estimateCombinations(this.template.title_spintax);
    total *= estimateCombinations(this.template.description_spintax);

    // 구조 변형
    const sv = this.template.structure_variants;
    if (sv?.preset_orders) {
      total *= sv.preset_orders.length;
    }

    // 도입/결론
    total *= estimateCombinations(this.template.intro_spintax);
    total *= estimateCombinations(this.template.outro_spintax);

    // 섹션별
    for (const section of this.template.sections_spintax) {
      // 단락 변형 수
      total *= section.body_variants.length;
      // 각 변형 내 스핀택스
      for (const variant of section.body_variants) {
        total *= estimateCombinations(variant);
      }
      // 헤딩 변형
      total *= estimateCombinations(section.heading_spintax);
    }

    return total;
  }
}
