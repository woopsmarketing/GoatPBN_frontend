import PropTypes from 'prop-types';

import './globals.css';

// project-imports
import ProviderWrapper from './ProviderWrapper';

export const metadata = {
  title: 'Able Pro Material UI Next JS Dashboard Template',
  description:
    'Able Pro React Admin Template, built with Material UI, React, and React Router, offers a modern UI, seamless performance, and powerful customization for any web application.'
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body suppressHydrationWarning={true}>
        <ProviderWrapper>{children}</ProviderWrapper>
      </body>
    </html>
  );
}

RootLayout.propTypes = { children: PropTypes.node };
