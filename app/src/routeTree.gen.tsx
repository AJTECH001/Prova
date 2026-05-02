import { createRootRoute, createRoute, Outlet, redirect } from '@tanstack/react-router';
import { useAuthStore, type UserRole } from '@/stores/auth-store';
import { AppLayout } from '@/components/layout/app-layout';
import { WalletAuthPage } from '@/routes/index';
import { AuthPage } from '@/routes/auth';
import { OnboardingPage } from '@/routes/onboarding';
import { PricingPage } from '@/routes/pricing';
import { PrivacyPage } from '@/routes/privacy';
import { TermsPage } from '@/routes/terms';
import { ContactPage } from '@/routes/contact';
import { BlogPage } from '@/routes/blog';
import { DashboardPage } from '@/routes/_authenticated/dashboard';
import { TransactionsPage } from '@/routes/_authenticated/transactions/index';
import { TransactionDetailPage } from '@/routes/_authenticated/transactions/$id';
import { WithdrawalsPage } from '@/routes/_authenticated/withdrawals';
import { PoolPage } from '@/routes/_authenticated/pool';
import { ProfilePage } from '@/routes/_authenticated/profile';

function requireRole(...roles: UserRole[]) {
  const { role } = useAuthStore.getState();
  if (!role || !roles.includes(role)) {
    throw redirect({ to: '/dashboard' });
  }
}

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
    if (useAuthStore.getState().isAuthorized()) {
      throw redirect({ to: '/dashboard' });
    }
  },
  component: AuthPage,
});

const onboardingRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/onboarding',
  beforeLoad: () => {
    if (!useAuthStore.getState().isAuthorized()) {
      throw redirect({ to: '/auth' });
    }
  },
  component: OnboardingPage,
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
    const state = useAuthStore.getState();
    if (!state.isAuthorized()) {
      throw redirect({ to: '/auth' });
    }
    // New user with no role — send to onboarding
    if (!state.role) {
      throw redirect({ to: '/onboarding' });
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
  beforeLoad: () => requireRole('SELLER', 'ADMIN'),
  component: TransactionsPage,
});

const transactionDetailRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: '/transactions/$id',
  beforeLoad: () => requireRole('SELLER', 'ADMIN'),
  component: TransactionDetailPage,
});

const withdrawalsRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: '/withdrawals',
  beforeLoad: () => requireRole('SELLER', 'ADMIN'),
  component: WithdrawalsPage,
});

const poolRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: '/pool',
  beforeLoad: () => requireRole('LP', 'ADMIN'),
  component: PoolPage,
});

const profileRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: '/profile',
  component: ProfilePage,
});

const pricingRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/pricing',
  component: PricingPage,
});

const privacyRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/privacy',
  component: PrivacyPage,
});

const termsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/terms',
  component: TermsPage,
});

const contactRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/contact',
  component: ContactPage,
});

const blogRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/blog',
  component: BlogPage,
});

const authenticatedTree = authenticatedRoute.addChildren([
  dashboardRoute,
  transactionsRoute,
  transactionDetailRoute,
  withdrawalsRoute,
  poolRoute,
  profileRoute,
]);

export const routeTree = rootRoute.addChildren([
  indexRoute,
  authRoute,
  onboardingRoute,
  pricingRoute,
  privacyRoute,
  termsRoute,
  contactRoute,
  blogRoute,
  authenticatedTree,
]);
