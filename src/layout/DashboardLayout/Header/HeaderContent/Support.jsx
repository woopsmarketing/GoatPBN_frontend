'use client';

// v1.0 - 상단 헤더 지원 센터 버튼 (2025.11.20)
// 목적: 사용자가 빠르게 지원 채널(이메일/가이드)로 이동할 수 있도록 돕는 아이콘 버튼

import Tooltip from '@mui/material/Tooltip';
import Box from '@mui/material/Box';

import IconButton from 'components/@extended/IconButton';

import { I24Support } from '@wandersonalwes/iconsax-react';

const SUPPORT_MAIL = 'mailto:support@pbnsaas.com';
const SUPPORT_DOCS = 'https://totoggong.com/contact'; // TODO: 정식 지원 페이지로 교체 예정

export default function Support() {
  return (
    <Box sx={{ flexShrink: 0, ml: 0.75, display: 'flex', gap: 0.75 }}>
      <Tooltip title="지원센터 문의하기 (이메일)" arrow>
        <IconButton
          color="secondary"
          variant="light"
          component="a"
          href={SUPPORT_MAIL}
          size="large"
          sx={(theme) => ({
            p: 1,
            color: 'secondary.main',
            bgcolor: 'secondary.100',
            ...theme.applyStyles('dark', { bgcolor: 'background.default' })
          })}
        >
          <I24Support />
        </IconButton>
      </Tooltip>
      <Tooltip title="도움말 & 온보딩 가이드" arrow>
        <IconButton
          color="secondary"
          variant="outlined"
          component="a"
          href={SUPPORT_DOCS}
          target="_blank"
          rel="noopener noreferrer"
          size="large"
          sx={(theme) => ({
            p: 1,
            color: 'secondary.main',
            borderColor: 'secondary.200',
            ...theme.applyStyles('dark', { borderColor: 'secondary.800', color: 'secondary.light' })
          })}
        >
          <I24Support variant="Outline" />
        </IconButton>
      </Tooltip>
    </Box>
  );
}

