'use client';
// v1.1 - Supabase 실시간 알림 연동 및 더미 데이터 제거 (2025.11.24)
// 기능 요약: 관리자 알림 테이블과 실시간 구독을 사용해 사용자에게 최신 알림을 제공
import { useEffect, useMemo, useRef, useState } from 'react';

// next
import Link from 'next/link';

// material-ui
import useMediaQuery from '@mui/material/useMediaQuery';
import Alert from '@mui/material/Alert';
import Badge from '@mui/material/Badge';
import Box from '@mui/material/Box';
import CardContent from '@mui/material/CardContent';
import ClickAwayListener from '@mui/material/ClickAwayListener';
import List from '@mui/material/List';
import ListItemAvatar from '@mui/material/ListItemAvatar';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemText from '@mui/material/ListItemText';
import Paper from '@mui/material/Paper';
import Popper from '@mui/material/Popper';
import Skeleton from '@mui/material/Skeleton';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

// project-imports
import Avatar from 'components/@extended/Avatar';
import IconButton from 'components/@extended/IconButton';
import Transitions from 'components/@extended/Transitions';
import MainCard from 'components/MainCard';
import SimpleBar from 'components/third-party/SimpleBar';

// supabase helpers
import { authAPI, notificationAPI } from '@/lib/supabase';

// assets
import { Notification as NotificationIcon } from '@wandersonalwes/iconsax-react';

const MAX_NOTIFICATIONS = 30;

// 한글 주석: 상대 시간을 한국어로 간단히 포맷팅
const formatRelativeTime = (timestamp) => {
  if (!timestamp) return '';
  const target = new Date(timestamp);
  const diffMs = Date.now() - target.getTime();
  const diffMinutes = Math.floor(diffMs / 60000);

  if (diffMinutes < 1) return '방금 전';
  if (diffMinutes < 60) return `${diffMinutes}분 전`;

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}시간 전`;

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 30) return `${diffDays}일 전`;

  return target.toLocaleDateString();
};

// 한글 주석: Supabase 알림 레코드를 프론트엔드에서 사용하기 편한 구조로 변환
const mapNotification = (record) => ({
  id: record.id,
  title: record.title ?? '새 알림',
  message: record.message ?? '',
  actionUrl: record.action_url ?? '',
  createdAt: record.created_at,
  readAt: record.read_at
});

// ==============================|| HEADER CONTENT - NOTIFICATION ||============================== //

export default function NotificationPage() {
  const downMD = useMediaQuery((theme) => theme.breakpoints.down('md'));

  const anchorRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [userId, setUserId] = useState(null);
  const [notifications, setNotifications] = useState([]);

  const unreadCount = useMemo(() => notifications.filter((item) => !item.readAt).length, [notifications]);

  // 한글 주석: 초기 알림 조회 및 실시간 구독 설정
  useEffect(() => {
    let isMounted = true;
    let subscription;

    const initialize = async () => {
      try {
        setLoading(true);
        const {
          data: { session },
          error: sessionError
        } = await authAPI.getSession();

        if (sessionError) {
          throw sessionError;
        }

        const currentUserId = session?.user?.id;
        if (!currentUserId) {
          setUserId(null);
          setNotifications([]);
          return;
        }

        setUserId(currentUserId);

        const { data, error: fetchError } = await notificationAPI.fetchNotifications(currentUserId, MAX_NOTIFICATIONS);
        if (fetchError) {
          throw fetchError;
        }

        if (isMounted && data) {
          setNotifications(data.map(mapNotification));
        }

        subscription = notificationAPI.subscribeToUserNotifications(currentUserId, (payload) => {
          const incoming = mapNotification(payload.new);

          setNotifications((prev) => {
            if (payload.eventType === 'INSERT') {
              const updated = [incoming, ...prev];
              return updated.slice(0, MAX_NOTIFICATIONS);
            }

            if (payload.eventType === 'UPDATE') {
              return prev.map((item) => (item.id === incoming.id ? incoming : item));
            }

            return prev;
          });
        });
      } catch (e) {
        if (isMounted) {
          setError(e.message ?? '알림을 불러오는 중 문제가 발생했습니다.');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    initialize();

    return () => {
      isMounted = false;
      if (subscription) {
        subscription.unsubscribe();
      }
    };
  }, []);

  const handleToggle = () => {
    setOpen((prevOpen) => !prevOpen);
  };

  const handleClose = (event) => {
    if (anchorRef.current && anchorRef.current.contains(event?.target)) {
      return;
    }
    setOpen(false);
  };

  const handleMarkAllRead = async () => {
    if (!userId || unreadCount === 0) return;
    try {
      await notificationAPI.markAllAsRead(userId);
      setNotifications((prev) => prev.map((item) => ({ ...item, readAt: item.readAt ?? new Date().toISOString() })));
    } catch (e) {
      setError(e.message ?? '알림을 읽음 처리하지 못했습니다.');
    }
  };

  const handleNotificationClick = async (item) => {
    if (!item.readAt) {
      try {
        await notificationAPI.markAsRead(item.id);
        setNotifications((prev) =>
          prev.map((notification) => (notification.id === item.id ? { ...notification, readAt: new Date().toISOString() } : notification))
        );
      } catch (e) {
        setError(e.message ?? '알림을 읽음 처리하지 못했습니다.');
      }
    }
    setOpen(false);
  };

  return (
    <Box sx={{ flexShrink: 0, ml: 0.5 }}>
      <IconButton
        color="secondary"
        variant="light"
        aria-label="open notifications"
        ref={anchorRef}
        aria-controls={open ? 'goatpbn-notifications' : undefined}
        aria-haspopup="true"
        onClick={handleToggle}
        size="large"
        sx={(theme) => ({
          p: 1,
          color: 'secondary.main',
          bgcolor: open ? 'secondary.200' : 'secondary.100',
          ...theme.applyStyles('dark', { bgcolor: open ? 'background.paper' : 'background.default' })
        })}
      >
        <Badge color="success" slotProps={{ badge: { sx: { top: 2, right: 4 } } }} badgeContent={unreadCount > 0 ? unreadCount : null}>
          <NotificationIcon variant="Bold" />
        </Badge>
      </IconButton>
      <Popper
        id="goatpbn-notifications"
        placement={downMD ? 'bottom' : 'bottom-end'}
        open={open}
        anchorEl={anchorRef.current}
        role={undefined}
        transition
        disablePortal
        popperOptions={{ modifiers: [{ name: 'offset', options: { offset: [downMD ? -5 : 0, 9] } }] }}
      >
        {({ TransitionProps }) => (
          <Transitions type="grow" position={downMD ? 'top' : 'top-right'} in={open} {...TransitionProps}>
            <Paper sx={(theme) => ({ boxShadow: theme.customShadows.z1, borderRadius: 1.5, width: { xs: 320, sm: 420 } })}>
              <ClickAwayListener onClickAway={handleClose}>
                <MainCard border={false} content={false}>
                  <CardContent sx={{ p: 0 }}>
                    <Stack sx={{ p: 3, pb: 0, gap: 1.5 }}>
                      <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
                        <Typography variant="h5">알림</Typography>
                        <Typography
                          variant="body2"
                          color={unreadCount === 0 ? 'text.disabled' : 'primary'}
                          sx={{ cursor: unreadCount === 0 ? 'default' : 'pointer' }}
                          onClick={handleMarkAllRead}
                        >
                          모두 읽음 처리
                        </Typography>
                      </Stack>
                      {error && <Alert severity="error">{error}</Alert>}
                    </Stack>
                    <SimpleBar style={{ maxHeight: 'calc(100vh - 200px)' }}>
                      <List
                        component="nav"
                        sx={(theme) => ({
                          p: 3,
                          pt: 2,
                          '& .MuiListItemButton-root': {
                            mb: 1.5,
                            borderRadius: 1.5,
                            border: `1px solid ${theme.palette.divider}`,
                            '&:hover': { bgcolor: 'primary.lighter', borderColor: 'primary.light' }
                          }
                        })}
                      >
                        {loading && (
                          <Stack sx={{ gap: 1.5 }}>
                            {Array.from({ length: 3 }).map((_, index) => (
                              <Skeleton key={index} variant="rounded" height={72} />
                            ))}
                          </Stack>
                        )}
                        {!loading && notifications.length === 0 && (
                          <Stack sx={{ py: 4, alignItems: 'center', color: 'text.secondary', gap: 0.5 }}>
                            <NotificationIcon size={28} />
                            <Typography variant="body2">새로운 알림이 없습니다.</Typography>
                          </Stack>
                        )}
                        {!loading &&
                          notifications.map((item) => {
                            const Component = item.actionUrl ? Link : 'div';

                            return (
                              <ListItemButton
                                key={item.id}
                                component={Component}
                                href={item.actionUrl || undefined}
                                onClick={() => handleNotificationClick(item)}
                                sx={{
                                  opacity: item.readAt ? 0.7 : 1,
                                  alignItems: 'flex-start'
                                }}
                              >
                                <ListItemAvatar sx={{ mt: 0.5 }}>
                                  <Avatar
                                    sx={(theme) => ({
                                      bgcolor: item.readAt ? theme.palette.grey[300] : theme.palette.primary.main,
                                      color: item.readAt ? theme.palette.text.primary : theme.palette.common.white,
                                      fontWeight: 700
                                    })}
                                  >
                                    {item.title.charAt(0).toUpperCase()}
                                  </Avatar>
                                </ListItemAvatar>
                                <ListItemText
                                  primary={
                                    <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                                      {item.title}
                                    </Typography>
                                  }
                                  secondary={
                                    <Stack sx={{ gap: 0.5 }}>
                                      {item.message && (
                                        <Typography variant="body2" color="text.secondary">
                                          {item.message}
                                        </Typography>
                                      )}
                                      <Typography variant="caption" color="text.disabled">
                                        {formatRelativeTime(item.createdAt)}
                                      </Typography>
                                    </Stack>
                                  }
                                />
                              </ListItemButton>
                            );
                          })}
                      </List>
                    </SimpleBar>
                  </CardContent>
                </MainCard>
              </ClickAwayListener>
            </Paper>
          </Transitions>
        )}
      </Popper>
    </Box>
  );
}
