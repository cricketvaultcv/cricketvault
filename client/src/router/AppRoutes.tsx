import React from 'react';
import { Routes, Route, Navigate, Outlet, useLocation } from 'react-router-dom';
import { useApp } from '../context/AppContext';

// Public Pages
import { LandingPage } from '../pages/public/LandingPage';
import { LoginPage } from '../pages/public/LoginPage';
import { ForgotPasswordPage } from '../pages/public/ForgotPasswordPage';
import { ResourcesPage } from '../pages/public/ResourcesPage';
import { ResourceDetailPage } from '../pages/public/ResourceDetailPage';
import { PricingPage } from '../pages/public/PricingPage';
import { CoachDirectoryPage } from '../pages/public/CoachDirectoryPage';
import { NotFoundPage } from '../pages/public/NotFoundPage';
import { VerifyEmailPage } from '../pages/public/VerifyEmailPage';
import { VerifyPhonePage } from '../pages/public/VerifyPhonePage';
import { VerifySignupEmailPage } from '../pages/public/VerifySignupEmailPage';

// Player Pages
import { PlayerDashboard } from '../pages/player/PlayerDashboard';
import { PlayerProfilePage } from '../pages/player/PlayerProfilePage';
import { PlayerSubscriptionPage } from '../pages/player/PlayerSubscriptionPage';
import { PlayerCoachAssignmentPage } from '../pages/player/PlayerCoachAssignmentPage';
import { PlayerVideosPage } from '../pages/player/PlayerVideosPage';
import { PlayerVideoUploadPage } from '../pages/player/PlayerVideoUploadPage';
import { PlayerVideoDetailPage } from '../pages/player/PlayerVideoDetailPage';
import { PlayerActionPlansPage } from '../pages/player/PlayerActionPlansPage';
import { PlayerNotificationsPage } from '../pages/player/PlayerNotificationsPage';
import { PlayerSettingsPage } from '../pages/player/PlayerSettingsPage';

// Coach Pages
import { CoachDashboard } from '../pages/coach/CoachDashboard';
import { CoachRequestsPage } from '../pages/coach/CoachRequestsPage';
import { CoachAssignedPlayersPage } from '../pages/coach/CoachAssignedPlayersPage';
import { CoachPlayerDetailPage } from '../pages/coach/CoachPlayerDetailPage';
import { CoachVideoReviewWorkspace } from '../pages/coach/CoachVideoReviewWorkspace';
import { CoachProfileSettingsPage } from '../pages/coach/CoachProfileSettingsPage';

// Admin Pages
import { AdminDashboard } from '../pages/admin/AdminDashboard';
import { AdminUsersPage } from '../pages/admin/AdminUsersPage';
import { AdminOrdersPage } from '../pages/admin/AdminOrdersPage';
import { AdminAssignmentsPage } from '../pages/admin/AdminAssignmentsPage';
import { AdminResourcesPage } from '../pages/admin/AdminResourcesPage';
import { AdminActivityPage } from '../pages/admin/AdminActivityPage';
import { AdminVideosPage } from '../pages/admin/AdminVideosPage';
import { AdminPlansPage } from '../pages/admin/AdminPlansPage';

const NonAdminPortalOnly: React.FC = () => {
  const { currentUser, authInitialized } = useApp();
  const hasSavedToken = Boolean(localStorage.getItem('cricketvault_token'));

  if (hasSavedToken && !authInitialized) return null;
  if (currentUser?.role === 'admin') {
    return <Navigate to="/admin/dashboard" replace />;
  }
  if (currentUser?.role === 'coach') {
    return <Navigate to="/coach/dashboard" replace />;
  }
  return <Outlet />;
};

const AdminPortalOnly: React.FC = () => {
  const { currentUser, authInitialized } = useApp();
  const location = useLocation();
  const hasSavedToken = Boolean(localStorage.getItem('cricketvault_token'));

  if (hasSavedToken && !authInitialized) return null;
  if (currentUser?.role === 'admin') return <Outlet />;
  if (!currentUser) {
    const redirect = encodeURIComponent(`${location.pathname}${location.search}`);
    return <Navigate to={`/login?redirect=${redirect}`} replace />;
  }
  return <Navigate to={currentUser.role === 'coach' ? '/coach/dashboard' : '/player/dashboard'} replace />;
};

const NotAdminOnly: React.FC = () => {
  const { currentUser, authInitialized } = useApp();
  const hasSavedToken = Boolean(localStorage.getItem('cricketvault_token'));

  if (hasSavedToken && !authInitialized) return null;
  if (currentUser?.role === 'admin') {
    return <Navigate to="/admin/dashboard" replace />;
  }
  return <Outlet />;
};

const SignedInResourcesOnly: React.FC = () => {
  const { currentUser, authInitialized } = useApp();
  const location = useLocation();
  const hasSavedToken = Boolean(localStorage.getItem('cricketvault_token'));

  if (hasSavedToken && !authInitialized) return null;
  if (!currentUser) {
    const redirect = encodeURIComponent(`${location.pathname}${location.search}`);
    return <Navigate to={`/login?redirect=${redirect}`} replace />;
  }
  return <Outlet />;
};

export const AppRoutes: React.FC = () => {
  return (
    <Routes>
      <Route element={<NonAdminPortalOnly />}>
        {/* Public routes */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<LoginPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/verify-email" element={<VerifyEmailPage />} />
        <Route path="/verify-phone" element={<VerifyPhonePage />} />
        <Route path="/verify-signup-email" element={<VerifySignupEmailPage />} />
        <Route element={<SignedInResourcesOnly />}>
          <Route path="/resources" element={<ResourcesPage />} />
          <Route path="/resources/:resourceId" element={<ResourceDetailPage />} />
          <Route path="/coaches" element={<CoachDirectoryPage />} />
        </Route>
        <Route path="/pricing" element={<PricingPage />} />

        {/* Player portal routes */}
        <Route path="/player/dashboard" element={<PlayerDashboard />} />
        <Route path="/player/profile" element={<PlayerProfilePage />} />
        <Route path="/player/plans" element={<PricingPage />} />
        <Route path="/player/checkout" element={<PricingPage />} />
        <Route path="/player/subscription" element={<PlayerSubscriptionPage />} />
        <Route path="/player/coaches" element={<CoachDirectoryPage />} />
        <Route path="/player/assignment" element={<PlayerCoachAssignmentPage />} />
        <Route path="/player/videos" element={<PlayerVideosPage />} />
        <Route path="/player/videos/upload" element={<PlayerVideoUploadPage />} />
        <Route path="/player/videos/:videoId" element={<PlayerVideoDetailPage />} />
        <Route path="/player/action-plans" element={<PlayerActionPlansPage />} />
        <Route path="/player/notifications" element={<PlayerNotificationsPage />} />
        <Route path="/player/settings" element={<PlayerSettingsPage />} />

        {/* 404 catch-all */}
        <Route path="*" element={<NotFoundPage />} />
      </Route>

      <Route element={<AdminPortalOnly />}>
        <Route path="/admin" element={<Navigate to="/admin/dashboard" replace />} />
        <Route path="/admin/dashboard" element={<AdminDashboard />} />
        <Route path="/admin/players" element={<AdminUsersPage />} />
        <Route path="/admin/coaches" element={<AdminUsersPage />} />
        <Route path="/admin/subscriptions" element={<AdminOrdersPage />} />
        <Route path="/admin/plans" element={<AdminPlansPage />} />
        <Route path="/admin/assignments" element={<AdminAssignmentsPage />} />
        <Route path="/admin/videos" element={<AdminVideosPage />} />
        <Route path="/admin/resources" element={<AdminResourcesPage />} />
        <Route path="/admin/activity" element={<AdminActivityPage />} />
      </Route>

      <Route element={<NotAdminOnly />}>
        {/* Coach portal routes */}
        <Route path="/coach/dashboard" element={<CoachDashboard />} />
        <Route path="/coach/requests" element={<CoachRequestsPage />} />
        <Route path="/coach/players" element={<CoachAssignedPlayersPage />} />
        <Route path="/coach/players/:playerId" element={<CoachPlayerDetailPage />} />
        <Route path="/coach/videos" element={<CoachVideoReviewWorkspace />} />
        <Route path="/coach/videos/:videoId/review" element={<CoachVideoReviewWorkspace />} />
        <Route path="/coach/action-plans" element={<CoachVideoReviewWorkspace />} />
        <Route path="/coach/profile" element={<CoachProfileSettingsPage />} />
        <Route path="/coach/notifications" element={<CoachRequestsPage />} />
        <Route path="/coach/settings" element={<CoachProfileSettingsPage />} />
      </Route>
    </Routes>
  );
};
