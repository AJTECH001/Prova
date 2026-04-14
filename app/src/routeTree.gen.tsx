import { createRootRoute, createRoute, Outlet, redirect } from '@tanstack/react-router';
import { useAuthStore } from '@/stores/auth-store';
import { AppLayout } from '@/components/layout/app-layout';
import { WalletAuthPage } from '@/routes/index';
import { AuthPage } from '@/routes/auth';
import { DashboardPage } from '@/routes/_authenticated/dashboard';
import { TransactionsPage } from '@/routes/_authenticated/transactions/index';
import { TransactionDetailPage } from '@/routes/_authenticated/transactions/$id';
import { WithdrawalsPage } from '@/routes/_authenticated/withdrawals';
import { ProfilePage } from '@/routes/_authenticated/profile';

const rootRoute = createRootRoute({
  component: Outlet,
});

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: WalletAuthPage,
});

const authRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/auth',
  beforeLoad: () => {
    // Already authenticated — skip the auth page
    if (useAuthStore.getState().isAuthorized()) {
      throw redirect({ to: '/dashboard' });
    }
  },
  component: AuthPage,
});

function AuthenticatedLayout() {
  return (
    <AppLayout>
      <Outlet />
    </AppLayout>
  );
}

const authenticatedRoute = createRoute({
  getParentRoute: () => rootRoute,
  id: 'authenticated',
  beforeLoad: () => {
    if (!useAuthStore.getState().isAuthorized()) {
      throw redirect({ to: '/auth' });
    }
  },
  component: AuthenticatedLayout,
});

const dashboardRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: '/dashboard',
  component: DashboardPage,
});

const transactionsRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: '/transactions',
  component: TransactionsPage,
});

const transactionDetailRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: '/transactions/$id',
  component: TransactionDetailPage,
});

const withdrawalsRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: '/withdrawals',
  component: WithdrawalsPage,
});

const profileRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: '/profile',
  component: ProfilePage,
});

const authenticatedTree = authenticatedRoute.addChildren([
  dashboardRoute,
  transactionsRoute,
  transactionDetailRoute,
  withdrawalsRoute,
  profileRoute,
]);

export const routeTree = rootRoute.addChildren([indexRoute, authRoute, authenticatedTree]);
