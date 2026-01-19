// v1.0 - 공용 푸터 문구 교체 (2026-01-19)
// 기능 요약: 로그인/랜딩 등 심플 레이아웃 하단에 공통 푸터를 표시합니다.

import PropTypes from 'prop-types';

// project-imports
import AppFooter from 'components/ui/AppFooter';

// ==============================|| LANDING - FOOTER PAGE ||============================== //

export default function FooterBlock() {
  return <AppFooter />;
}

FooterBlock.propTypes = { isFull: PropTypes.bool };
