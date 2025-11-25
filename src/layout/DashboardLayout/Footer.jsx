// next
import Link from 'next/link';

// material-ui
import Links from '@mui/material/Link';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

// ==============================|| MAIN LAYOUT - FOOTER ||============================== //

export default function Footer() {
  return (
    <Stack direction={{ sm: 'row' }} sx={{ gap: 1, justifyContent: 'space-between', alignItems: 'center', pt: 3, mt: 'auto' }}>
      <Typography variant="caption">&copy; {new Date().getFullYear()} GOATPBN. Crafted with ♥ by the GOATPBN Team.</Typography>
      <Stack direction="row" sx={{ gap: 1.5, justifyContent: 'space-between', alignItems: 'center' }}>
        <Links component={Link} href="https://goatpbn.com" target="_blank" variant="caption" color="text.primary">
          {`Home`}
        </Links>
        <Links component={Link} href="https://goatpbn.com/landing" target="_blank" variant="caption" color="text.primary">
          Documentation
        </Links>
        <Links component={Link} href="https://t.me/goat82" target="_blank" variant="caption" color="text.primary">
          Support
        </Links>
      </Stack>
    </Stack>
  );
}
