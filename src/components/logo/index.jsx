'use client';

import PropTypes from 'prop-types';
import { useMemo } from 'react';
// next
import Link from 'next/link';
import { usePathname } from 'next/navigation';

// material-ui
import ButtonBase from '@mui/material/ButtonBase';

// project-imports
import Logo from './LogoMain';
import LogoIcon from './LogoIcon';
import { APP_DEFAULT_PATH } from 'config';
import { getLocaleBasePath } from '@/utils/getLocaleBasePath';

export default function LogoSection({ reverse, isIcon, sx, to }) {
  const pathname = usePathname();
  const localeBasePath = getLocaleBasePath(pathname);

  const defaultHref = useMemo(() => `${localeBasePath}/dashboard`, [localeBasePath]);
  const resolvedHref = to ?? defaultHref ?? APP_DEFAULT_PATH;

  return (
    <ButtonBase disableRipple component={Link} href={resolvedHref} sx={sx}>
      {isIcon ? <LogoIcon /> : <Logo reverse={reverse} />}
    </ButtonBase>
  );
}

LogoSection.propTypes = { reverse: PropTypes.bool, isIcon: PropTypes.bool, sx: PropTypes.any, to: PropTypes.any };
