// v1.1 - TS에서 JS supabase 모듈을 재사용하기 위한 래퍼 (2026.01.15)
// 기능 요약: supabase.js를 타입스크립트 파일에서 안전하게 import할 수 있도록 재노출
// 사용 예시: import { supabase, authAPI } from '@/lib/supabase';

// 한글 주석: JS 모듈을 TS에서 안전하게 사용하기 위해 any로 감싸서 내보냅니다.
// @ts-ignore - JS 모듈 타입 선언 부재로 인한 경고 무시
import * as supabaseModule from './supabase.js';

// 한글 주석: JS 모듈 타입이 없어도 빌드가 통과하도록 명시적 any 타입을 부여합니다.
export const supabase: any = supabaseModule.supabase;
export const authAPI: any = supabaseModule.authAPI;
export const dbAPI: any = supabaseModule.dbAPI;
export const realtimeAPI: any = supabaseModule.realtimeAPI;
export const notificationAPI: any = supabaseModule.notificationAPI;
