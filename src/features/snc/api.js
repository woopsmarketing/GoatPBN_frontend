/**
 * SNC (Next.js PBN) 격리 API 래퍼.
 *
 * 격리 개발 원칙: 운영 코드(src/lib/api/campaigns.js)를 건드리지 않고
 * 새 기능을 별도 폴더에 독립 구현. 검증 후 통합 위치(src/lib/api/snc.js 등)로 승격.
 *
 * snc_campaigns / snc_publish_jobs 테이블은 GoatPBN Supabase DB에 위치 (운영 DB와 동일).
 * NEXT_PUBLIC_SUPABASE_URL/KEY 가 그쪽을 가리키므로 기존 supabase 클라이언트 재사용.
 */

import { supabase } from '../../lib/supabase';

const TABLE_CAMPAIGNS = 'snc_campaigns';
const TABLE_JOBS = 'snc_publish_jobs';
const TABLE_KEYWORDS = 'snc_campaign_keywords';
const TABLE_SITES = 'snc_sites_cache';

function mapCampaign(row) {
  if (!row) return row;
  return {
    ...row,
    selectedSites: row.selected_sites || [],
    completedCount: row.completed_count ?? 0,
    dailyExecutionCount: row.daily_execution_count ?? 0,
    remainingQuantity: row.remaining_quantity,
    remainingDays: row.remaining_days,
    targetUrl: row.target_url,
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

export const sncCampaignsAPI = {
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
  }
};

export const sncJobsAPI = {
  async listByCampaign(campaignId, { limit = 20 } = {}) {
    const { data, error } = await supabase
      .from(TABLE_JOBS)
      .select('id,status,keyword,exit_code,started_at,finished_at,snc_post_url,quality_score,cost_usd,error')
      .eq('campaign_id', campaignId)
      .order('started_at', { ascending: false })
      .limit(limit);
    if (error) return { data: null, error };
    return { data: data || [], error: null };
  },

  /**
   * 사용자 소유 모든 캠페인의 잡 통합 조회.
   * 2-step: campaigns 조회 → 그 id 들의 jobs 조회. snc_publish_jobs 에 user_id 컬럼이
   * 없어 join 대신 campaign_id IN (...) 로 처리. campaignName 도 attach 해서 반환.
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
      .select('id,campaign_id,status,keyword,site_id,exit_code,started_at,finished_at,snc_post_url,quality_score,cost_usd,error,llm_calls')
      .in('campaign_id', campaignIds)
      .order('started_at', { ascending: false })
      .limit(limit);
    if (status) q = q.eq('status', status);

    const { data, error } = await q;
    if (error) return { data: null, error };
    return {
      data: (data || []).map((j) => ({ ...j, campaignName: idMap[j.campaign_id] || '-' })),
      error: null
    };
  }
};

export const sncReportsAPI = {
  /**
   * 사용자 소유 캠페인 + 잡 한 번에 가져와 클라이언트에서 집계.
   * 데이터 양 < 1000 가정 (한 사용자 잡 수). 향후 RPC 로 이동 가능.
   */
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

    // 집계
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

    // 최근 7일 일별 posted 카운트 (KST 기준 자정 경계 — 단순화 위해 UTC 사용)
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

    // 캠페인별 잡 카운트
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
      data: {
        campaigns: campaigns || [],
        total,
        byStatus,
        posted,
        successRate,
        totalCost,
        avgQuality,
        dailyCounts,
        byCampaign
      },
      error: null
    };
  }
};

export const sncSitesAPI = {
  async listEnabled() {
    const { data, error } = await supabase
      .from(TABLE_SITES)
      .select('site_id,brand_name,homepage_url,topic_focus,group_tag,active,enabled_for_dashboard,total_posts')
      .eq('active', true)
      .eq('enabled_for_dashboard', true)
      .order('display_order', { ascending: true });
    if (error) return { data: null, error };
    return { data: data || [], error: null };
  }
};

export const sncCampaignCreateAPI = {
  /**
   * 캠페인 + 키워드 일괄 생성.
   *
   * 트랜잭션이 아닌 2-step (Supabase REST 한계). campaign insert 성공 후
   * keywords insert 가 실패하면 캠페인은 생성되지만 키워드는 비어있는 상태로
   * 남는다. 이 경우 호출자는 별도 fix 가능 (delete or retry insert keywords).
   */
  async create({ name, targetUrl, selectedSites, keywords, quantity, duration, status = 'paused' }) {
    const userId = await currentUserId();
    if (!userId) return { data: null, error: { message: '로그인이 필요합니다.' } };

    // external_anchor=null 이면 pipeline 이 main keyword 를 앵커로 fallback 사용 (stages.py:62).
    // schedule_hours 컬럼은 NOT NULL 가능성이 있어 빈 배열로 채움 (worker 는 next_execution_at 만 사용).
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
          schedule_hours: [],
          completed_count: 0,
          daily_execution_count: 0,
          remaining_quantity: quantity,
          remaining_days: duration
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
