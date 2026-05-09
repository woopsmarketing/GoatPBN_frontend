/**
 * SNC DB 전용 Supabase 클라이언트 (격리 폴더).
 *
 * 운영 GoatPBN DB 와 별도 — 발행된 글의 source of truth (snc_posts) 를 직접 조회.
 * 워커가 GPB.snc_publish_jobs 의 메타 update 에 실패해도 프론트가 SNC DB 에서 직접
 * 가져와 화면에 정확한 데이터 표시.
 *
 * env: NEXT_PUBLIC_SNC_SUPABASE_URL, NEXT_PUBLIC_SNC_SUPABASE_ANON_KEY
 * 두 변수 누락 시 null 반환 — 호출자는 graceful degrade (기존 GPB-only 동작).
 */

import { createClient } from '@supabase/supabase-js';

const SNC_URL = process.env.NEXT_PUBLIC_SNC_SUPABASE_URL;
const SNC_ANON = process.env.NEXT_PUBLIC_SNC_SUPABASE_ANON_KEY;

let _client = null;

export function getSncSupabase() {
  if (_client) return _client;
  if (!SNC_URL || !SNC_ANON) {
    if (typeof window !== 'undefined') {
      console.warn('[snc] SNC Supabase env 누락 — enrichment 비활성화');
    }
    return null;
  }
  _client = createClient(SNC_URL, SNC_ANON, {
    auth: { persistSession: false } // SSO 세션 공유 안 함 — 별도 DB
  });
  return _client;
}

/**
 * snc_posts 에서 site_id + metadata.keyword 매칭 1건 조회.
 * 같은 키워드를 다른 시간에 재사용했을 수 있으므로 created_at desc 로 가장 최근 1건.
 *
 * 반환 row 형태:
 *   { id, slug, post_url, site_id, title, created_at, metadata: { quality_score, cost_usd_estimate, llm_calls, ... } }
 *   또는 null (매칭 없거나 client 없음).
 */
export async function findSncPost(siteId, keyword) {
  const client = getSncSupabase();
  if (!client || !siteId || !keyword) return null;
  try {
    const { data, error } = await client
      .from('snc_posts')
      .select('id,slug,post_url,site_id,title,created_at,metadata')
      .eq('site_id', siteId)
      .eq('metadata->>keyword', keyword)
      .order('created_at', { ascending: false })
      .limit(1);
    if (error) {
      console.warn('[snc] findSncPost error', error);
      return null;
    }
    return (data && data[0]) || null;
  } catch (e) {
    console.warn('[snc] findSncPost exception', e);
    return null;
  }
}

/**
 * 여러 (site_id, keyword) 페어를 한 번에 조회 — IN 절 + JS 측 매칭.
 * snc_publish_jobs 행 N개 enrichment 시 N번 query 대신 1번으로 압축.
 */
export async function findSncPostsBulk(pairs) {
  const client = getSncSupabase();
  if (!client || !Array.isArray(pairs) || pairs.length === 0) return new Map();

  const siteIds = [...new Set(pairs.map((p) => p.siteId).filter(Boolean))];
  const keywords = [...new Set(pairs.map((p) => p.keyword).filter(Boolean))];
  if (siteIds.length === 0 || keywords.length === 0) return new Map();

  try {
    const { data, error } = await client
      .from('snc_posts')
      .select('id,slug,post_url,site_id,title,created_at,metadata')
      .in('site_id', siteIds)
      .in('metadata->>keyword', keywords)
      .order('created_at', { ascending: false })
      .limit(1000);
    if (error) {
      console.warn('[snc] findSncPostsBulk error', error);
      return new Map();
    }
    // 같은 (site, keyword) 가 여러 row 있으면 가장 최근 (이미 desc order)
    const map = new Map();
    for (const row of data || []) {
      const md = typeof row.metadata === 'string' ? safeParseJson(row.metadata) : row.metadata || {};
      const kw = md?.keyword;
      if (!kw) continue;
      const key = `${row.site_id}|${kw}`;
      if (!map.has(key)) {
        map.set(key, { ...row, metadata: md });
      }
    }
    return map;
  } catch (e) {
    console.warn('[snc] findSncPostsBulk exception', e);
    return new Map();
  }
}

function safeParseJson(s) {
  try {
    return JSON.parse(s);
  } catch {
    return {};
  }
}
