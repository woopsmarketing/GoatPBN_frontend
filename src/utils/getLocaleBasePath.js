/**
 * 현재 경로에서 locale prefix(/ko, /en 등)를 추출합니다.
 * 기본값은 영어(/en)로 유지하여 기존 라우팅과 호환하도록 합니다.
 */
export function getLocaleBasePath(pathname) {
  if (!pathname) return '/en';
  if (pathname.startsWith('/ko')) return '/ko';
  if (pathname.startsWith('/en')) return '/en';
  return '/en';
}
