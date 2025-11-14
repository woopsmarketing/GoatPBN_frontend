'use client';
import PropTypes from 'prop-types';

import { lazy } from 'react';

// next
import { usePathname } from 'next/navigation';

// material-ui
const Header = lazy(() => import('./Header'));
const FooterBlock = lazy(() => import('./FooterBlock'));

// project-imports
import Loader from 'components/Loader';
import { useGetMenuMaster } from 'api/menu';

export default function SimpleLayout({ children }) {
  const { menuMasterLoading } = useGetMenuMaster();

  const pathname = usePathname();
  const layout = pathname === 'landing' || '/' ? 'landing' : 'simple';

  if (menuMasterLoading) return <Loader />;

  return (
    <>
      <Header />
      {children}
      <FooterBlock isFull={layout === 'landing'} />
    </>
  );
}

SimpleLayout.propTypes = { children: PropTypes.node };
