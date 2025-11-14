import PropTypes from 'prop-types';
// project-imports
import GuestGuard from 'utils/route-guard/GuestGuard';

// ==============================|| AUTH LAYOUT ||============================== //

export default function Layout({ children }) {
  return <GuestGuard>{children}</GuestGuard>;
}

Layout.propTypes = { children: PropTypes.node };
