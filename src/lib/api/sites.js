// src/lib/api/sites.js
// 한글 주석: 사이트 관리 API 함수들
// 목적: Supabase를 사용한 사이트 CRUD 작업 및 WordPress 연결 테스트

import { supabase } from '../supabase';

// 사이트 API 함수들
export const sitesAPI = {
  // 모든 사이트 조회 (현재 사용자의 사이트만)
  async getSites() {
    try {
      const {
        data: { user }
      } = await supabase.auth.getUser();

      if (!user) {
        throw new Error('로그인이 필요합니다.');
      }

      const { data, error } = await supabase.from('sites').select('*').eq('user_id', user.id).order('created_at', { ascending: false });

      if (error) throw error;
      return { success: true, data, error: null };
    } catch (error) {
      console.error('사이트 조회 오류:', error);
      return { success: false, data: null, error: error.message };
    }
  },

  // 새 사이트 추가
  async createSite(siteData) {
    try {
      const {
        data: { user }
      } = await supabase.auth.getUser();
      if (!user) throw new Error('로그인이 필요합니다.');

      const { data, error } = await supabase
        .from('sites')
        .insert([
          {
            user_id: user.id,
            name: siteData.name,
            url: siteData.url,
            username: siteData.username,
            password: siteData.password,
            app_password: siteData.app_password,
            status: siteData.status || 'disconnected',
            last_check: new Date().toISOString()
          }
        ])
        .select()
        .single();

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      console.error('사이트 생성 오류:', error);
      return { data: null, error: error.message };
    }
  },

  // 사이트 수정
  async updateSite(siteId, siteData) {
    try {
      const {
        data: { user }
      } = await supabase.auth.getUser();
      if (!user) throw new Error('로그인이 필요합니다.');

      const { data, error } = await supabase
        .from('sites')
        .update({
          name: siteData.name,
          url: siteData.url,
          username: siteData.username,
          password: siteData.password,
          app_password: siteData.app_password,
          status: siteData.status,
          last_check: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', siteId)
        .eq('user_id', user.id) // 보안: 사용자 본인의 사이트만 수정 가능
        .select()
        .single();

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      console.error('사이트 수정 오류:', error);
      return { data: null, error: error.message };
    }
  },

  // 사이트 삭제
  async deleteSite(siteId) {
    try {
      const {
        data: { user }
      } = await supabase.auth.getUser();
      if (!user) throw new Error('로그인이 필요합니다.');

      const { error } = await supabase.from('sites').delete().eq('id', siteId).eq('user_id', user.id); // 보안: 사용자 본인의 사이트만 삭제 가능

      if (error) throw error;
      return { data: { success: true }, error: null };
    } catch (error) {
      console.error('사이트 삭제 오류:', error);
      return { data: null, error: error.message };
    }
  },

  // WordPress 연결 테스트
  async testConnection(siteData) {
    try {
      // 실제 WordPress REST API 연결 테스트
      const testUrl = `https://${siteData.url}/wp-json/wp/v2/users/me`;
      const credentials = btoa(`${siteData.username}:${siteData.app_password.replace(/\s/g, '')}`);

      const response = await fetch(testUrl, {
        method: 'GET',
        headers: {
          Authorization: `Basic ${credentials}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        return {
          data: { success: true, message: 'WordPress 연결 성공!' },
          error: null
        };
      } else {
        return {
          data: { success: false, message: `연결 실패: ${response.status} ${response.statusText}` },
          error: null
        };
      }
    } catch (error) {
      console.error('WordPress 연결 테스트 오류:', error);
      return {
        data: { success: false, message: '연결 테스트 중 오류가 발생했습니다.' },
        error: error.message
      };
    }
  },

  // 사이트 연결 상태 새로고침
  async refreshConnection(siteId) {
    try {
      const {
        data: { user }
      } = await supabase.auth.getUser();
      if (!user) throw new Error('로그인이 필요합니다.');

      // 사이트 정보 조회
      const { data: site, error: fetchError } = await supabase.from('sites').select('*').eq('id', siteId).eq('user_id', user.id).single();

      if (fetchError) throw fetchError;

      // 연결 테스트 수행
      const connectionTest = await this.testConnection(site);

      // 연결 상태 업데이트
      const { data, error } = await supabase
        .from('sites')
        .update({
          status: connectionTest.data.success ? 'connected' : 'disconnected',
          last_check: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', siteId)
        .eq('user_id', user.id)
        .select()
        .single();

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      console.error('연결 상태 새로고침 오류:', error);
      return { data: null, error: error.message };
    }
  },

  // 대시보드용 사이트 통계 조회
  async getSitesStats() {
    try {
      const {
        data: { user }
      } = await supabase.auth.getUser();
      if (!user) throw new Error('로그인이 필요합니다.');

      const { data, error } = await supabase.from('sites').select('status').eq('user_id', user.id);

      if (error) throw error;

      // 사이트 통계 계산
      const stats = {
        total: data.length,
        connected: data.filter((s) => s.status === 'connected').length,
        disconnected: data.filter((s) => s.status === 'disconnected').length,
        error: data.filter((s) => s.status === 'error').length
      };

      return { data: stats, error: null };
    } catch (error) {
      console.error('사이트 통계 조회 오류:', error);
      return { data: null, error: error.message };
    }
  },

  // 전체 사이트 연결 점검 (수동)
  async checkAllSitesConnection() {
    try {
      const {
        data: { user }
      } = await supabase.auth.getUser();
      if (!user) throw new Error('로그인이 필요합니다.');

      // 모든 사이트 조회
      const { data: sites, error: fetchError } = await supabase
        .from('sites')
        .select('id, name, url, username, password, app_password')
        .eq('user_id', user.id);

      if (fetchError) throw fetchError;

      const results = [];
      const startTime = Date.now();

      // 각 사이트별 연결 테스트
      for (const site of sites) {
        try {
          // TODO: 실제 WordPress REST API 연결 테스트 구현
          // 현재는 시뮬레이션
          const testResult = await this.testSiteConnection(site);
          results.push({
            siteId: site.id,
            siteName: site.name,
            url: site.url,
            status: testResult.success ? 'connected' : 'error',
            responseTime: testResult.responseTime,
            errorMessage: testResult.errorMessage
          });

          // 데이터베이스 상태 업데이트
          await supabase
            .from('sites')
            .update({
              status: testResult.success ? 'connected' : 'error',
              last_check: new Date().toISOString()
            })
            .eq('id', site.id);
        } catch (error) {
          results.push({
            siteId: site.id,
            siteName: site.name,
            url: site.url,
            status: 'error',
            responseTime: 0,
            errorMessage: error.message
          });
        }
      }

      const totalTime = Date.now() - startTime;
      const successCount = results.filter((r) => r.status === 'connected').length;

      return {
        data: {
          results,
          summary: {
            total: sites.length,
            connected: successCount,
            error: sites.length - successCount,
            totalTime: totalTime
          }
        },
        error: null
      };
    } catch (error) {
      console.error('전체 사이트 연결 점검 오류:', error);
      return { data: null, error: error.message };
    }
  },

  // 개별 사이트 연결 테스트 (시뮬레이션)
  async testSiteConnection(site) {
    // TODO: 실제 WordPress REST API 연결 테스트 구현
    // 현재는 시뮬레이션으로 랜덤 결과 반환

    return new Promise((resolve) => {
      setTimeout(
        () => {
          const isSuccess = Math.random() > 0.2; // 80% 성공률
          resolve({
            success: isSuccess,
            responseTime: Math.floor(Math.random() * 500) + 100, // 100-600ms
            errorMessage: isSuccess ? null : 'WordPress API 연결 실패'
          });
        },
        Math.floor(Math.random() * 1000) + 500
      ); // 500-1500ms 시뮬레이션
    });
  }
};
