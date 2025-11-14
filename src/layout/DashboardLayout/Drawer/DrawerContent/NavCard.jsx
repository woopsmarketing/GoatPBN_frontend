// material-ui
import Button from '@mui/material/Button';
import CardMedia from '@mui/material/CardMedia';
import Link from '@mui/material/Link';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

// project-imports
import AnimateButton from 'components/@extended/AnimateButton';
import MainCard from 'components/MainCard';
import { useDashboardLocale } from 'contexts/DashboardLocaleContext';

// assets
const avatar = '/assets/images/users/customer-support-1.png';

// ==============================|| DRAWER CONTENT - NAV CARD ||============================== //

export default function NavCard() {
  const { navCard } = useDashboardLocale();

  return (
    <MainCard sx={{ bgcolor: 'secondary.lighter', m: 3 }}>
      <Stack sx={{ gap: 2.5, alignItems: 'center' }}>
        <CardMedia component="img" image={avatar} />
        <Stack sx={{ alignItems: 'center' }}>
          <Typography variant="h5">{navCard.title}</Typography>
          <Typography variant="h6" color="secondary">
            {navCard.description}
          </Typography>
        </Stack>
        <AnimateButton>
          <Button variant="shadow" size="small" component={Link} href="https://t.me/goat82" target="_blank">
            {navCard.buttonLabel}
          </Button>
        </AnimateButton>
      </Stack>
    </MainCard>
  );
}
