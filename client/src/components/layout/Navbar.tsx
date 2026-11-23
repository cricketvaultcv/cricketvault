import React, { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Logo } from '../common/Logo';
import { RoleSwitcher } from '../common/RoleSwitcher';
import { useApp } from '../../context/AppContext';
import { notify } from '../../services/toast';
import {
  Search,
  Bell,
  Menu,
  X,
  User as UserIcon,
  LogOut,
  LayoutDashboard,
  Film,
  BookOpen,
  Settings,
  ChevronRight,
  ShieldCheck,
} from 'lucide-react';

export const Navbar: React.FC = () => {
  const { currentUser, notifications, markNotificationAsRead, setGuestMode } = useApp();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [openPopover, setOpenPopover] = useState<'notifications' | 'profile' | null>(null);
  const notificationsRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!openPopover) return;
    const closeOnOutsideClick = (event: PointerEvent) => {
      const target = event.target as Node;
      if (!notificationsRef.current?.contains(target) && !profileRef.current?.contains(target)) {
        setOpenPopover(null);
      }
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpenPopover(null);
    };
    document.addEventListener('pointerdown', closeOnOutsideClick);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('pointerdown', closeOnOutsideClick);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [openPopover]);

  const unreadNotifications = notifications.filter(
    (n) => currentUser && n.userId === currentUser.id && !n.isRead
  );
  const openNotification = async (id: string, link?: string) => {
    try {
      await markNotificationAsRead(id);
      if (link) {
        navigate(link);
        setOpenPopover(null);
      }
    } catch (error) {
      notify.error(error instanceof Error ? error.message : 'Unable to update notification.');
    }
  };

  const getDashboardPath = () => {
    if (!currentUser) return '/login';
    if (currentUser.role === 'coach') return '/coach/dashboard';
    if (currentUser.role === 'admin') return '/admin/dashboard';
    return '/player/dashboard';
  };

  const navLinks = [
    { label: 'Home', path: '/' },
    { label: 'Resources', path: '/resources' },
    { label: 'Coaches', path: '/coaches' },
    { label: 'Pricing', path: '/pricing' },
  ];

  return (
    <header className="sticky top-0 z-40 bg-[#0F172A] border-b border-slate-800 text-white shadow-md">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 h-16 sm:h-[4.5rem] flex items-center justify-between gap-2">
        {/* Logo */}
        <Logo variant="light" />

        {/* Desktop Nav */}
        <nav className="hidden lg:flex items-center gap-7 text-sm font-medium text-slate-300">
          {navLinks.map((link) => {
            const isActive = location.pathname === link.path;
            return (
              <Link
                key={link.label}
                to={link.path}
                className={`transition-colors hover:text-[#00BFA6] ${
                  isActive ? 'text-[#00BFA6] font-semibold' : ''
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        {/* Right Section */}
        <div className="flex items-center gap-1 sm:gap-3">
          {/* Role Switcher Pill */}
          <div className="hidden sm:block">
            <RoleSwitcher />
          </div>

          {/* Notifications */}
          {currentUser && (
            <div ref={notificationsRef} className="relative">
              <button
                onClick={() => setOpenPopover(openPopover === 'notifications' ? null : 'notifications')}
                className="relative p-2 rounded-full text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
                title="Notifications"
                aria-label="Notifications"
                aria-expanded={openPopover === 'notifications'}
              >
                <Bell className="w-5 h-5" />
                {unreadNotifications.length > 0 && (
                  <span className="absolute top-1 right-1 w-2.5 h-2.5 rounded-full bg-[#00BFA6] ring-2 ring-[#0F172A]" />
                )}
              </button>

              {openPopover === 'notifications' && (
                <>
                  <div className="absolute right-0 mt-2 w-[min(24rem,calc(100vw-1rem))] rounded-xl bg-slate-900 border border-slate-700 shadow-2xl text-slate-200 py-3 z-40">
                    <div className="px-4 pb-2 border-b border-slate-800 flex items-center justify-between">
                      <h4 className="font-semibold text-sm text-white">Notifications</h4>
                      <span className="text-[11px] text-[#00BFA6] font-medium">
                        {unreadNotifications.length} Unread
                      </span>
                    </div>

                    <div className="max-h-80 overflow-y-auto divide-y divide-slate-800">
                      {notifications
                        .filter((n) => n.userId === currentUser.id)
                        .slice(0, 5)
                        .map((n) => (
                          <div
                            key={n.id}
                            onClick={() => openNotification(n.id, n.link)}
                            className={`p-3 text-xs cursor-pointer hover:bg-slate-800/70 transition-colors ${
                              !n.isRead ? 'bg-slate-800/40 border-l-2 border-[#00BFA6]' : ''
                            }`}
                          >
                            <div className="font-medium text-white flex items-center justify-between">
                              <span>{n.title}</span>
                              <span className="text-[10px] text-slate-400">{n.createdAt}</span>
                            </div>
                            <p className="text-slate-300 mt-1 line-clamp-2">{n.message}</p>
                          </div>
                        ))}
                      {notifications.filter((n) => n.userId === currentUser.id).length === 0 && (
                        <div className="p-4 text-center text-slate-400 text-xs">
                          No notifications yet.
                        </div>
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Auth State / Profile */}
          {currentUser ? (
            <div ref={profileRef} className="relative">
              <button
                onClick={() => setOpenPopover(openPopover === 'profile' ? null : 'profile')}
                className="flex items-center gap-2 pl-2 pr-3 py-1.5 rounded-full hover:bg-slate-800 transition-colors border border-slate-700/60"
                aria-label="Open profile menu"
                aria-expanded={openPopover === 'profile'}
              >
                <img
                  src={currentUser.avatar}
                  alt={currentUser.name}
                  className="w-7 h-7 rounded-full object-cover border border-[#00BFA6]"
                />
                <span className="hidden sm:inline text-xs font-semibold text-slate-200">
                  {currentUser.name}
                </span>
              </button>

              {openPopover === 'profile' && (
                <>
                  <div className="absolute right-0 mt-2 w-[min(14rem,calc(100vw-1rem))] rounded-xl bg-slate-900 border border-slate-700 shadow-2xl text-slate-200 py-2 z-40 text-xs">
                    <div className="px-4 py-2 border-b border-slate-800">
                      <div className="font-semibold text-white">{currentUser.name}</div>
                      <div className="text-[11px] text-[#00BFA6] capitalize">{currentUser.role} Account</div>
                    </div>

                    <div className="p-1 space-y-0.5">
                      <Link
                        to={getDashboardPath()}
                        onClick={() => setOpenPopover(null)}
                        className="flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-slate-800 text-slate-200"
                      >
                        <LayoutDashboard className="w-4 h-4 text-[#00BFA6]" />
                        <span>Dashboard</span>
                      </Link>

                      {currentUser.role === 'player' && (
                        <>
                          <Link
                            to="/player/profile"
                            onClick={() => setOpenPopover(null)}
                            className="flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-slate-800 text-slate-200"
                          >
                            <UserIcon className="w-4 h-4 text-slate-400" />
                            <span>My Cricket Profile</span>
                          </Link>
                          <Link
                            to="/player/videos"
                            onClick={() => setOpenPopover(null)}
                            className="flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-slate-800 text-slate-200"
                          >
                            <Film className="w-4 h-4 text-slate-400" />
                            <span>My Videos & Feedback</span>
                          </Link>
                        </>
                      )}

                      <Link
                        to="/resources"
                        onClick={() => setOpenPopover(null)}
                        className="flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-slate-800 text-slate-200"
                      >
                        <BookOpen className="w-4 h-4 text-slate-400" />
                        <span>Cricket Resources</span>
                      </Link>

                      <button
                        onClick={() => {
                          setGuestMode();
                          setOpenPopover(null);
                          navigate('/login');
                        }}
                        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-red-500/10 text-red-400 text-left"
                      >
                        <LogOut className="w-4 h-4" />
                        <span>Log Out</span>
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link
                to="/login"
                className="px-2 sm:px-4 py-2 rounded-lg text-xs font-semibold text-slate-300 hover:text-white transition-colors"
              >
                Login
              </Link>
              <Link
                to="/signup"
                className="px-2 sm:px-4 py-2 rounded-lg text-xs font-bold bg-[#00BFA6] text-[#0F172A] hover:bg-[#00D6BA] transition-colors shadow-sm"
              >
                Sign Up
              </Link>
            </div>
          )}

          {/* Mobile hamburger */}
          <button
            onClick={() => setMobileMenuOpen(true)}
            className="lg:hidden p-2 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800"
            aria-label="Open menu"
            aria-expanded={mobileMenuOpen}
          >
            <Menu className="w-6 h-6" />
          </button>
        </div>
      </div>

      {/* Mobile Drawer (Matches Reference 3 screen 10) */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 flex">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setMobileMenuOpen(false)}
          />

          {/* Drawer Body */}
          <div className="relative w-[min(20rem,85vw)] bg-[#0F172A] border-r border-slate-800 text-white h-full flex flex-col z-50 shadow-2xl p-4">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <Logo variant="light" />
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* User Banner in Drawer (from screen 10) */}
            {currentUser ? (
              <div className="mt-4 p-3 bg-slate-800/80 rounded-xl border border-slate-700 flex items-center gap-3">
                <img
                  src={currentUser.avatar}
                  alt={currentUser.name}
                  className="w-10 h-10 rounded-full object-cover border border-[#00BFA6]"
                />
                <div className="overflow-hidden">
                  <div className="font-bold text-sm text-white truncate">{currentUser.name}</div>
                  <span className="inline-block px-1.5 py-0.5 rounded text-[10px] bg-[#00BFA6]/20 text-[#00BFA6] font-medium capitalize">
                    {currentUser.role}
                  </span>
                </div>
              </div>
            ) : (
              <div className="mt-4 p-3 bg-slate-800/50 rounded-xl border border-slate-700/60">
                <div className="text-xs text-slate-300 font-medium">Welcome to CricketVault</div>
                <div className="flex gap-2 mt-2">
                  <Link
                    to="/login"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex-1 py-1.5 text-center text-xs font-semibold bg-slate-700 rounded-lg text-white"
                  >
                    Login
                  </Link>
                  <Link
                    to="/signup"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex-1 py-1.5 text-center text-xs font-bold bg-[#00BFA6] text-[#0F172A] rounded-lg"
                  >
                    Sign Up
                  </Link>
                </div>
              </div>
            )}

            {/* Switch persona on mobile */}
            <div className="mt-4">
              <RoleSwitcher />
            </div>

            {/* Navigation links */}
            <div className="mt-5 flex-1 overflow-y-auto space-y-1">
              <Link
                to="/"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium text-slate-300 hover:bg-slate-800 hover:text-white"
              >
                <span>Home</span>
                <ChevronRight className="w-4 h-4 text-slate-500" />
              </Link>

              {currentUser && (
                <Link
                  to={getDashboardPath()}
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium text-[#00BFA6] bg-[#00BFA6]/10"
                >
                  <span>My Dashboard</span>
                  <ChevronRight className="w-4 h-4 text-[#00BFA6]" />
                </Link>
              )}

              <Link
                to="/coaches"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium text-slate-300 hover:bg-slate-800 hover:text-white"
              >
                <span>Find Coaches</span>
                <ChevronRight className="w-4 h-4 text-slate-500" />
              </Link>

              <Link
                to="/resources"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium text-slate-300 hover:bg-slate-800 hover:text-white"
              >
                <span>E-books & Guides</span>
                <ChevronRight className="w-4 h-4 text-slate-500" />
              </Link>

              <Link
                to="/pricing"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium text-slate-300 hover:bg-slate-800 hover:text-white"
              >
                <span>Subscription Plans</span>
                <ChevronRight className="w-4 h-4 text-slate-500" />
              </Link>
            </div>

            {/* Footer in Drawer */}
            <div className="pt-4 border-t border-slate-800 space-y-2 text-xs text-slate-400">
              <div className="flex items-center gap-1.5 text-slate-400">
                <ShieldCheck className="w-4 h-4 text-[#00BFA6]" />
                <span>Secure Payments with Razorpay</span>
              </div>
              {currentUser && (
                <button
                  onClick={() => {
                    setGuestMode();
                    setMobileMenuOpen(false);
                    navigate('/');
                  }}
                  className="w-full flex items-center justify-center gap-2 py-2 rounded-lg bg-slate-800 text-red-400 font-medium hover:bg-slate-700"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Log Out</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  );
};
