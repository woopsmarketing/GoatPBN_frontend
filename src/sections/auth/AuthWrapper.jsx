// v1.0 - 인증 화면 푸터 추가 (2026-01-19)
// 기능 요약: 로그인/회원가입 화면 하단에 공통 푸터를 표시합니다.

import PropTypes from 'prop-types';

// material-ui
import Grid from '@mui/material/Grid';
import Box from '@mui/material/Box';

// project-imports
import AuthCard from './AuthCard';
import AppFooter from 'components/ui/AppFooter';

// assets
import AuthBackground from '../../../public/assets/images/auth/AuthBackground';

// ==============================|| AUTHENTICATION - WRAPPER ||============================== //

export default function AuthWrapper({ children }) {
  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <AuthBackground />
      <Grid container direction="column" sx={{ justifyContent: 'center', minHeight: '100vh' }}>
        <Grid size={12}>
          <Grid
            size={12}
            container
            sx={{
              justifyContent: 'center',
              alignItems: 'center',
              minHeight: { xs: 'calc(100vh - 210px)', sm: 'calc(100vh - 134px)', md: 'calc(100vh - 112px)' }
            }}
          >
            <Grid>
              <AuthCard>{children}</AuthCard>
            </Grid>
          </Grid>
        </Grid>
      </Grid>
      {/* 인증 페이지 하단 공통 푸터 */}
      <AppFooter />
    </Box>
  );
}

AuthWrapper.propTypes = { children: PropTypes.node };
