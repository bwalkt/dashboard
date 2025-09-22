import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import {
  ClerkProvider,
  SignedIn,
  SignedOut,
  useAuth
} from '@clerk/clerk-react';
import Providers from '@/components/layout/providers';
import { Toaster } from '@/components/ui/sonner';
import ThemeProvider from '@/components/layout/ThemeToggle/theme-provider';
import { fontVariables } from '@/lib/font';
import { cn } from '@/lib/utils';
import { NuqsAdapter } from 'nuqs/adapters/react';
import NProgress from 'nprogress';
import 'nprogress/nprogress.css';
import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

// Import CSS styles
import '@/styles/globals.css';
import '@/styles/theme.css';

// Import pages
import SignIn from './pages/auth/SignIn';
import SignUp from './pages/auth/SignUp';
import DashboardLayout from './pages/dashboard/Layout';
import Overview from './pages/dashboard/Overview';
import Accounts from './pages/dashboard/Accounts';
import Opportunities from './pages/dashboard/Opportunities';
import Leads from './pages/dashboard/Leads';
import Data from './pages/dashboard/Data';
import Settings from './pages/dashboard/Settings';

// Configure NProgress
NProgress.configure({ showSpinner: false });

function ProgressBar() {
  const location = useLocation();

  useEffect(() => {
    NProgress.start();
    NProgress.done();
  }, [location.pathname]);

  return null;
}

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { isSignedIn, isLoaded } = useAuth();

  console.log('PrivateRoute - isLoaded:', isLoaded, 'isSignedIn:', isSignedIn);

  if (!isLoaded) {
    return <div>Loading authentication...</div>;
  }

  if (!isSignedIn) {
    return <Navigate to='/auth/sign-in' replace />;
  }

  return <>{children}</>;
}

function AppContent() {
  const activeThemeValue = localStorage.getItem('active_theme') || '';
  const isScaled = activeThemeValue?.endsWith('-scaled');

  console.log('AppContent rendering, theme:', activeThemeValue || 'default');

  return (
    <div
      className={cn(
        'bg-background min-h-screen font-sans antialiased',
        activeThemeValue ? `theme-${activeThemeValue}` : '',
        isScaled ? 'theme-scaled' : '',
        fontVariables
      )}
    >
      <ThemeProvider
        attribute='class'
        defaultTheme='system'
        enableSystem
        disableTransitionOnChange
        enableColorScheme
      >
        <Providers activeThemeValue={activeThemeValue}>
          <Toaster />
          <ProgressBar />
          <Routes>
            {/* Auth routes */}
            <Route
              path='/auth/sign-in'
              element={
                <SignedOut>
                  <SignIn />
                </SignedOut>
              }
            />
            <Route
              path='/auth/sign-up'
              element={
                <SignedOut>
                  <SignUp />
                </SignedOut>
              }
            />

            {/* Dashboard routes */}
            <Route
              path='/dashboard/*'
              element={
                <PrivateRoute>
                  <DashboardLayout />
                </PrivateRoute>
              }
            >
              <Route
                index
                element={<Navigate to='/dashboard/overview' replace />}
              />
              <Route path='overview' element={<Overview />} />
              <Route path='accounts' element={<Accounts />} />
              <Route path='opportunities' element={<Opportunities />} />
              <Route path='leads' element={<Leads />} />
              <Route path='data' element={<Data />} />
              <Route path='settings' element={<Settings />} />
            </Route>

            {/* Root redirect - single route that checks auth state */}
            <Route
              path='/'
              element={
                <>
                  <SignedIn>
                    <Navigate to='/dashboard/overview' replace />
                  </SignedIn>
                  <SignedOut>
                    <Navigate to='/auth/sign-in' replace />
                  </SignedOut>
                </>
              }
            />
          </Routes>
        </Providers>
      </ThemeProvider>
    </div>
  );
}

function App() {
  const clerkPubKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

  console.log('=== APP COMPONENT STARTING ===');
  console.log(
    'App component rendering, Clerk key:',
    clerkPubKey ? 'present' : 'missing'
  );
  console.log('Environment variables:', import.meta.env);

  if (!clerkPubKey) {
    console.error(
      'VITE_CLERK_PUBLISHABLE_KEY is not set in environment variables'
    );
    return (
      <div className='flex min-h-screen items-center justify-center'>
        <div className='text-red-500'>
          Error: Clerk publishable key is missing. Please check your .env file.
        </div>
      </div>
    );
  }

  return (
    <ClerkProvider
      publishableKey={clerkPubKey}
      afterSignInUrl='/dashboard'
      afterSignUpUrl='/dashboard'
    >
      <BrowserRouter>
        <NuqsAdapter>
          <AppContent />
        </NuqsAdapter>
      </BrowserRouter>
    </ClerkProvider>
  );
}

export default App;
