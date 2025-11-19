// v1.2 - 사이드바 사용자 메뉴 Supabase 로그아웃 연동 (2025.11.19)
// 용도 요약: 드로어 하단 사용자 영역에서 단순한 로그아웃 메뉴 제공
import { useState } from 'react';

// next
import { usePathname, useRouter } from 'next/navigation';

// material-ui
import { styled } from '@mui/material/styles';
import IconButton from '@mui/material/IconButton';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemAvatar from '@mui/material/ListItemAvatar';
import ListItemText from '@mui/material/ListItemText';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import Box from '@mui/material/Box';

// project-imports
import { useGetMenuMaster } from 'api/menu';
import Avatar from 'components/@extended/Avatar';
import useUser from 'hooks/useUser';

// assets & icons
import { ArrowRight2, Logout } from '@wandersonalwes/iconsax-react';
import { authAPI } from '@/lib/supabase';

const avatar1 = '/assets/images/users/avatar-6.png';

const ExpandMore = styled(IconButton, {
  shouldForwardProp: (prop) => prop !== 'theme' && prop !== 'expand' && prop !== 'drawerOpen'
})(({ theme, expand, drawerOpen }) => ({
  transform: !expand ? 'rotate(0deg)' : 'rotate(-90deg)',
  marginLeft: 'auto',
  color: theme.palette.secondary.dark,
  transition: theme.transitions.create('transform', {
    duration: theme.transitions.duration.shortest
  }),
  ...(!drawerOpen && { opacity: 0, width: 50, height: 50 })
}));

// 한글 주석: 현재 경로에서 locale 정보를 확인해 로그인 페이지 경로를 계산
const resolveLoginBasePath = (pathname) => {
  if (!pathname) return '/en';
  if (pathname.startsWith('/ko')) return '/ko';
  if (pathname.startsWith('/en')) return '/en';
  return '/en';
};

// ==============================|| LIST - USER ||============================== //

export default function UserList() {
  const router = useRouter();
  const pathname = usePathname();
  const user = useUser();

  const { menuMaster } = useGetMenuMaster();
  const drawerOpen = menuMaster.isDashboardDrawerOpened;

  const handleLogout = async () => {
    const loginBasePath = resolveLoginBasePath(pathname);
    try {
      // 한글 주석: Supabase 세션을 안전하게 종료
      await authAPI.signOut();
    } catch (error) {
      console.error('로그아웃 오류:', error);
      alert('로그아웃 처리 중 문제가 발생했습니다. 다시 시도해주세요.');
    } finally {
      router.replace(loginBasePath);
    }
  };

  const [anchorEl, setAnchorEl] = useState(null);
  const open = Boolean(anchorEl);

  const handleClick = (event) => {
    setAnchorEl(event.currentTarget);
  };
  const handleClose = () => {
    setAnchorEl(null);
  };

  return (
    <Box sx={{ p: 1.25, px: !drawerOpen ? 1.25 : 3, borderTop: '2px solid ', borderTopColor: 'divider' }}>
      <List disablePadding>
        <ListItem
          disablePadding
          secondaryAction={
            <ExpandMore
              sx={{ svg: { height: 20, width: 20 } }}
              expand={open}
              drawerOpen={drawerOpen}
              id="basic-button"
              aria-controls={open ? 'basic-menu' : undefined}
              aria-haspopup="true"
              aria-expanded={open ? 'true' : undefined}
              onClick={handleClick}
              aria-label="show more"
            >
              <ArrowRight2 style={{ fontSize: '0.625rem' }} />
            </ExpandMore>
          }
          sx={{
            ...(!drawerOpen && { display: 'flex', justifyContent: 'flex-end' }),
            '& .MuiListItemSecondaryAction-root': { right: !drawerOpen ? 16 : -16 }
          }}
        >
          <ListItemAvatar>
            <Avatar alt="Avatar" src={avatar1} sx={{ ...(drawerOpen && { width: 46, height: 46 }) }} />
          </ListItemAvatar>
          <ListItemText
            primary={user ? user?.name : ''}
            sx={{ ...(!drawerOpen && { display: 'none' }) }}
            secondary={user?.email ?? '멤버'}
          />
        </ListItem>
      </List>
      <Menu
        id="basic-menu"
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        slotProps={{ list: { 'aria-labelledby': 'basic-button' } }}
        anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
        transformOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <MenuItem onClick={handleLogout}>
          <Logout size={18} style={{ marginRight: 8 }} />
          로그아웃
        </MenuItem>
        <MenuItem disabled onClick={handleClose}>
          준비중
        </MenuItem>
      </Menu>
    </Box>
  );
}
