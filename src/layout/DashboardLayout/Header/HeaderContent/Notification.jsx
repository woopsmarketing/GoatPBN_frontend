'use client';
// v1.1 - Supabase 실시간 알림 연동 및 더미 데이터 제거 (2025.11.24)
// 기능 요약: 관리자 알림 테이블과 실시간 구독을 사용해 사용자에게 최신 알림을 제공
import { useEffect, useMemo, useRef, useState } from 'react';

// next
import Link from 'next/link';
import { usePathname } from 'next/navigation';

// material-ui
import useMediaQuery from '@mui/material/useMediaQuery';
import Alert from '@mui/material/Alert';
import Badge from '@mui/material/Badge';
import Box from '@mui/material/Box';
import CardContent from '@mui/material/CardContent';
import ClickAwayListener from '@mui/material/ClickAwayListener';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
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
import Button from '@mui/material/Button';

// supabase helpers
import { authAPI, notificationAPI } from '@/lib/supabase';

// assets
import { Notification as NotificationIcon } from '@wandersonalwes/iconsax-react';

const MAX_NOTIFICATIONS = 30;

export const NOTIFICATION_LOCALE_TEXT = {
  ko: {
    title: '알림',
    markAll: '모두 읽음 처리',
    noNotifications: '새로운 알림이 없습니다.',
    defaultTitle: '새 알림',
    fetchError: '알림을 불러오는 중 문제가 발생했습니다.',
    markAllError: '알림을 읽음 처리하지 못했습니다.',
    markOneError: '알림을 읽음 처리하지 못했습니다.',
    tableMissing: "알림 테이블이 아직 생성되지 않았습니다. Supabase에서 'notifications' 테이블을 먼저 만들어주세요.",
    relative: {
      justNow: '방금 전',
      minutes: '분 전',
      hours: '시간 전',
      days: '일 전'
    }
  },
  en: {
    title: 'Notifications',
    markAll: 'Mark all read',
    noNotifications: 'You have no new notifications.',
    defaultTitle: 'New notification',
    fetchError: 'Failed to load notifications.',
    markAllError: 'Could not mark notifications as read.',
    markOneError: 'Could not mark notification as read.',
    tableMissing: "The notifications table doesn't exist yet. Please create a 'notifications' table in Supabase.",
    relative: {
      justNow: 'Just now',
      minutes: ' minutes ago',
      hours: ' hours ago',
      days: ' days ago'
    }
  }
};

// 한글 주석: 상대 시간을 locale에 맞춰 포맷팅
export const formatNotificationRelativeTime = (timestamp, localeTexts) => {
  if (!timestamp) return '';
  const target = new Date(timestamp);
  const diffMs = Date.now() - target.getTime();
  const diffMinutes = Math.floor(diffMs / 60000);

  if (diffMinutes < 1) return localeTexts.relative.justNow;
  if (diffMinutes < 60) return `${diffMinutes}${localeTexts.relative.minutes}`;

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}${localeTexts.relative.hours}`;

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 30) return `${diffDays}${localeTexts.relative.days}`;

  return target.toLocaleDateString();
};

// 한글 주석: Supabase 알림 레코드를 프론트엔드에서 사용하기 편한 구조로 변환
export const mapNotificationRecord = (record, defaultTitle) => ({
  id: record.id,
  title: record.title ?? defaultTitle,
  message: record.message ?? '',
  actionUrl: record.action_url ?? '',
  metadata: record.metadata ?? {},
  createdAt: record.created_at,
  readAt: record.read_at
});

// ==============================|| HEADER CONTENT - NOTIFICATION ||============================== //

export default function NotificationPage() {
  const downMD = useMediaQuery((theme) => theme.breakpoints.down('md'));
  const pathname = usePathname();
  const locale = pathname?.startsWith('/ko') ? 'ko' : 'en';
  const localeTexts = NOTIFICATION_LOCALE_TEXT[locale];
  const ADMIN_USER_IDS = ['5175284c-71de-4ba5-8b70-6ae2a5d46492']; // 한글 주석: 마스터 계정만 승인 가능

  const anchorRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [userId, setUserId] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [selectedRefund, setSelectedRefund] = useState(null);
  const [selectedCoupon, setSelectedCoupon] = useState(null);
  const [selectedSubscription, setSelectedSubscription] = useState(null);
  const [approveLoading, setApproveLoading] = useState(false);
  const isAdmin = userId && ADMIN_USER_IDS.includes(userId);

  const unreadCount = useMemo(() => notifications.filter((item) => !item.readAt).length, [notifications]);

  // 한글 주석: 초기 알림 조회 및 실시간 구독 설정
  useEffect(() => {
    let isMounted = true;
    let subscription;

    const resolveErrorMessage = (rawMessage) => {
      if (!rawMessage) return localeTexts.fetchError;
      if (rawMessage.includes("Could not find the table 'public.notifications'")) return localeTexts.tableMissing;
      return rawMessage;
    };

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
          setNotifications(data.map((item) => mapNotificationRecord(item, localeTexts.defaultTitle)));
        }

        subscription = notificationAPI.subscribeToUserNotifications(currentUserId, (payload) => {
          const incoming = mapNotificationRecord(payload.new, localeTexts.defaultTitle);

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
          setError(resolveErrorMessage(e.message));
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
  }, [localeTexts]);

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
      setError(e.message ?? localeTexts.markAllError);
    }
  };

  const handleNotificationClick = async (item, event) => {
    if (!item.readAt) {
      try {
        await notificationAPI.markAsRead(item.id);
        setNotifications((prev) =>
          prev.map((notification) => (notification.id === item.id ? { ...notification, readAt: new Date().toISOString() } : notification))
        );
      } catch (e) {
        setError(e.message ?? localeTexts.markOneError);
      }
    }
    const isRefundRequestPending = isAdmin && item.metadata?.refund_request_id && (item.metadata?.status || '').toLowerCase() === 'pending';
    const isCoupon = item.metadata?.event === 'coupon_redeemed';
    const isSubscription = item.metadata?.event === 'subscription_started';

    // 환불 승인 모달
    if (isRefundRequestPending) {
      event?.preventDefault();
      setSelectedRefund(item);
      return;
    }

    // 쿠폰 사용 모달
    if (isCoupon) {
      event?.preventDefault();
      setSelectedCoupon(item);
      return;
    }

    // 구독 시작 모달
    if (isSubscription) {
      event?.preventDefault();
      setSelectedSubscription(item);
      return;
    }

    setOpen(false);
  };

  const handleApproveRefund = async () => {
    if (!selectedRefund?.metadata?.refund_request_id) return;
    setApproveLoading(true);
    try {
      const resp = await fetch('/api/refunds/approve', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': userId || ''
        },
        body: JSON.stringify({ refund_request_id: selectedRefund.metadata.refund_request_id })
      });
      const data = await resp.json();
      if (!resp.ok) {
        throw new Error(data?.detail || data?.error || 'Refund approve failed');
      }
      // 읽음 처리 + 목록에서 제거(선택)
      setNotifications((prev) => prev.map((n) => (n.id === selectedRefund.id ? { ...n, readAt: new Date().toISOString() } : n)));
      setSelectedRefund(null);
      setOpen(false);
    } catch (e) {
      setError(e.message || 'Refund approve failed');
    } finally {
      setApproveLoading(false);
    }
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
                        <Typography variant="h5">{localeTexts.title}</Typography>
                        <Typography
                          variant="body2"
                          color={unreadCount === 0 ? 'text.disabled' : 'primary'}
                          sx={{ cursor: unreadCount === 0 ? 'default' : 'pointer' }}
                          onClick={handleMarkAllRead}
                        >
                          {localeTexts.markAll}
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
                            <Typography variant="body2">{localeTexts.noNotifications}</Typography>
                          </Stack>
                        )}
                        {!loading &&
                          notifications.map((item) => {
                            const isRefundAdminItem =
                              isAdmin && item.metadata?.refund_request_id && (item.metadata?.status || '').toLowerCase() === 'pending';
                            // 한글 주석: 관리자 환불 알림은 이동 없이 모달을 띄우기 위해 div로 처리
                            const isCoupon = item.metadata?.event === 'coupon_redeemed';
                            const isSubscription = item.metadata?.event === 'subscription_started';
                            const Component = isRefundAdminItem || isCoupon || isSubscription ? 'div' : item.actionUrl ? Link : 'div';

                            return (
                              <ListItemButton
                                key={item.id}
                                component={Component}
                                href={isRefundAdminItem || isCoupon || isSubscription ? undefined : item.actionUrl || undefined}
                                onClick={(event) => handleNotificationClick(item, event)}
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
                                        {formatNotificationRelativeTime(item.createdAt, localeTexts)}
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
      {/* 환불 승인 모달 (관리자 전용) */}
      <Dialog open={Boolean(selectedRefund)} onClose={() => setSelectedRefund(null)} maxWidth="sm" fullWidth>
        <DialogTitle>환불 승인</DialogTitle>
        <DialogContent dividers>
          <Stack sx={{ gap: 1 }}>
            <Typography variant="subtitle1">환불 요청 ID: {selectedRefund?.metadata?.refund_request_id}</Typography>
            <Typography variant="body2">사용자 ID: {selectedRefund?.metadata?.user_id}</Typography>
            <Typography variant="body2">구독 ID: {selectedRefund?.metadata?.subscription_id}</Typography>
            <Typography variant="body2">
              금액: {(selectedRefund?.metadata?.amount_cents ?? 0) / 100} {selectedRefund?.metadata?.currency || 'USD'}
            </Typography>
            <Typography variant="body2">인보이스: {selectedRefund?.metadata?.invoice_number || 'N/A'}</Typography>
            <Typography variant="body2">사유: {selectedRefund?.metadata?.reason}</Typography>
            <Typography variant="body2">요청시각: {selectedRefund?.metadata?.requested_at}</Typography>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSelectedRefund(null)} disabled={approveLoading}>
            닫기
          </Button>
          <Button variant="contained" onClick={handleApproveRefund} disabled={approveLoading}>
            {approveLoading ? '승인 중...' : '환불 승인'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* 쿠폰 사용 알림 모달 */}
      <Dialog open={Boolean(selectedCoupon)} onClose={() => setSelectedCoupon(null)} maxWidth="sm" fullWidth>
        <DialogTitle>쿠폰 사용</DialogTitle>
        <DialogContent dividers>
          <Stack sx={{ gap: 1 }}>
            <Typography variant="subtitle1">쿠폰 코드: {selectedCoupon?.metadata?.coupon_code}</Typography>
            <Typography variant="body2">사용자 ID: {selectedCoupon?.metadata?.user_id}</Typography>
            <Typography variant="body2">지급 크레딧: {selectedCoupon?.metadata?.credits_awarded}</Typography>
            <Typography variant="body2">사용 시각: {selectedCoupon?.metadata?.redeemed_at}</Typography>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSelectedCoupon(null)}>닫기</Button>
        </DialogActions>
      </Dialog>

      {/* 구독 시작 알림 모달 */}
      <Dialog open={Boolean(selectedSubscription)} onClose={() => setSelectedSubscription(null)} maxWidth="sm" fullWidth>
        <DialogTitle>구독 시작</DialogTitle>
        <DialogContent dividers>
          <Stack sx={{ gap: 1 }}>
            <Typography variant="subtitle1">플랜: {selectedSubscription?.metadata?.plan}</Typography>
            <Typography variant="body2">사용자 ID: {selectedSubscription?.metadata?.user_id}</Typography>
            <Typography variant="body2">구독 ID: {selectedSubscription?.metadata?.provider_subscription_id}</Typography>
            <Typography variant="body2">인보이스: {selectedSubscription?.metadata?.invoice_number || 'N/A'}</Typography>
            <Typography variant="body2">
              생성 시각: {selectedSubscription?.metadata?.created_at || selectedSubscription?.createdAt}
            </Typography>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSelectedSubscription(null)}>닫기</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
