// v1.3 - 프로필 메뉴 확장: 설정/구독/사용량 진입점 및 가입일 노출 (2025.11.20)
// 용도 요약: 헤더 프로필 버튼에서 사용자 환경설정, 구독 관리, 사용량 대시보드로 빠르게 이동
import { useEffect, useRef, useState } from 'react';

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
const FALLBACK_AVATAR = '/assets/images/users/avatar-6.png';
import { Logout, Setting2, Card, Activity } from '@wandersonalwes/iconsax-react';

// libs
import { authAPI } from '@/lib/supabase';
import { formatToUserTimeZone } from '@/lib/utils/userTimeZone';
import { getLocaleBasePath } from '@/utils/getLocaleBasePath';

export default function ProfilePage() {
  const router = useRouter();
  const pathname = usePathname();
  const user = useUser();

  const anchorRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [joinDate, setJoinDate] = useState(null);
  const [supabaseEmail, setSupabaseEmail] = useState('');
  const [supabaseAvatar, setSupabaseAvatar] = useState('');
  const [loadingProfile, setLoadingProfile] = useState(true);

  useEffect(() => {
    let isMounted = true;

    authAPI
      .getCurrentUser()
      .then(({ data, error }) => {
        if (!isMounted) return;
        if (error) {
          console.error('프로필 정보 로드 실패:', error);
          return;
        }
        if (data?.user) {
          setJoinDate(data.user.created_at ?? null);
          setSupabaseEmail(data.user.email ?? '');
          const meta = data.user.user_metadata || {};
          setSupabaseAvatar(meta.avatar_url || meta.picture || '');
        }
      })
      .finally(() => {
        if (isMounted) {
          setLoadingProfile(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

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
    const loginBasePath = getLocaleBasePath(pathname);
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

  const localeBasePath = getLocaleBasePath(pathname);

  const handleNavigate = (url) => {
    setOpen(false);
    router.push(url);
  };

  const isEnglishLocale = localeBasePath.startsWith('/en');

  const profileMenuItems = [
    {
      key: 'settings',
      icon: <Setting2 variant="Bulk" />,
      primary: isEnglishLocale ? 'Settings' : '설정',
      secondary: isEnglishLocale ? 'Timezone and region settings' : '시간대 및 지역 설정',
      href: `${localeBasePath}/settings`
    },
    {
      key: 'subscription',
      icon: <Card variant="Bulk" />,
      primary: isEnglishLocale ? 'Subscription' : '구독 관리',
      secondary: isEnglishLocale ? 'View current plan and billing' : '현재 플랜 및 결제 내역',
      href: `${localeBasePath}/subscription`
    },
    {
      key: 'usage',
      icon: <Activity variant="Bulk" />,
      primary: isEnglishLocale ? 'Usage dashboard' : '사용량 대시보드',
      secondary: isEnglishLocale ? 'Check credit consumption' : '크레딧 사용 현황 확인',
      href: `${localeBasePath}/usage`
    }
  ];

  const joinedAtLabel =
    joinDate && !loadingProfile
      ? formatToUserTimeZone(joinDate, { year: 'numeric', month: 'long', day: 'numeric' }, isEnglishLocale ? 'en-US' : undefined)
      : isEnglishLocale
        ? 'Loading info...'
        : '정보 준비 중';

  const displayEmail = user?.email || supabaseEmail || '멤버';
  const displayAvatar = user?.avatar || supabaseAvatar || FALLBACK_AVATAR;

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
        <Avatar alt="profile user" src={displayAvatar} />
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
                          <Avatar alt="profile user" src={displayAvatar} />
                          <Stack>
                            <Typography variant="subtitle1">{user ? user?.name : ''}</Typography>
                            <Typography variant="body2" color="secondary">
                              {displayEmail}
                            </Typography>
                          </Stack>
                        </Stack>
                      </Grid>
                      <Grid>
                        <Tooltip title="로그아웃">
                          <IconButton size="large" color="error" sx={{ p: 1 }} onClick={handleLogout}>
                            <Logout variant="Bulk" />
                          </IconButton>
                        </Tooltip>
                      </Grid>
                    </Grid>
                  </CardContent>
                  <Divider />
                  <Box sx={{ px: 2.5, py: 2 }}>
                    <Typography variant="caption" color="secondary">
                      {isEnglishLocale ? 'Joined' : '가입일'}
                    </Typography>
                    <Typography variant="body2" sx={{ mt: 0.5 }}>
                      {joinedAtLabel}
                    </Typography>
                  </Box>
                  <Divider />
                  <List disablePadding>
                    {profileMenuItems.map((item) => (
                      <ListItem disablePadding key={item.key}>
                        <ListItemButton onClick={() => handleNavigate(item.href)} sx={{ gap: 1.5, alignItems: 'flex-start', py: 1.25 }}>
                          <ListItemIcon sx={{ mt: 0.25, minWidth: 36, color: 'secondary.main' }}>{item.icon}</ListItemIcon>
                          <ListItemText
                            primary={item.primary}
                            secondary={item.secondary}
                            primaryTypographyProps={{ variant: 'body1', fontWeight: 600 }}
                            secondaryTypographyProps={{ variant: 'caption', color: 'secondary' }}
                          />
                        </ListItemButton>
                      </ListItem>
                    ))}
                    <Divider component="li" />
                    <ListItem disablePadding>
                      <ListItemButton onClick={handleLogout}>
                        <ListItemIcon>
                          <Logout variant="Bulk" />
                        </ListItemIcon>
                        <ListItemText primary={isEnglishLocale ? 'Log out' : '로그아웃'} />
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
