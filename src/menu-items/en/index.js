// v1.0 - 영문 전용 좌측 메뉴 구성 (2025.11.13)
// 기능 요약: /en 경로에서 사용할 메뉴 그룹 정의
// 사용 예시: import menuItemsEn from 'menu-items/en';

import pbnDashboardEn from './pbn-dashboard';
import individualToolsEn from './individual-tools';

const menuItemsEn = {
  items: [pbnDashboardEn, individualToolsEn]
};

export default menuItemsEn;
