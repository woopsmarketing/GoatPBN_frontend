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
  }
};
