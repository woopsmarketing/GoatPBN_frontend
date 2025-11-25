// v1.1 - GOATPBN 텍스트 브랜딩 로고 적용 (2025.11.24)
// 기능 요약: 기존 Able 로고 SVG를 제거하고 텍스트 기반 브랜드 표시로 교체
import PropTypes from 'prop-types';
// material-ui
import { useTheme } from '@mui/material/styles';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';

// ==============================|| 텍스트 기반 브랜드 로고 ||============================== //

export default function LogoMain({ reverse }) {
  const theme = useTheme();

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'baseline',
        gap: 0.5,
        lineHeight: 1,
        color: reverse ? theme.palette.common.white : theme.palette.text.primary
      }}
    >
      <Typography
        variant="h5"
        component="span"
        sx={{
          fontWeight: 800,
          letterSpacing: 1,
          color: theme.palette.primary.main
        }}
      >
        GOAT
      </Typography>
      <Typography
        variant="subtitle1"
        component="span"
        sx={{
          fontWeight: 700,
          textTransform: 'uppercase',
          color: reverse ? theme.palette.primary.lighter : theme.palette.primary.dark
        }}
      >
        PBN
      </Typography>
    </Box>
  );
}

LogoMain.propTypes = { reverse: PropTypes.bool };
