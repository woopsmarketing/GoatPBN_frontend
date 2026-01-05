// v1.1 - GOATPBN 맞춤 빠른 메뉴로 리브랜딩 (2025.11.24)
// 기능 요약: 컴포넌트 데모 대신 대시보드 핵심 흐름으로 이동하는 심플한 퀵 메뉴 제공
import { useMemo, useRef, useState } from 'react';

// next
import Link from 'next/link';
import { usePathname } from 'next/navigation';

// material-ui
import Box from '@mui/material/Box';
import ClickAwayListener from '@mui/material/ClickAwayListener';
import List from '@mui/material/List';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import Paper from '@mui/material/Paper';
import Popper from '@mui/material/Popper';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

// project-imports
import IconButton from 'components/@extended/IconButton';
import Transitions from 'components/@extended/Transitions';
import MainCard from 'components/MainCard';
import { getLocaleBasePath } from '@/utils/getLocaleBasePath';

// assets
import { Category2, PlayCircle, Graph, DocumentText, ShieldTick } from '@wandersonalwes/iconsax-react';

// ==============================|| HEADER CONTENT - MEGA MENU SECTION ||============================== //

export default function MegaMenuSection() {
  const anchorRef = useRef(null);
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const localeBasePath = useMemo(() => getLocaleBasePath(pathname), [pathname]);

  const quickLinks = useMemo(() => {
    const isEnglish = localeBasePath.startsWith('/en');
    return [
      {
        icon: <PlayCircle size={20} />,
        label: isEnglish ? 'Start campaign' : '캠페인 시작',
        description: isEnglish ? 'Create a campaign and lock in the publishing schedule.' : '새 캠페인을 생성하고 자동 게시 일정을 잡아요.',
        href: `${localeBasePath}/campaigns/create`
      },
      {
        icon: <Graph size={20} />,
        label: isEnglish ? 'Performance stats' : '성과 통계',
        description: isEnglish ? 'Review campaign progress and success rates at a glance.' : '캠페인별 진행률과 성공률을 한눈에 확인해요.',
        href: `${localeBasePath}/statistics`
      },
      {
        icon: <DocumentText size={20} />,
        label: isEnglish ? 'Report center' : '보고서 센터',
        description: isEnglish ? 'Download or share reports for completed campaigns.' : '완료된 캠페인의 리포트를 다운로드하거나 공유해요.',
        href: `${localeBasePath}/reports`
      },
      {
        icon: <ShieldTick size={20} />,
        label: isEnglish ? 'Site management' : '사이트 관리',
        description: isEnglish ? 'Check WordPress connection health and permissions.' : '워드프레스 사이트 연결 상태와 권한을 점검해요.',
        href: `${localeBasePath}/sites/add`
      }
    ];
  }, [localeBasePath]);

  const handleToggle = () => {
    setOpen((prevOpen) => !prevOpen);
  };

  const handleClose = (event) => {
    if (anchorRef.current && anchorRef.current.contains(event.target)) {
      return;
    }
    setOpen(false);
  };

  return (
    <Box sx={{ flexShrink: 0, ml: 0.75 }}>
      <IconButton
        color="secondary"
        variant="light"
        aria-label="open quick navigation"
        ref={anchorRef}
        aria-controls={open ? 'goatpbn-quick-menu' : undefined}
        aria-haspopup="true"
        onClick={handleToggle}
        size="large"
        sx={(theme) => ({
          p: 1,
          ml: { xs: 0, lg: -2 },
          color: 'secondary.main',
          bgcolor: open ? 'secondary.200' : 'secondary.100',
          ...theme.applyStyles('dark', { bgcolor: open ? 'background.paper' : 'background.default' })
        })}
      >
        <Category2 variant="Bulk" />
      </IconButton>
      <Popper
        placement="bottom"
        id="goatpbn-quick-menu"
        open={open}
        anchorEl={anchorRef.current}
        role={undefined}
        transition
        disablePortal
        popperOptions={{
          modifiers: [
            {
              name: 'offset',
              options: {
                offset: [-20, 12]
              }
            }
          ]
        }}
      >
        {({ TransitionProps }) => (
          <Transitions type="grow" position="top" in={open} {...TransitionProps}>
            <Paper sx={(theme) => ({ boxShadow: theme.customShadows.z1, borderRadius: 1.5, minWidth: 360, maxWidth: 420 })}>
              <ClickAwayListener onClickAway={handleClose}>
                <MainCard elevation={0} border={false} content={false}>
                  <Stack sx={{ p: 3, gap: 2 }}>
                    <Box>
                      <Typography variant="h5">{isEnglish ? 'Quick navigation' : '빠른 이동'}</Typography>
                      <Typography variant="body2" color="text.secondary">
                        {isEnglish
                          ? 'Jump to frequently used tasks and manage campaigns faster.'
                          : '자주 사용하는 기능으로 바로 이동해 캠페인을 더 빠르게 관리하세요.'}
                      </Typography>
                    </Box>
                    <List disablePadding>
                      {quickLinks.map((item) => (
                        <ListItemButton
                          key={item.href}
                          component={Link}
                          href={item.href}
                          onClick={handleClose}
                          sx={(theme) => ({
                            mb: 1.5,
                            border: `1px solid ${theme.palette.divider}`,
                            borderRadius: 1.5,
                            alignItems: 'flex-start',
                            '&:hover': { bgcolor: 'primary.lighter', borderColor: 'primary.light' }
                          })}
                        >
                          <ListItemIcon
                            sx={(theme) => ({
                              mt: 0.5,
                              minWidth: 40,
                              color: 'primary.main',
                              ...theme.applyStyles('dark', { color: 'primary.light' })
                            })}
                          >
                            {item.icon}
                          </ListItemIcon>
                          <ListItemText
                            primary={
                              <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                                {item.label}
                              </Typography>
                            }
                            secondary={
                              <Typography variant="body2" color="text.secondary">
                                {item.description}
                              </Typography>
                            }
                          />
                        </ListItemButton>
                      ))}
                    </List>
                  </Stack>
                </MainCard>
              </ClickAwayListener>
            </Paper>
          </Transitions>
        )}
      </Popper>
    </Box>
  );
}
