import { useMemo } from 'react';

import useMediaQuery from '@mui/material/useMediaQuery';
import Box from '@mui/material/Box';

// project-imports
import MegaMenuSection from './MegaMenuSection';
import MobileSection from './MobileSection';
import Notification from './Notification';
import Profile from './Profile';
import Search from './Search';
import Support from './Support';
import CouponLauncher from './CouponLauncher';

import { MenuOrientation } from 'config';
import useConfig from 'hooks/useConfig';
import DrawerHeader from 'layout/DashboardLayout/Drawer/DrawerHeader';

// ==============================|| HEADER - CONTENT ||============================== //

export default function HeaderContent() {
  const { menuOrientation } = useConfig();

  const downLG = useMediaQuery((theme) => theme.breakpoints.down('lg'));

  const megaMenu = useMemo(() => <MegaMenuSection />, []);

  return (
    <>
      {menuOrientation === MenuOrientation.HORIZONTAL && !downLG && <DrawerHeader open={true} />}
      {!downLG && (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 0, flexGrow: 1 }}>
          <Search />
        </Box>
      )}
      {!downLG && megaMenu}
      {downLG && <Box sx={{ width: 1, ml: 1 }} />}

      {!downLG && <Box sx={{ flexGrow: 1 }} />}

      <Notification />
      {!downLG && <Support />}
      {!downLG && <Profile />}
      {downLG && <MobileSection />}
    </>
  );
}
