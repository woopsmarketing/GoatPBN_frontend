// v1.1 - 사이드바 아이콘형 로고 텍스트화 (2025.11.24)
// 기능 요약: 간단한 텍스트 마크를 제공해 축소 영역에서도 일관된 브랜딩 유지
// material-ui
import { useTheme } from '@mui/material/styles';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';

// ==============================|| 아이콘형 텍스트 로고 ||============================== //

export default function LogoIcon() {
  const theme = useTheme();

  return (
    <Box
      sx={{
        width: 42,
        height: 42,
        borderRadius: 1.5,
        bgcolor: theme.palette.primary.main,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}
    >
      <Typography
        variant="subtitle1"
        component="span"
        sx={{
          fontWeight: 800,
          letterSpacing: 1,
          color: theme.palette.common.white
        }}
      >
        GP
      </Typography>
    </Box>
  );
}
