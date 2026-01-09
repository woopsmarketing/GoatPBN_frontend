'use client';
// v1.0 - 무료 구독자 전용 쿠폰 등록 UI(2026.01.09)

import { useState } from 'react';

import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import TextField from '@mui/material/TextField';
import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import AddCardIcon from '@mui/icons-material/AddCard';

import { authAPI } from '@/lib/supabase';
import { jsonHeaders } from '@/lib/api/httpClient';

export default function CouponLauncher() {
  const [open, setOpen] = useState(false);
  const [couponCode, setCouponCode] = useState('');
  const [status, setStatus] = useState(null);
  const [processing, setProcessing] = useState(false);

  const handleApply = async () => {
    setStatus(null);
    if (!couponCode.trim()) {
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
        code: couponCode.trim()
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
      <Button variant="outlined" color="primary" startIcon={<AddCardIcon />} size="small" onClick={() => setOpen(true)} sx={{ ml: 1 }}>
        쿠폰 등록
      </Button>
      <Dialog open={open} onClose={closeDialog} maxWidth="xs" fullWidth>
        <DialogTitle>무료 크레딧 쿠폰 등록</DialogTitle>
        <DialogContent>
          <Stack spacing={2} mt={1}>
            <Typography variant="body2" color="textSecondary">
              무료 구독자 전용 쿠폰을 입력하면 즉시 크레딧이 충전됩니다. 쿠폰은 한 번만 사용 가능합니다.
            </Typography>
            <TextField
              label="쿠폰 코드"
              fullWidth
              value={couponCode}
              onChange={(event) => setCouponCode(event.target.value)}
              placeholder="예: FREE-100CREDIT"
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
            닫기
          </Button>
          <Button onClick={handleApply} variant="contained" disabled={processing} color="primary">
            {processing ? '등록 중...' : '쿠폰 적용'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
