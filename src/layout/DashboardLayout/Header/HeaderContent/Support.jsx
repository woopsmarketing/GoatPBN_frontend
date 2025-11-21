'use client';

// v1.1 - 상단 헤더 지원 센터 버튼 구조 정리 및 내부 도움말 페이지 연결 (2025.11.21)
// 목적: 중복 아이콘을 제거하고 신규 도움말 & 문의하기 페이지로 이동할 수 있는 단일 진입점 제공

import Tooltip from '@mui/material/Tooltip';
import Box from '@mui/material/Box';

import IconButton from 'components/@extended/IconButton';

import NextLink from 'next/link';
import { usePathname } from 'next/navigation';

import { I24Support } from '@wandersonalwes/iconsax-react';

import { getLocaleBasePath } from '@/utils/getLocaleBasePath';

export default function Support() {
  // 한글 주석: 현재 경로의 locale prefix를 추출하여 다국어 라우팅과 연동
  const pathname = usePathname();
  const localeBasePath = getLocaleBasePath(pathname);
  const helpHref = `${localeBasePath}/help`;

  return (
    <Box sx={{ flexShrink: 0, ml: 0.75, display: 'flex', gap: 0.75 }}>
      <Tooltip title="도움말 & 문의하기" arrow>
        <IconButton
          color="secondary"
          variant="outlined"
          component={NextLink}
          href={helpHref}
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
