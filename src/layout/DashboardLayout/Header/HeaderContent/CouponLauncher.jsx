'use client';
// v1.1 - 쿠폰 자동 오픈/프리필 지원 (2026.01.23)
// v1.0 - 무료 구독자 전용 쿠폰 등록 UI(2026.01.09)

import { useEffect, useRef, useState } from 'react';

import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import TextField from '@mui/material/TextField';
import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import { PlusSmallIcon } from '@heroicons/react/24/outline';

import { authAPI } from '@/lib/supabase';
import { jsonHeaders } from '@/lib/api/httpClient';
import TailwindButton from '@/components/ui/TailwindButton';

export default function CouponLauncher({
  label = '쿠폰 등록',
  dialogTitle = '무료 크레딧 쿠폰 등록',
  helperText = '무료 구독자 전용 쿠폰을 입력하면 즉시 크레딧이 충전됩니다. 쿠폰은 한 번만 사용 가능합니다.',
  placeholder = '예: FREE-100CREDIT',
  closeText = '닫기',
  submitText = '쿠폰 적용',
  inputLabel = '쿠폰 코드',
  processingText = '등록 중...',
  autoOpen = false,
  defaultCouponCode = '',
  onAutoOpenHandled
}) {
  const [open, setOpen] = useState(false);
  const [couponCode, setCouponCode] = useState('');
  const [status, setStatus] = useState(null);
  const [processing, setProcessing] = useState(false);
  const autoOpenHandledRef = useRef(false);

  // 한글 주석: 쿠폰 코드를 정규화합니다.
  const normalizeCouponCode = (value) => String(value || '').trim();

  // 한글 주석: 자동 오픈 요청을 1회만 실행합니다.
  useEffect(() => {
    try {
      if (!autoOpen || autoOpenHandledRef.current) return;
      autoOpenHandledRef.current = true;
      if (defaultCouponCode) {
        setCouponCode(normalizeCouponCode(defaultCouponCode));
      }
      setOpen(true);
      if (typeof onAutoOpenHandled === 'function') {
        onAutoOpenHandled();
      }
    } catch (error) {
      console.warn('쿠폰 자동 오픈 처리 실패:', error);
    }
  }, [autoOpen, defaultCouponCode, onAutoOpenHandled]);

  const handleApply = async () => {
    setStatus(null);
    const normalizedCode = normalizeCouponCode(couponCode);
    if (!normalizedCode) {
      setStatus({ type: 'error', message: '쿠폰 코드를 입력해 주세요.' });
      return;
    }

    setProcessing(true);
    try {
      const { data: authData } = await authAPI.getCurrentUser();
      const user = authData?.user;
      if (!user) {
        throw new Error('로그인이 필요합니다.');
      }

      const payload = {
        user_id: user.id,
        code: normalizedCode
      };

      // 한글 주석: Next API 를 통해 FastAPI 쿠폰 엔드포인트로 요청을 전달합니다.
      const response = await fetch('/api/coupons/redeem', {
        method: 'POST',
        headers: jsonHeaders({ 'x-user-id': user.id }),
        body: JSON.stringify(payload)
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.detail || result.message || '쿠폰 등록에 실패했습니다.');
      }

      setStatus({
        type: 'success',
        message: result.message || '쿠폰이 정상 등록되어 크레딧이 충전되었습니다.'
      });
      setCouponCode('');
    } catch (error) {
      console.error('[CouponLauncher]', error);
      setStatus({
        type: 'error',
        message: error.message || '쿠폰 등록 중 오류가 발생했습니다.'
      });
    } finally {
      setProcessing(false);
    }
  };

  const closeDialog = () => {
    setStatus(null);
    setCouponCode('');
    setOpen(false);
  };

  return (
    <>
      <TailwindButton variant="primary" className="h-10 px-4 gap-2 flex items-center" onClick={() => setOpen(true)}>
        <PlusSmallIcon className="h-4 w-4" />
        {label}
      </TailwindButton>
      <Dialog open={open} onClose={closeDialog} maxWidth="xs" fullWidth>
        <DialogTitle>{dialogTitle}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} mt={1}>
            <Typography variant="body2" color="textSecondary">
              {helperText}
            </Typography>
            <TextField
              label={inputLabel}
              fullWidth
              value={couponCode}
              onChange={(event) => setCouponCode(event.target.value)}
              placeholder={placeholder}
              disabled={processing}
            />
            {status && (
              <Alert severity={status.type} variant="outlined">
                {status.message}
              </Alert>
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeDialog} disabled={processing}>
            {closeText}
          </Button>
          <Button onClick={handleApply} variant="contained" disabled={processing} color="primary">
            {processing ? processingText : submitText}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
