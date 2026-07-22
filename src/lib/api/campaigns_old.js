// src/lib/api/campaigns.js
// 한글 주석: 캠페인 관련 API 호출 함수 모음
// 목적: 캠페인 CRUD 및 통계 기능 제공

import { supabase } from '../supabase';

export const campaignsAPI = {
  // 모든 캠페인 가져오기
  async getCampaigns() {
    try {
      const {
        data: { user }
      } = await supabase.auth.getUser();
      if (!user) throw new Error('로그인이 필요합니다.');

      const { data, error } = await supabase.from('campaigns').select('*').eq('user_id', user.id).order('created_at', { ascending: false });

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      console.error('캠페인 조회 오류:', error);
      return { data: null, error: error.message };
    }
  },

  // 사이트별 캠페인 통계 가져오기
  async getSiteCampaignStats(siteId) {
    try {
      const {
        data: { user }
      } = await supabase.auth.getUser();
      if (!user) throw new Error('로그인이 필요합니다.');

      const { data, error } = await supabase
        .from('campaigns')
        .select('status, completed_count, quantity')
        .eq('user_id', user.id)
        .eq('site_id', siteId);

      if (error) throw error;

      // 통계 계산
      const stats = {
        total: data.length,
        active: data.filter((c) => c.status === 'active').length,
        completed: data.filter((c) => c.status === 'completed').length,
        totalContent: data.reduce((sum, c) => sum + (c.completed_count || 0), 0),
        totalTarget: data.reduce((sum, c) => sum + (c.quantity || 0), 0)
      };

      return { data: stats, error: null };
    } catch (error) {
      console.error('사이트 캠페인 통계 조회 오류:', error);
      return { data: { total: 0, active: 0, completed: 0, totalContent: 0, totalTarget: 0 }, error: error.message };
    }
  },

  // 새 캠페인 생성
  async createCampaign(campaignData) {
    try {
      const {
        data: { user }
      } = await supabase.auth.getUser();
      if (!user) throw new Error('로그인이 필요합니다.');

      // 1단계: 기본 캠페인 데이터만 삽입 (계산 컬럼들 제외)
      const { data: insertedCampaign, error: insertError } = await supabase
        .from('campaigns')
        .insert({
          user_id: user.id,
          site_id: campaignData.siteId,
          name: campaignData.name,
          target_site: campaignData.targetSite,
          keywords: campaignData.keywords,
          quantity: parseInt(campaignData.quantity),
          duration: parseInt(campaignData.duration),
          status: campaignData.status || 'pending',
          completed_count: 0
          // progress, daily_target은 INSERT 시 제외 (나중에 계산하여 업데이트)
        })
        .select()
        .single();

      if (insertError) {
        console.error('캠페인 삽입 오류:', insertError);
        throw insertError;
      }

      // 2단계: 계산된 컬럼들 (daily_target, progress, completed_count) 및 상태 업데이트
      try {
        const dailyTarget = Math.ceil(parseInt(campaignData.quantity) / parseInt(campaignData.duration));
        const now = new Date().toISOString();
        const { data, error } = await supabase
          .from('campaigns')
          .update({
            daily_target: dailyTarget,
            progress: 0, // 초기 진행률은 0%
            completed_count: 0, // 초기 완료 개수는 0개
            status: 'active', // 캠페인 생성 시 바로 active로 설정
            started_at: now, // 캠페인 시작 시간 설정 (남은 기간 계산용)
            updated_at: now
          })
          .eq('id', insertedCampaign.id)
          .select()
          .single();

        if (error) {
          console.error('캠페인 상태 업데이트 오류:', error);
          // 업데이트 실패해도 캠페인은 생성된 상태로 반환
          return { data: insertedCampaign, error: null };
        }

        return { data, error: null };
      } catch (updateError) {
        console.error('캠페인 상태 업데이트 중 예외:', updateError);
        // 업데이트 실패해도 캠페인은 생성된 상태로 반환
        return { data: insertedCampaign, error: null };
      }
    } catch (error) {
      console.error('캠페인 생성 오류:', error);
      return { data: null, error: error.message };
    }
  },

  // 캠페인 상태 업데이트
  async updateCampaignStatus(campaignId, status) {
    try {
      const {
        data: { user }
      } = await supabase.auth.getUser();
      if (!user) throw new Error('로그인이 필요합니다.');

      const { data, error } = await supabase
        .from('campaigns')
        .update({
          status: status,
          updated_at: new Date().toISOString()
        })
        .eq('id', campaignId)
        .eq('user_id', user.id)
        .select()
        .single();

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      console.error('캠페인 상태 업데이트 오류:', error);
      return { data: null, error: error.message };
    }
  },

  // 캠페인 진행률 업데이트
  async updateCampaignProgress(campaignId, completedCount) {
    try {
      const {
        data: { user }
      } = await supabase.auth.getUser();
      if (!user) throw new Error('로그인이 필요합니다.');

      // 캠페인 정보 조회
      const { data: campaign, error: fetchError } = await supabase
        .from('campaigns')
        .select('quantity')
        .eq('id', campaignId)
        .eq('user_id', user.id)
        .single();

      if (fetchError) throw fetchError;

      const progress = Math.round((completedCount / campaign.quantity) * 100);
      const status = completedCount >= campaign.quantity ? 'completed' : 'active';

      const { data, error } = await supabase
        .from('campaigns')
        .update({
          completed_count: completedCount,
          progress: progress,
          status: status,
          updated_at: new Date().toISOString()
        })
        .eq('id', campaignId)
        .eq('user_id', user.id)
        .select()
        .single();

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      console.error('캠페인 진행률 업데이트 오류:', error);
      return { data: null, error: error.message };
    }
  },

  // 캠페인 수정
  async updateCampaign(campaignId, campaignData) {
    try {
      const {
        data: { user }
      } = await supabase.auth.getUser();
      if (!user) throw new Error('로그인이 필요합니다.');

      // 수량이나 기간이 변경된 경우 daily_target 재계산
      const updateData = {
        name: campaignData.name,
        target_site: campaignData.targetSite,
        keywords: campaignData.keywords,
        updated_at: new Date().toISOString()
      };

      // 수량이나 기간이 변경된 경우
      if (campaignData.quantity || campaignData.duration) {
        updateData.quantity = campaignData.quantity;
        updateData.duration = campaignData.duration;

        // daily_target 재계산
        if (campaignData.quantity && campaignData.duration) {
          updateData.daily_target = Math.ceil(campaignData.quantity / campaignData.duration);
        }
      }

      const { data, error } = await supabase
        .from('campaigns')
        .update(updateData)
        .eq('id', campaignId)
        .eq('user_id', user.id)
        .select()
        .single();

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      console.error('캠페인 수정 오류:', error);
      return { data: null, error: error.message };
    }
  },

  // 캠페인 삭제
  async deleteCampaign(campaignId) {
    try {
      const {
        data: { user }
      } = await supabase.auth.getUser();
      if (!user) throw new Error('로그인이 필요합니다.');

      const { error } = await supabase.from('campaigns').delete().eq('id', campaignId).eq('user_id', user.id);

      if (error) throw error;
      return { data: true, error: null };
    } catch (error) {
      console.error('캠페인 삭제 오류:', error);
      return { data: null, error: error.message };
    }
  },

  // 사이트 정보를 포함한 캠페인 목록 조회
  async getCampaignsWithSites() {
    try {
      const {
        data: { user }
      } = await supabase.auth.getUser();
      if (!user) throw new Error('로그인이 필요합니다.');

      const { data, error } = await supabase
        .from('campaigns')
        .select(
          `
          *,
          sites(id, name, url, status)
        `
        )
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      console.error('캠페인 조회 오류:', error);
      return { data: null, error: error.message };
    }
  },

  // 전체 캠페인 통계 조회
  async getCampaignStats() {
    try {
      const {
        data: { user }
      } = await supabase.auth.getUser();
      if (!user) throw new Error('로그인이 필요합니다.');

      const { data, error } = await supabase.from('campaigns').select('status, completed_count, quantity').eq('user_id', user.id);

      if (error) throw error;

      // 통계 계산
      const stats = {
        total: data.length,
        active: data.filter((c) => c.status === 'active').length,
        completed: data.filter((c) => c.status === 'completed').length,
        paused: data.filter((c) => c.status === 'paused').length,
        totalContent: data.reduce((sum, c) => sum + (c.completed_count || 0), 0),
        totalTarget: data.reduce((sum, c) => sum + (c.quantity || 0), 0),
        successRate: 0 // 기본값 0%
      };

      // 성공률 계산 (현재는 completed_count 기반으로 간단 계산)
      // 추후 로그 테이블 연동 시 실제 성공/실패 비율로 계산
      if (stats.totalTarget > 0) {
        stats.successRate = Math.round((stats.totalContent / stats.totalTarget) * 100);
      }

      return { data: stats, error: null };
    } catch (error) {
      console.error('캠페인 통계 조회 오류:', error);
      return { data: null, error: error.message };
    }
  },

  // 대시보드용 캠페인 진행률 조회 (활성 캠페인만)
  async getCampaignProgress() {
    try {
      const {
        data: { user }
      } = await supabase.auth.getUser();
      if (!user) throw new Error('로그인이 필요합니다.');

      const { data, error } = await supabase
        .from('campaigns')
        .select('id, name, status, completed_count, quantity, progress, updated_at')
        .eq('user_id', user.id)
        .eq('status', 'active') // 활성 캠페인만 조회
        .order('updated_at', { ascending: false })
        .limit(4);

      if (error) throw error;

      // 진행률 계산 및 매핑
      const progressData = (data || []).map((campaign) => ({
        campaignId: campaign.id,
        name: campaign.name,
        progress: Math.round((campaign.completed_count / campaign.quantity) * 100) || 0,
        status: campaign.status,
        completedCount: campaign.completed_count || 0,
        totalQuantity: campaign.quantity || 0
      }));

      return { data: progressData, error: null };
    } catch (error) {
      console.error('캠페인 진행률 조회 오류:', error);
      return { data: [], error: error.message };
    }
  },

  // 대시보드용 일일 목표 달성률 조회
  async getDailyGoals() {
    try {
      const {
        data: { user }
      } = await supabase.auth.getUser();
      if (!user) throw new Error('로그인이 필요합니다.');

      // 병렬로 캠페인과 로그 데이터 조회
      const [campaignsResult, logsResult] = await Promise.all([
        supabase
          .from('campaigns')
          .select('daily_target, completed_count, quantity, status, started_at, created_at, duration')
          .eq('user_id', user.id),
        supabase.from('logs').select('created_at, status').eq('user_id', user.id)
      ]);

      if (campaignsResult.error) throw campaignsResult.error;

      const data = campaignsResult.data || [];
      const logs = logsResult.data || [];

      // 클라이언트 시간대 기준으로 오늘 날짜 계산
      const clientTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const now = new Date();

      // 현재 시간을 클라이언트 시간대로 변환하여 오늘 날짜 구하기
      const todayStr = now
        .toLocaleDateString('ko-KR', {
          timeZone: clientTimeZone,
          year: 'numeric',
          month: '2-digit',
          day: '2-digit'
        })
        .replace(/\./g, '')
        .replace(/\s/g, '')
        .replace(/(\d{4})(\d{2})(\d{2})/, '$1-$2-$3');

      // 오늘 날짜를 Date 객체로 생성 (UTC 기준)
      const today = new Date(todayStr + 'T00:00:00.000Z');

      // 기본 정보 (간소화)
      console.log('🗓️ 일일 목표 계산:', {
        timeZone: clientTimeZone,
        todayStr,
        today: today.toISOString().split('T')[0],
        currentTime: now.toLocaleString('ko-KR', { timeZone: clientTimeZone })
      });

      // 이번 주 시작일 (월요일)
      const weekStart = new Date(today);
      weekStart.setDate(today.getDate() - today.getDay() + 1);

      // 이번 달 시작일
      const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);

      // 오늘 목표 계산 (활성 캠페인들의 일일 목표 합계)
      const activeCampaigns = data.filter((c) => c.status === 'active');
      const todayTarget = activeCampaigns.reduce((sum, campaign) => sum + (campaign.daily_target || 0), 0);

      // 오늘 생성된 콘텐츠 수 계산 (logs 테이블 기반) - todayStr은 이미 위에서 계산됨

      const todayGenerated = logs.filter((log) => {
        // UTC 시간을 클라이언트 시간대로 변환하여 처리
        const utcDate = new Date(log.created_at);

        // 클라이언트의 로컬 시간대로 변환하여 날짜 추출 (위에서 정의된 clientTimeZone 사용)
        const localDateStr = utcDate
          .toLocaleDateString('ko-KR', {
            timeZone: clientTimeZone,
            year: 'numeric',
            month: '2-digit',
            day: '2-digit'
          })
          .replace(/\./g, '')
          .replace(/\s/g, '')
          .replace(/(\d{4})(\d{2})(\d{2})/, '$1-$2-$3');

        return localDateStr === todayStr && log.status === 'success';
      }).length;

      // 요약 정보만 출력
      console.log('📊 일일 목표 결과:', {
        todayGenerated,
        todayTarget,
        totalLogs: logs.length,
        successLogs: logs.filter((l) => l.status === 'success').length
      });

      // 주간 목표 계산 (실제 캠페인 스케줄 고려)
      let weeklyTarget = 0;
      let weeklyGenerated = 0;

      for (let i = 0; i < 7; i++) {
        const checkDate = new Date(weekStart);
        checkDate.setDate(weekStart.getDate() + i);
        const checkDateStr = checkDate.toISOString().split('T')[0];

        // 해당 날짜에 활성화될 캠페인들 찾기
        const activeOnDate = data.filter((campaign) => {
          if (campaign.status !== 'active') return false;

          const startDate = campaign.started_at ? new Date(campaign.started_at) : new Date(campaign.created_at);
          const endDate = new Date(startDate);
          endDate.setDate(startDate.getDate() + (campaign.duration || 0));

          return checkDate >= startDate && checkDate <= endDate;
        });

        const dayTarget = activeOnDate.reduce((sum, c) => sum + (c.daily_target || 0), 0);
        weeklyTarget += dayTarget;

        // 해당 날짜에 생성된 로그 수 (성공만) - 클라이언트 시간대 기준으로 변환
        const dayGenerated = logs.filter((log) => {
          const utcDate = new Date(log.created_at);

          // 클라이언트의 로컬 시간대로 변환하여 날짜 추출
          const localDateStr = utcDate
            .toLocaleDateString('ko-KR', {
              timeZone: clientTimeZone,
              year: 'numeric',
              month: '2-digit',
              day: '2-digit'
            })
            .replace(/\./g, '')
            .replace(/\s/g, '')
            .replace(/(\d{4})(\d{2})(\d{2})/, '$1-$2-$3');

          return localDateStr === checkDateStr && log.status === 'success';
        }).length;
        weeklyGenerated += dayGenerated;

        // 오늘 날짜인 경우만 로그 출력
        if (checkDateStr === todayStr && dayGenerated > 0) {
          console.log('📊 오늘 주간 데이터:', { dayGenerated, dayTarget });
        }
      }

      console.log('📊 주간 집계 완료:', { weeklyGenerated, weeklyTarget });

      // 월간 목표 계산 (실제 캠페인 스케줄 고려)
      let monthlyTarget = 0;
      let monthlyGenerated = 0;

      for (let i = 0; i < 30; i++) {
        const checkDate = new Date(monthStart);
        checkDate.setDate(monthStart.getDate() + i);
        const checkDateStr = checkDate.toISOString().split('T')[0];

        // 해당 날짜에 활성화될 캠페인들 찾기
        const activeOnDate = data.filter((campaign) => {
          if (campaign.status !== 'active') return false;

          const startDate = campaign.started_at ? new Date(campaign.started_at) : new Date(campaign.created_at);
          const endDate = new Date(startDate);
          endDate.setDate(startDate.getDate() + (campaign.duration || 0));

          return checkDate >= startDate && checkDate <= endDate;
        });

        const dayTarget = activeOnDate.reduce((sum, c) => sum + (c.daily_target || 0), 0);
        monthlyTarget += dayTarget;

        // 해당 날짜에 생성된 로그 수 (성공만) - 클라이언트 시간대 기준으로 변환
        const dayGenerated = logs.filter((log) => {
          const utcDate = new Date(log.created_at);

          // 클라이언트의 로컬 시간대로 변환하여 날짜 추출
          const localDateStr = utcDate
            .toLocaleDateString('ko-KR', {
              timeZone: clientTimeZone,
              year: 'numeric',
              month: '2-digit',
              day: '2-digit'
            })
            .replace(/\./g, '')
            .replace(/\s/g, '')
            .replace(/(\d{4})(\d{2})(\d{2})/, '$1-$2-$3');

          return localDateStr === checkDateStr && log.status === 'success';
        }).length;
        monthlyGenerated += dayGenerated;

        // 오늘 날짜인 경우만 로그 출력
        if (checkDateStr === todayStr && dayGenerated > 0) {
          console.log('📊 오늘 월간 데이터:', { dayGenerated, dayTarget });
        }
      }

      console.log('📊 월간 집계 완료:', { monthlyGenerated, monthlyTarget });

      // 전체 캠페인 통계도 함께 반환
      const allCampaigns = data;
      const totalTarget = allCampaigns.reduce((sum, c) => sum + (c.quantity || 0), 0);
      const totalGenerated = allCampaigns.reduce((sum, c) => sum + (c.completed_count || 0), 0);

      const goals = {
        todayGenerated,
        todayTarget,
        weeklyGenerated,
        weeklyTarget,
        monthlyGenerated,
        monthlyTarget,
        // 전체 통계 (성공률 계산용)
        totalTarget,
        totalGenerated
      };

      return { data: goals, error: null };
    } catch (error) {
      console.error('일일 목표 조회 오류:', error);
      return { data: null, error: error.message };
    }
  },

  // 통계 페이지용 상세 통계 조회 - 캐시 적용
  async getDetailedStatistics() {
    try {
      const {
        data: { user }
      } = await supabase.auth.getUser();
      if (!user) throw new Error('로그인이 필요합니다.');

      // 병렬로 캠페인 데이터와 로그 데이터 조회
      const [campaignsResult, logsResult] = await Promise.all([
        supabase
          .from('campaigns')
          .select(
            `
            id, name, status, completed_count, quantity, duration,
            created_at, started_at, completed_at, target_site, keywords,
            sites(id, name, url, status)
          `
          )
          .eq('user_id', user.id),
        supabase.from('logs').select('*').eq('user_id', user.id)
      ]);

      if (campaignsResult.error) throw campaignsResult.error;

      const campaigns = campaignsResult.data || [];
      const logs = logsResult.data || [];

      return this._processStatisticsData(campaigns, logs);
    } catch (error) {
      console.error('상세 통계 조회 오류:', error);
      return { data: null, error: error.message };
    }
  },

  // 통계 데이터 처리 로직 분리
  _processStatisticsData(campaigns, logs) {
    try {
      // 기본 통계 계산
      const totalCampaigns = campaigns.length;
      const activeCampaigns = campaigns.filter((c) => c.status === 'active').length;
      const completedCampaigns = campaigns.filter((c) => c.status === 'completed').length;
      const pausedCampaigns = campaigns.filter((c) => c.status === 'paused').length;

      // logs 테이블 기반 실제 콘텐츠 생성 통계
      const totalContentGenerated = logs.length;
      const successCount = logs.filter((l) => l.status === 'success').length;
      const failureCount = logs.filter((l) => l.status === 'failed').length;
      const successRate = totalContentGenerated > 0 ? Math.round((successCount / totalContentGenerated) * 100) : 0;

      // 캠페인별 진행률 데이터
      const campaignProgress = campaigns.map((campaign) => ({
        id: campaign.id,
        name: campaign.name,
        status: campaign.status,
        progress: campaign.quantity > 0 ? Math.round((campaign.completed_count / campaign.quantity) * 100) : 0,
        completedCount: campaign.completed_count || 0,
        totalQuantity: campaign.quantity || 0,
        duration: campaign.duration || 0, // 일일 평균 계산용
        targetSite: campaign.target_site,
        keywords: campaign.keywords || [],
        started_at: campaign.started_at,
        created_at: campaign.created_at
      }));

      // 키워드별 통계 (logs 테이블 기반)
      const keywordStats = {};
      logs.forEach((log) => {
        const keyword = log.keyword;
        if (!keywordStats[keyword]) {
          keywordStats[keyword] = {
            keyword,
            count: 0,
            successCount: 0,
            failureCount: 0,
            successRate: 0
          };
        }
        keywordStats[keyword].count += 1;
        if (log.status === 'success') {
          keywordStats[keyword].successCount += 1;
        } else if (log.status === 'failed') {
          keywordStats[keyword].failureCount += 1;
        }
      });

      // 성공률 계산
      Object.values(keywordStats).forEach((item) => {
        item.successRate = item.count > 0 ? Math.round((item.successCount / item.count) * 100) : 0;
      });

      const topKeywords = Object.values(keywordStats)
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      // 사이트별 통계 생성

      const siteStats = {};
      logs.forEach((log, index) => {
        const siteName = log.target_site;

        // 사이트별 통계 집계

        if (!siteStats[siteName]) {
          siteStats[siteName] = {
            name: siteName,
            url: siteName,
            totalPublished: 0,
            successCount: 0,
            failureCount: 0,
            successRate: 0
          };
        }
        siteStats[siteName].totalPublished += 1;
        if (log.status === 'success') {
          siteStats[siteName].successCount += 1;
        } else if (log.status === 'failed') {
          siteStats[siteName].failureCount += 1;
        }
      });

      // 사이트별 통계 완료

      // 사이트별 성공률 계산
      Object.values(siteStats).forEach((site) => {
        site.successRate = site.totalPublished > 0 ? Math.round((site.successCount / site.totalPublished) * 100) : 0;
      });

      const sitePerformance = Object.values(siteStats)
        .sort((a, b) => b.totalPublished - a.totalPublished) // 발행 개수로 정렬
        .slice(0, 3);

      return {
        data: {
          overview: {
            totalCampaigns,
            activeCampaigns,
            completedCampaigns,
            pausedCampaigns,
            totalContentGenerated,
            successRate
          },
          campaignProgress: campaignProgress.slice(0, 4), // 최대 4개
          topKeywords,
          sitePerformance,
          // 기간별 생성 추이 (logs 테이블 기반)
          dailyTrend: this.generateDailyTrendFromLogs(logs),
          successFailureRatio: {
            success: successCount,
            failure: failureCount
          }
        },
        error: null
      };

      return result;
    } catch (error) {
      console.error('통계 데이터 처리 오류:', error);
      return { data: null, error: error.message };
    }
  },

  // 일별 생성 추이 데이터 생성 (logs 테이블 기반) - 클라이언트 시간대 기준
  generateDailyTrendFromLogs(logs) {
    const trend = [];

    // 클라이언트 시간대 기준으로 오늘 날짜 계산
    const clientTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const now = new Date();

    // 현재 시간을 클라이언트 시간대로 변환하여 오늘 날짜 구하기
    const todayStr = now
      .toLocaleDateString('ko-KR', {
        timeZone: clientTimeZone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      })
      .replace(/\./g, '')
      .replace(/\s/g, '')
      .replace(/(\d{4})(\d{2})(\d{2})/, '$1-$2-$3');

    // 오늘 날짜를 Date 객체로 생성 (UTC 기준)
    const today = new Date(todayStr + 'T00:00:00.000Z');

    // 일별 트렌드 생성

    // 최근 30일간의 날짜별 통계 (오늘이 맨 오른쪽에 오도록)
    for (let i = 29; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];

      // 해당 날짜의 로그 필터링 (UTC를 클라이언트 시간대로 변환)
      const dayLogs = logs.filter((log) => {
        // UTC 시간으로 파싱 (백엔드에서 UTC로 저장됨)
        const utcDate = new Date(log.created_at);

        // 클라이언트의 로컬 시간대로 변환하여 날짜 추출
        const localDateStr = utcDate
          .toLocaleDateString('ko-KR', {
            timeZone: clientTimeZone,
            year: 'numeric',
            month: '2-digit',
            day: '2-digit'
          })
          .replace(/\./g, '')
          .replace(/\s/g, '')
          .replace(/(\d{4})(\d{2})(\d{2})/, '$1-$2-$3');

        const isMatch = localDateStr === dateStr;

        return isMatch;
      });

      const successCount = dayLogs.filter((l) => l.status === 'success').length;
      const failureCount = dayLogs.filter((l) => l.status === 'failed').length;

      trend.push({
        date: dateStr,
        success: successCount,
        failure: failureCount,
        total: dayLogs.length
      });
    }

    return trend;
  }
};
