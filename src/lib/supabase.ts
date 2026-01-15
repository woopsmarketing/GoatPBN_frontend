// v1.1 - TS에서 JS supabase 모듈을 재사용하기 위한 래퍼 (2026.01.15)
// 기능 요약: supabase.js를 타입스크립트 파일에서 안전하게 import할 수 있도록 재노출
// 사용 예시: import { supabase, authAPI } from '@/lib/supabase';

// 한글 주석: JS 모듈을 TS에서 안전하게 사용하기 위해 any로 감싸서 내보냅니다.
// @ts-ignore - JS 모듈 타입 선언 부재로 인한 경고 무시
import * as supabaseModule from './supabase.js';

export const supabase = supabaseModule.supabase;
export const authAPI = supabaseModule.authAPI;
export const dbAPI = supabaseModule.dbAPI;
export const realtimeAPI = supabaseModule.realtimeAPI;
export const notificationAPI = supabaseModule.notificationAPI;
