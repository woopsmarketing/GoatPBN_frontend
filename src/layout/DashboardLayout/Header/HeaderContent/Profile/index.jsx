// v1.2 - 프로필 메뉴 Supabase 로그아웃 및 단순화 (2025.11.19)
// 용도 요약: 헤더 프로필 버튼에서 간단한 사용자 정보와 로그아웃 기능 제공
import { useRef, useState } from 'react';

// next
import { usePathname, useRouter } from 'next/navigation';

// material-ui
import ButtonBase from '@mui/material/ButtonBase';
import CardContent from '@mui/material/CardContent';
import ClickAwayListener from '@mui/material/ClickAwayListener';
import Divider from '@mui/material/Divider';
import Grid from '@mui/material/Grid';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemAvatar from '@mui/material/ListItemAvatar';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import Paper from '@mui/material/Paper';
import Popper from '@mui/material/Popper';
import Stack from '@mui/material/Stack';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';

// project-imports
import Avatar from 'components/@extended/Avatar';
import IconButton from 'components/@extended/IconButton';
import Transitions from 'components/@extended/Transitions';
import MainCard from 'components/MainCard';
import useUser from 'hooks/useUser';

// assets & icons
const avatar1 = '/assets/images/users/avatar-6.png';
import { Logout, Profile } from '@wandersonalwes/iconsax-react';

// libs
import { authAPI } from '@/lib/supabase';

// 한글 주석: 현재 경로를 기반으로 로그인 페이지 베이스 경로 계산
const resolveLoginBasePath = (pathname) => {
  if (!pathname) return '/en';
  if (pathname.startsWith('/ko')) return '/ko';
  if (pathname.startsWith('/en')) return '/en';
  return '/en';
};

export default function ProfilePage() {
  const router = useRouter();
  const pathname = usePathname();
  const user = useUser();

  const anchorRef = useRef(null);
  const [open, setOpen] = useState(false);

  const handleToggle = () => {
    setOpen((prevOpen) => !prevOpen);
  };

  const handleClose = (event) => {
    if (anchorRef.current && anchorRef.current.contains(event.target)) {
      return;
    }
    setOpen(false);
  };

  const handleLogout = async () => {
    const loginBasePath = resolveLoginBasePath(pathname);
    try {
      // 한글 주석: Supabase 세션을 먼저 종료
      await authAPI.signOut();
    } catch (error) {
      console.error('로그아웃 오류:', error);
      alert('로그아웃 처리 중 문제가 발생했습니다. 다시 시도해주세요.');
    } finally {
      // 한글 주석: 세션 종료 후 locale 기반 로그인 페이지로 이동
      router.replace(loginBasePath);
      setOpen(false);
    }
  };

  return (
    <Box sx={{ flexShrink: 0, ml: 0.75 }}>
      <ButtonBase
        sx={(theme) => ({
          p: 0.25,
          borderRadius: 1,
          '&:hover': { bgcolor: 'secondary.lighter', ...theme.applyStyles('dark', { bgcolor: 'secondary.light' }) },
          '&:focus-visible': {
            outline: `2px solid ${theme.palette.secondary.dark}`,
            outlineOffset: 2
          }
        })}
        aria-label="open profile"
        ref={anchorRef}
        aria-controls={open ? 'profile-grow' : undefined}
        aria-haspopup="true"
        onClick={handleToggle}
      >
        <Avatar alt="profile user" src={avatar1} />
      </ButtonBase>
      <Popper
        placement="bottom-end"
        open={open}
        anchorEl={anchorRef.current}
        role={undefined}
        transition
        disablePortal
        popperOptions={{ modifiers: [{ name: 'offset', options: { offset: [0, 9] } }] }}
      >
        {({ TransitionProps }) => (
          <Transitions type="grow" position="top-right" in={open} {...TransitionProps}>
            <Paper
              sx={(theme) => ({
                boxShadow: theme.customShadows.z1,
                width: 280,
                minWidth: 240,
                maxWidth: 280,
                [theme.breakpoints.down('md')]: { maxWidth: 240 },
                borderRadius: 1.5
              })}
            >
              <ClickAwayListener onClickAway={handleClose}>
                <MainCard border={false} content={false}>
                  <CardContent sx={{ px: 2.5, pt: 3, pb: 2 }}>
                    <Grid container sx={{ justifyContent: 'space-between', alignItems: 'center' }}>
                      <Grid>
                        <Stack direction="row" sx={{ gap: 1.25, alignItems: 'center' }}>
                          <Avatar alt="profile user" src={avatar1} />
                          <Stack>
                            <Typography variant="subtitle1">{user ? user?.name : ''}</Typography>
                            <Typography variant="body2" color="secondary">
                              {user?.email ?? '멤버'}
                            </Typography>
                          </Stack>
                        </Stack>
                      </Grid>
                      <Grid>
                        <Tooltip title="Logout">
                          <IconButton size="large" color="error" sx={{ p: 1 }} onClick={handleLogout}>
                            <Logout variant="Bulk" />
                          </IconButton>
                        </Tooltip>
                      </Grid>
                    </Grid>
                  </CardContent>
                  <Divider />
                  <List disablePadding>
                    <ListItem>
                      <ListItemIcon>
                        <Profile variant="Bulk" />
                      </ListItemIcon>
                      <ListItemText primary="프로필 관리 (준비중)" secondary="곧 업데이트될 예정입니다." />
                    </ListItem>
                    <Divider component="li" />
                    <ListItem disablePadding>
                      <ListItemButton onClick={handleLogout}>
                        <ListItemIcon>
                          <Logout variant="Bulk" />
                        </ListItemIcon>
                        <ListItemText primary="로그아웃" />
                      </ListItemButton>
                    </ListItem>
                  </List>
                </MainCard>
              </ClickAwayListener>
            </Paper>
          </Transitions>
        )}
      </Popper>
    </Box>
  );
}
