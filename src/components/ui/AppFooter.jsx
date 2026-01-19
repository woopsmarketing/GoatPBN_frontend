// v1.0 - 전역 푸터 문구 적용 (2026-01-19)
// 기능 요약: 모든 페이지 하단에 사업자 정보/저작권 문구를 표시합니다.
// 사용 예시: <AppFooter />

// material-ui
import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

// ==============================|| GLOBAL FOOTER ||============================== //

export default function AppFooter() {
  return (
    <Box component="footer" sx={{ borderTop: '1px solid', borderColor: 'divider', bgcolor: 'transparent', mt: 'auto' }}>
      <Container sx={{ py: { xs: 3, sm: 4 } }}>
        <Stack spacing={0.6} sx={{ color: 'text.secondary' }}>
          {/* 회사 정보 */}
          <Typography variant="body2">회사명 : 제로버블솔루션 | ZEROBUBBLESOLUTION</Typography>
          {/* 사업자 정보 */}
          <Typography variant="body2">사업자번호 : 517-11-03160</Typography>
          {/* 통신판매업 신고 정보 */}
          <Typography variant="body2">통신판매업신고 2025-대구남구-0558</Typography>
          {/* 저작권 문구 */}
          <Typography variant="caption">© 2026 GOATPBN. All rights reserved.</Typography>
        </Stack>
      </Container>
    </Box>
  );
}
