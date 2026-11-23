import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Logo } from '../common/Logo';
import { RoleSwitcher } from '../common/RoleSwitcher';
import { useApp } from '../../context/AppContext';
import {
  LayoutDashboard,
  User as UserIcon,
  Film,
  Link2,
  CheckSquare,
  Users,
  CreditCard,
  Tag,
  BookOpen,
  TrendingUp,
  Bell,
  Settings,
  LogOut,
  Search,
  Menu,
  X,
  UserCheck,
  ShieldAlert,
  ClipboardList,
  Compass,
  ChevronRight,
} from 'lucide-react';

interface DashboardLayoutProps {
  children: React.ReactNode;
  role: 'player' | 'coach' | 'admin';
}

export const DashboardLayout: React.FC<DashboardLayoutProps> = ({ children, role }) => {
  const { currentUser, setGuestMode, notifications, markNotificationAsRead } = useApp();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const unreadNotifications = notifications.filter(
    (n) => currentUser && n.userId === currentUser.id && !n.isRead
  );

  // Define sidebar navigation items based on role
  const playerNav = [
    { label: 'Dashboard', path: '/player/dashboard', icon: LayoutDashboard },
    { label: 'My Profile', path: '/player/profile', icon: UserIcon },
    { label: 'My Videos', path: '/player/videos', icon: Film },
    { label: 'Share Video Link', path: '/player/videos/upload', icon: Link2 },
    { label: 'Action Plans & Tasks', path: '/player/action-plans', icon: CheckSquare },
    { label: 'Coach Assignment', path: '/player/assignment', icon: UserCheck },
    { label: 'Find Coaches', path: '/player/coaches', icon: Compass },
    { label: 'Subscription Plans', path: '/player/subscription', icon: CreditCard },
    { label: 'Resources', path: '/resources', icon: BookOpen },
    { label: 'Settings', path: '/player/settings', icon: Settings },
  ];

  const coachNav = [
    { label: 'Dashboard', path: '/coach/dashboard', icon: LayoutDashboard },
    { label: 'Review Requests', path: '/coach/requests', icon: ClipboardList },
    { label: 'Assigned Players', path: '/coach/players', icon: Users },
    { label: 'Review Workspace', path: '/coach/videos', icon: Film },
    { label: 'Profile & Settings', path: '/coach/settings', icon: Settings },
  ];

  const adminNav = [
    { label: 'Dashboard', path: '/admin/dashboard', icon: LayoutDashboard },
    { label: 'Users & Players', path: '/admin/players', icon: Users },
    { label: 'Coaches', path: '/admin/coaches', icon: UserCheck },
    { label: 'Subscriptions & Orders', path: '/admin/subscriptions', icon: CreditCard },
    { label: 'Plans & Coupons', path: '/admin/plans', icon: Tag },
    { label: 'Coach Assignments', path: '/admin/assignments', icon: ClipboardList },
    { label: 'Player Videos', path: '/admin/videos', icon: Film },
    { label: 'Resources Manager', path: '/admin/resources', icon: BookOpen },
    { label: 'Activity Log', path: '/admin/activity', icon: TrendingUp },
  ];

  const navItems = role === 'player' ? playerNav : role === 'coach' ? coachNav : adminNav;

  const handleLogout = () => {
    setGuestMode();
    navigate('/login');
  };

  if (!currentUser || currentUser.role !== role) {
    const roleLabel = role === 'admin' ? 'administrator' : role;
    return (
      <main className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <section className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm">
          <ShieldAlert className="mx-auto h-10 w-10 text-amber-600" />
          <h1 className="mt-4 text-xl font-bold text-slate-900">
            {currentUser ? 'Access denied' : 'Sign in required'}
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            {currentUser
              ? `This page requires a ${roleLabel} account. You are signed in as ${currentUser.role}.`
              : `Sign in with a ${roleLabel} account to open this page.`}
          </p>
          {currentUser ? (
            <button
              type="button"
              onClick={handleLogout}
              className="mt-5 rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white"
            >
              Sign out and switch account
            </button>
          ) : (
            <Link
              to="/login"
              className="mt-5 inline-block rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white"
            >
              Sign in
            </Link>
          )}
        </section>
      </main>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col lg:flex-row">
      {/* Desktop Sidebar (Matches dark slate/navy in Reference 1 & 2) */}
      <aside className="hidden lg:flex flex-col w-64 bg-[#0F172A] border-r border-slate-800 text-slate-300 min-h-screen shrink-0 sticky top-0 h-screen z-30">
        {/* Brand Header */}
        <div className="p-5 border-b border-slate-800/80">
          <Logo variant="light" />
        </div>

        {/* User Mini Card */}
        {currentUser && (
          <div className="px-4 py-3 mx-3 my-3 bg-slate-800/60 rounded-xl border border-slate-700/60 flex items-center gap-3">
            <img
              src={currentUser.avatar}
              alt={currentUser.name}
              className="w-9 h-9 rounded-full object-cover border border-[#00BFA6]"
            />
            <div className="overflow-hidden">
              <div className="font-semibold text-xs text-white truncate">{currentUser.name}</div>
              <div className="text-[10px] text-[#00BFA6] font-medium capitalize flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-[#00BFA6]"></span>
                {currentUser.role} Portal
              </div>
            </div>
          </div>
        )}

        {/* Navigation Links */}
        <nav className="flex-1 overflow-y-auto px-3 py-2 space-y-1 text-xs">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            const Icon = item.icon;
            return (
              <Link
                key={item.label}
                to={item.path}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl font-medium transition-all ${
                  isActive
                    ? 'bg-[#00BFA6] text-[#0F172A] font-bold shadow-sm'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/70'
                }`}
              >
                <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-[#0F172A]' : 'text-slate-400'}`} />
                <span className="truncate">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Bottom Actions */}
        <div className="p-3 border-t border-slate-800/80 space-y-1">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium text-rose-400 hover:bg-rose-500/10 transition-colors text-left"
          >
            <LogOut className="w-4 h-4" />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Header Bar */}
        <header className="sticky top-0 z-20 bg-white border-b border-slate-200 px-4 sm:px-6 h-16 flex items-center justify-between shadow-xs">
          {/* Mobile drawer toggle */}
          <div className="flex items-center gap-3 lg:hidden">
            <button
              onClick={() => setMobileSidebarOpen(true)}
              className="p-2 -ml-2 rounded-lg text-slate-600 hover:bg-slate-100"
            >
              <Menu className="w-5 h-5" />
            </button>
            <Logo variant="dark" showTagline={false} />
          </div>

          {/* Desktop Search bar */}
          <div className="hidden lg:flex items-center gap-2 flex-1 max-w-md">
            <div className="relative w-full">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search drills, reviews, coaches, or topics..."
                className="w-full pl-9 pr-4 py-1.5 text-xs bg-slate-100 hover:bg-slate-100/80 focus:bg-white border border-transparent focus:border-[#00BFA6] rounded-lg transition-all focus:outline-none text-slate-800 placeholder-slate-400"
              />
            </div>
          </div>

          {/* Right Header items */}
          <div className="flex items-center gap-1 sm:gap-3">
            {/* Quick Role Switcher */}
            <div className="hidden sm:block">
              <RoleSwitcher />
            </div>

            {/* Notifications Popover */}
            <div className="relative">
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className="p-2 rounded-full text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors relative"
                title="Notifications"
              >
                <Bell className="w-5 h-5" />
                {unreadNotifications.length > 0 && (
                  <span className="absolute top-1 right-1 w-2.5 h-2.5 rounded-full bg-[#00BFA6] ring-2 ring-white" />
                )}
              </button>

              {showNotifications && (
                <>
                  <div
                    className="fixed inset-0 z-30"
                    onClick={() => setShowNotifications(false)}
                  />
                  <div className="absolute right-0 mt-2 w-[min(24rem,calc(100vw-1rem))] rounded-2xl bg-white border border-slate-200 shadow-2xl text-slate-700 py-3 z-40">
                    <div className="px-4 pb-2 border-b border-slate-100 flex items-center justify-between">
                      <h4 className="font-bold text-sm text-slate-900">Notifications</h4>
                      <span className="text-xs font-semibold text-[#00BFA6]">
                        {unreadNotifications.length} New
                      </span>
                    </div>

                    <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
                      {notifications
                        .filter((n) => currentUser && n.userId === currentUser.id)
                        .map((n) => (
                          <div
                            key={n.id}
                            onClick={() => {
                              markNotificationAsRead(n.id);
                              if (n.link) {
                                navigate(n.link);
                                setShowNotifications(false);
                              }
                            }}
                            className={`p-3 text-xs cursor-pointer hover:bg-slate-50 transition-colors ${
                              !n.isRead ? 'bg-emerald-50/50 border-l-3 border-[#00BFA6]' : ''
                            }`}
                          >
                            <div className="font-semibold text-slate-900 flex items-center justify-between">
                              <span>{n.title}</span>
                              <span className="text-[10px] text-slate-400">{n.createdAt}</span>
                            </div>
                            <p className="text-slate-600 mt-1">{n.message}</p>
                          </div>
                        ))}
                      {notifications.filter((n) => currentUser && n.userId === currentUser.id).length === 0 && (
                        <div className="p-5 text-center text-slate-400 text-xs">
                          No notifications yet.
                        </div>
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Profile avatar */}
            {currentUser && (
              <img
                src={currentUser.avatar}
                alt={currentUser.name}
                className="w-8 h-8 rounded-full object-cover border-2 border-[#00BFA6]"
              />
            )}
          </div>
        </header>

        {/* Dashboard Main Content View */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full pb-20 lg:pb-8">
          {children}
        </main>

        {/* Mobile Bottom Navigation Bar (Matches Reference 3) */}
        <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-[#0F172A] border-t border-slate-800 text-white z-30 px-2 pt-1.5 pb-[calc(0.375rem+env(safe-area-inset-bottom))] flex items-center justify-around text-[10px]">
          <Link
            to={role === 'player' ? '/player/dashboard' : role === 'coach' ? '/coach/dashboard' : '/admin/dashboard'}
            className="flex flex-col items-center py-1 px-3 text-slate-400 hover:text-[#00BFA6] focus:text-[#00BFA6]"
          >
            <LayoutDashboard className="w-5 h-5 mb-0.5" />
            <span>Home</span>
          </Link>

          {role === 'player' && (
            <>
              <Link
                to="/player/videos"
                className="flex flex-col items-center py-1 px-3 text-slate-400 hover:text-[#00BFA6]"
              >
                <Film className="w-5 h-5 mb-0.5" />
                <span>Videos</span>
              </Link>
              <Link
                to="/player/videos/upload"
                className="flex flex-col items-center py-1 px-3 text-[#00BFA6]"
              >
                <div className="w-9 h-9 -mt-4 rounded-full bg-[#00BFA6] text-[#0F172A] flex items-center justify-center shadow-lg">
                  <Link2 className="w-5 h-5" />
                </div>
                <span className="mt-0.5 font-bold">Share Link</span>
              </Link>
              <Link
                to="/resources"
                className="flex flex-col items-center py-1 px-3 text-slate-400 hover:text-[#00BFA6]"
              >
                <BookOpen className="w-5 h-5 mb-0.5" />
                <span>Drills</span>
              </Link>
              <Link
                to="/player/profile"
                className="flex flex-col items-center py-1 px-3 text-slate-400 hover:text-[#00BFA6]"
              >
                <UserIcon className="w-5 h-5 mb-0.5" />
                <span>Profile</span>
              </Link>
            </>
          )}

          {role === 'coach' && (
            <>
              <Link
                to="/coach/requests"
                className="flex flex-col items-center py-1 px-3 text-slate-400 hover:text-[#00BFA6]"
              >
                <ClipboardList className="w-5 h-5 mb-0.5" />
                <span>Requests</span>
              </Link>
              <Link
                to="/coach/videos"
                className="flex flex-col items-center py-1 px-3 text-slate-400 hover:text-[#00BFA6]"
              >
                <Film className="w-5 h-5 mb-0.5" />
                <span>Workspace</span>
              </Link>
              <Link
                to="/coach/players"
                className="flex flex-col items-center py-1 px-3 text-slate-400 hover:text-[#00BFA6]"
              >
                <Users className="w-5 h-5 mb-0.5" />
                <span>Players</span>
              </Link>
            </>
          )}

          {role === 'admin' && (
            <>
              <Link
                to="/admin/players"
                className="flex flex-col items-center py-1 px-3 text-slate-400 hover:text-[#00BFA6]"
              >
                <Users className="w-5 h-5 mb-0.5" />
                <span>Users</span>
              </Link>
              <Link
                to="/admin/subscriptions"
                className="flex flex-col items-center py-1 px-3 text-slate-400 hover:text-[#00BFA6]"
              >
                <CreditCard className="w-5 h-5 mb-0.5" />
                <span>Orders</span>
              </Link>
              <Link
                to="/admin/assignments"
                className="flex flex-col items-center py-1 px-3 text-slate-400 hover:text-[#00BFA6]"
              >
                <ClipboardList className="w-5 h-5 mb-0.5" />
                <span>Assigned</span>
              </Link>
            </>
          )}
        </nav>
      </div>

      {/* Mobile Sidebar Overlay */}
      {mobileSidebarOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setMobileSidebarOpen(false)}
          />
          <div className="relative w-[min(18rem,85vw)] bg-[#0F172A] border-r border-slate-800 text-slate-200 h-full flex flex-col z-50 p-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <Logo variant="light" />
              <button
                onClick={() => setMobileSidebarOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mt-3">
              <RoleSwitcher />
            </div>

            <nav className="mt-4 flex-1 overflow-y-auto space-y-1 text-xs">
              {navItems.map((item) => {
                const isActive = location.pathname === item.path;
                const Icon = item.icon;
                return (
                  <Link
                    key={item.label}
                    to={item.path}
                    onClick={() => setMobileSidebarOpen(false)}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-xl font-medium transition-colors ${
                      isActive
                        ? 'bg-[#00BFA6] text-[#0F172A] font-bold'
                        : 'text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </nav>

            <div className="pt-3 border-t border-slate-800">
              <button
                onClick={() => {
                  setMobileSidebarOpen(false);
                  handleLogout();
                }}
                className="w-full flex items-center justify-center gap-2 py-2 rounded-lg bg-slate-800 text-rose-400 text-xs font-semibold"
              >
                <LogOut className="w-4 h-4" />
                <span>Logout</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
