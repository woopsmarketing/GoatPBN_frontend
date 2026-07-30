/**
 * SFN (site-factory-next PBN) 격리 API 래퍼 — features/snc/api.js 클론.
 *
 * 격리 개발 원칙: 운영 코드(src/lib/api/campaigns.js)를 건드리지 않고
 * 새 기능을 별도 폴더에 독립 구현. 검증 후 통합 위치로 승격.
 *
 * sfn_* 테이블은 GoatPBN Supabase DB(메인)에 위치 — 기존 supabase 클라이언트 재사용.
 * SNC 와의 차이: 발행 URL(post_url)이 워커의 발행 응답에서 동기 기록되므로
 * SNC 의 enrichJobsFromSnc self-heal(별도 SNC DB 조회)이 필요 없다.
 */

import { supabase } from '../../lib/supabase';

const TABLE_CAMPAIGNS = 'sfn_campaigns';
const TABLE_JOBS = 'sfn_publish_jobs';
const TABLE_KEYWORDS = 'sfn_campaign_keywords';
const TABLE_SITES = 'sfn_sites_cache';

// 스핀택스 캠페인은 target_url 컬럼에 설정 JSON 을 담는다(zero-DDL — 백엔드
// sfn_workers/sfn_spintax_tasks.spintax_config 와 동일 규약). LLM 캠페인은 평범한 URL 문자열.
function parseSpintax(targetUrl) {
  if (typeof targetUrl === 'string' && targetUrl.trim().startsWith('{')) {
    try {
      const cfg = JSON.parse(targetUrl);
      if (cfg && cfg.mode === 'spintax') return cfg;
    } catch {
      /* 평범한 URL 로 취급 */
    }
  }
  return null;
}

function mapCampaign(row) {
  if (!row) return row;
  const spintax = parseSpintax(row.target_url);
  return {
    ...row,
    selectedSites: row.selected_sites || [],
    completedCount: row.completed_count ?? 0,
    dailyExecutionCount: row.daily_execution_count ?? 0,
    targetUrl: row.target_url,
    spintax, // null 이면 LLM 캠페인
    contentMode: spintax ? 'spintax' : 'llm',
    targetUrlDisplay: spintax ? `스핀택스 · ${spintax.template} · 링크 ${(spintax.urls || []).length}개` : row.target_url,
    externalAnchor: row.external_anchor,
    scheduleHours: row.schedule_hours || [],
    lastExecutionDate: row.last_execution_date,
    nextExecutionAt: row.next_execution_at,
    startedAt: row.started_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

async function currentUserId() {
  const {
    data: { user }
  } = await supabase.auth.getUser();
  return user?.id || null;
}

export const sfnCampaignsAPI = {
  async list() {
    const userId = await currentUserId();
    if (!userId) return { data: [], error: { message: '로그인이 필요합니다.' } };
    const { data, error } = await supabase
      .from(TABLE_CAMPAIGNS)
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    if (error) return { data: null, error };
    return { data: (data || []).map(mapCampaign), error: null };
  },

  async getById(id) {
    const userId = await currentUserId();
    if (!userId) return { data: null, error: { message: '로그인이 필요합니다.' } };
    const { data, error } = await supabase.from(TABLE_CAMPAIGNS).select('*').eq('id', id).eq('user_id', userId).single();
    if (error) return { data: null, error };
    return { data: mapCampaign(data), error: null };
  },

  async setStatus(id, status) {
    const userId = await currentUserId();
    if (!userId) return { data: null, error: { message: '로그인이 필요합니다.' } };
    const { data, error } = await supabase.from(TABLE_CAMPAIGNS).update({ status }).eq('id', id).eq('user_id', userId).select('*').single();
    if (error) return { data: null, error };
    return { data: mapCampaign(data), error: null };
  },

  /**
   * 스핀택스 캠페인의 설정(타겟 URL 등)을 부분 수정. 진행 중이어도 가능 —
   * 워커가 매 발행마다 설정을 새로 읽으므로 이후 글부터 반영된다.
   * patch: { urls?, publishStatus?, singleTarget?, includeImage? }
   */
  async updateSpintaxConfig(id, patch = {}) {
    const userId = await currentUserId();
    if (!userId) return { data: null, error: { message: '로그인이 필요합니다.' } };
    const { data: row, error: rErr } = await supabase
      .from(TABLE_CAMPAIGNS)
      .select('target_url')
      .eq('id', id)
      .eq('user_id', userId)
      .single();
    if (rErr) return { data: null, error: rErr };
    const cfg = parseSpintax(row?.target_url);
    if (!cfg) return { data: null, error: { message: '스핀택스 캠페인이 아닙니다.' } };

    const next = { ...cfg };
    if (Array.isArray(patch.urls)) {
      const cleaned = Array.from(new Set(patch.urls.map((u) => String(u).trim()).filter(Boolean)));
      if (cleaned.length === 0) return { data: null, error: { message: '타겟 URL은 1개 이상이어야 합니다.' } };
      next.urls = cleaned;
    }
    if (patch.publishStatus) next.publish_status = patch.publishStatus;
    if (typeof patch.singleTarget === 'boolean') next.single_target = patch.singleTarget;
    if (typeof patch.includeImage === 'boolean') next.include_image = patch.includeImage;

    const { data, error } = await supabase
      .from(TABLE_CAMPAIGNS)
      .update({ target_url: JSON.stringify(next) })
      .eq('id', id)
      .eq('user_id', userId)
      .select('*')
      .single();
    if (error) return { data: null, error };
    return { data: mapCampaign(data), error: null };
  }
};

export const sfnJobsAPI = {
  async listByCampaign(campaignId, { limit = 20 } = {}) {
    const { data, error } = await supabase
      .from(TABLE_JOBS)
      .select('id,site_id,status,keyword,exit_code,started_at,finished_at,post_url,quality_score,cost_usd,llm_calls,error')
      .eq('campaign_id', campaignId)
      .order('started_at', { ascending: false })
      .limit(limit);
    if (error) return { data: null, error };
    return { data: data || [], error: null };
  },

  /**
   * 사용자 소유 캠페인의 발행 성공(posted + post_url 존재) 잡만 조회.
   * 백링크 CSV 다운로드용. campaign target_url + name 도 attach.
   */
  async listPostedBacklinks({ campaignId = null, limit = 5000 } = {}) {
    const userId = await currentUserId();
    if (!userId) return { data: [], error: { message: '로그인이 필요합니다.' } };

    const { data: campaigns, error: cErr } = await supabase.from(TABLE_CAMPAIGNS).select('id,name,target_url').eq('user_id', userId);
    if (cErr) return { data: null, error: cErr };
    if (!campaigns || campaigns.length === 0) return { data: [], error: null };

    const idMap = Object.fromEntries(campaigns.map((c) => [c.id, c]));
    const campaignIds = campaignId ? [campaignId] : campaigns.map((c) => c.id);

    const { data, error } = await supabase
      .from(TABLE_JOBS)
      .select('id,campaign_id,status,keyword,site_id,started_at,finished_at,post_url,quality_score,cost_usd')
      .in('campaign_id', campaignIds)
      .eq('status', 'posted')
      .not('post_url', 'is', null)
      .order('finished_at', { ascending: false })
      .limit(limit);
    if (error) return { data: null, error };
    return {
      data: (data || []).map((j) => ({
        ...j,
        campaign_name: idMap[j.campaign_id]?.name || '-',
        target_url: idMap[j.campaign_id]?.target_url || ''
      })),
      error: null
    };
  },

  /**
   * 사용자 소유 모든 캠페인의 잡 통합 조회.
   * 2-step: campaigns 조회 → 그 id 들의 jobs 조회 (jobs 에 user_id 컬럼 없음).
   */
  async listAllForUser({ limit = 200, status = null } = {}) {
    const userId = await currentUserId();
    if (!userId) return { data: [], error: { message: '로그인이 필요합니다.' } };

    const { data: campaigns, error: cErr } = await supabase.from(TABLE_CAMPAIGNS).select('id,name').eq('user_id', userId);
    if (cErr) return { data: null, error: cErr };
    if (!campaigns || campaigns.length === 0) return { data: [], error: null };

    const idMap = Object.fromEntries(campaigns.map((c) => [c.id, c.name]));
    const campaignIds = campaigns.map((c) => c.id);

    let q = supabase
      .from(TABLE_JOBS)
      .select('id,campaign_id,status,keyword,site_id,exit_code,started_at,finished_at,post_url,quality_score,cost_usd,error,llm_calls')
      .in('campaign_id', campaignIds)
      .order('started_at', { ascending: false })
      .limit(limit);
    if (status) q = q.eq('status', status);

    const { data, error } = await q;
    if (error) return { data: null, error };
    return { data: (data || []).map((j) => ({ ...j, campaignName: idMap[j.campaign_id] || '-' })), error: null };
  }
};

export const sfnReportsAPI = {
  /** 사용자 소유 캠페인 + 잡 한 번에 가져와 클라이언트에서 집계 (SNC summary 와 동일). */
  async summary() {
    const userId = await currentUserId();
    if (!userId) return { data: null, error: { message: '로그인이 필요합니다.' } };

    const { data: campaigns, error: cErr } = await supabase
      .from(TABLE_CAMPAIGNS)
      .select('id,name,status,quantity,completed_count,created_at')
      .eq('user_id', userId);
    if (cErr) return { data: null, error: cErr };

    const campaignIds = (campaigns || []).map((c) => c.id);
    let jobs = [];
    if (campaignIds.length > 0) {
      const { data: jdata, error: jErr } = await supabase
        .from(TABLE_JOBS)
        .select('id,campaign_id,status,started_at,finished_at,quality_score,cost_usd')
        .in('campaign_id', campaignIds)
        .order('started_at', { ascending: false })
        .limit(1000);
      if (jErr) return { data: null, error: jErr };
      jobs = jdata || [];
    }

    const total = jobs.length;
    const byStatus = jobs.reduce((acc, j) => {
      acc[j.status] = (acc[j.status] || 0) + 1;
      return acc;
    }, {});
    const posted = byStatus.posted || 0;
    const successRate = total > 0 ? Math.round((posted / total) * 100) : 0;
    const totalCost = jobs.reduce((s, j) => s + (Number(j.cost_usd) || 0), 0);
    const qualityScores = jobs.filter((j) => j.quality_score != null).map((j) => Number(j.quality_score));
    const avgQuality = qualityScores.length > 0 ? Math.round(qualityScores.reduce((s, v) => s + v, 0) / qualityScores.length) : null;

    const dailyCounts = {};
    const now = new Date();
    for (let i = 6; i >= 0; i -= 1) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const k = d.toISOString().slice(0, 10);
      dailyCounts[k] = 0;
    }
    for (const j of jobs) {
      if (j.status !== 'posted' || !j.finished_at) continue;
      const k = String(j.finished_at).slice(0, 10);
      if (k in dailyCounts) dailyCounts[k] += 1;
    }

    const byCampaign = (campaigns || []).map((c) => {
      const cJobs = jobs.filter((j) => j.campaign_id === c.id);
      return {
        ...c,
        totalJobs: cJobs.length,
        postedJobs: cJobs.filter((j) => j.status === 'posted').length,
        failedJobs: cJobs.filter((j) => j.status === 'failed' || j.status === 'dead').length
      };
    });

    return {
      data: { campaigns: campaigns || [], total, byStatus, posted, successRate, totalCost, avgQuality, dailyCounts, byCampaign },
      error: null
    };
  }
};

// 스핀택스 템플릿 목록 — 캠페인 생성 시 선택용. spintax_templates 는 GPB DB 에 있고
// RLS(auth.uid()=user_id)로 보호되므로 사용자 소유 템플릿만 조회된다.
export const sfnSpintaxTemplatesAPI = {
  async list() {
    const userId = await currentUserId();
    if (!userId) return { data: [], error: { message: '로그인이 필요합니다.' } };
    const { data, error } = await supabase
      .from('spintax_templates')
      .select('id,name,status,main_keyword,section_count,master_count,created_at')
      .eq('user_id', userId)
      .eq('status', 'ready')
      .order('created_at', { ascending: false });
    if (error) return { data: null, error };
    return { data: data || [], error: null };
  }
};

// 스핀택스 SFN 캠페인 생성 — sfn_campaigns 에 직접 insert.
// 설정(템플릿·복수 URL·발행옵션)은 target_url 에 JSON 으로 담는다(zero-DDL, 마이그레이션 불요).
// 키워드는 템플릿에 내장돼 있으므로 sfn_campaign_keywords 는 비운다 → 기존 LLM 스캔은
// pick_keyword=None 으로 이 캠페인을 건너뛰고, 스핀택스 스캔만 처리한다(경로 분리).
export const sfnSpintaxCampaignCreateAPI = {
  async create({
    name,
    template,
    targetUrls,
    selectedSites,
    quantity,
    duration,
    publishStatus = 'published',
    singleTarget = true,
    includeImage = true,
    linkRange = [3, 5],
    status = 'paused'
  }) {
    const userId = await currentUserId();
    if (!userId) return { data: null, error: { message: '로그인이 필요합니다.' } };

    const cfg = {
      mode: 'spintax',
      template,
      urls: targetUrls,
      publish_status: publishStatus,
      link_count_range: linkRange,
      single_target: singleTarget,
      include_image: includeImage
    };

    const { data: campaign, error: cErr } = await supabase
      .from('sfn_campaigns')
      .insert([
        {
          user_id: userId,
          name,
          status,
          target_url: JSON.stringify(cfg),
          external_anchor: null,
          selected_sites: selectedSites,
          quantity,
          duration,
          completed_count: 0,
          daily_execution_count: 0
        }
      ])
      .select('*')
      .single();
    if (cErr) return { data: null, error: cErr };
    return { data: mapCampaign(campaign), error: null };
  }
};

export const sfnSitesAPI = {
  async listEnabled() {
    const { data, error } = await supabase
      .from(TABLE_SITES)
      .select('site_id,brand_name,homepage_url,domain,group_tag,active,locked,enabled_for_dashboard')
      .eq('active', true)
      .eq('enabled_for_dashboard', true)
      .order('display_order', { ascending: true });
    if (error) return { data: null, error };
    return { data: data || [], error: null };
  }
};

export const sfnCampaignCreateAPI = {
  /**
   * 캠페인 + 키워드 일괄 생성 (2-step, 트랜잭션 아님 — SNC 와 동일 한계).
   */
  async create({ name, targetUrl, selectedSites, keywords, quantity, duration, status = 'paused' }) {
    const userId = await currentUserId();
    if (!userId) return { data: null, error: { message: '로그인이 필요합니다.' } };

    // external_anchor=null 이면 pipeline 이 main keyword 를 앵커로 fallback (stages.py:62).
    const { data: campaign, error: cErr } = await supabase
      .from(TABLE_CAMPAIGNS)
      .insert([
        {
          user_id: userId,
          name,
          status,
          target_url: targetUrl,
          external_anchor: null,
          selected_sites: selectedSites,
          quantity,
          duration,
          completed_count: 0,
          daily_execution_count: 0
        }
      ])
      .select('*')
      .single();
    if (cErr) return { data: null, error: cErr };

    if (Array.isArray(keywords) && keywords.length > 0) {
      const rows = keywords.map((k) => ({ campaign_id: campaign.id, keyword: k }));
      const { error: kErr } = await supabase.from(TABLE_KEYWORDS).insert(rows);
      if (kErr) {
        return { data: mapCampaign(campaign), error: { message: '캠페인은 생성됐지만 키워드 등록 실패: ' + kErr.message } };
      }
    }

    return { data: mapCampaign(campaign), error: null };
  }
};
