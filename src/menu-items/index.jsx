// v1.1 - 좌측 메뉴 불필요한 그룹 제거 (2025.11.12)

// project-imports
import pbnDashboard from './pbn-dashboard';
import individualTools from './individual-tools';

// ==============================|| MENU ITEMS ||============================== //

const menuItems = {
  // ✅ 대시보드 관련 핵심 메뉴만 노출
  items: [pbnDashboard, individualTools]
};

export default menuItems;
