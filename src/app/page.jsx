// project-imports
import GuestGuard from 'utils/route-guard/GuestGuard';
import Login from 'views/authentication/Login';

// ==============================|| HOME PAGE ||============================== //

export default function HomePage() {
  return (
    <GuestGuard>
      <Login />
    </GuestGuard>
  );
}
