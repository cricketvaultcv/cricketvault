import React from 'react';
import { Link } from 'react-router-dom';
import { DashboardLayout } from '../../components/layout/DashboardLayout';
import { useApp } from '../../context/AppContext';
import {
  Users,
  UserCheck,
  CreditCard,
  Clock,
  BookOpen,
  Settings,
  Plus,
  ArrowRight,
  Activity,
} from 'lucide-react';

export const AdminDashboard: React.FC = () => {
  const { users, subscriptions, videos, activities } = useApp();

  const totalUsers = users.length;
  const totalCoaches = users.filter((user) => user.role === 'coach').length;
  const totalOrders = subscriptions.length;
  const pendingReviews = videos.filter((video) => video.status === 'pending').length;

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'user':
        return <Users className="w-4 h-4 text-blue-500" />;
      case 'review':
        return <Clock className="w-4 h-4 text-amber-500" />;
      case 'payment':
        return <CreditCard className="w-4 h-4 text-emerald-500" />;
      case 'resource':
        return <BookOpen className="w-4 h-4 text-indigo-500" />;
      default:
        return <Activity className="w-4 h-4 text-[#00BFA6]" />;
    }
  };

  return (
    <DashboardLayout role="admin">
      <div className="space-y-6">
        {/* Welcome Header */}
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900">
            Admin Dashboard
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Platform overview, user accounts, coach assignments, and transaction logs.
          </p>
        </div>

        {/* Platform statistics */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs space-y-1">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-xs font-semibold uppercase">Total Users</span>
              <Users className="w-4 h-4 text-blue-500" />
            </div>
            <div className="text-3xl font-black text-slate-900">{totalUsers}</div>
            <div className="text-[11px] text-slate-500 font-semibold">Registered accounts</div>
          </div>

          <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs space-y-1">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-xs font-semibold uppercase">Total Coaches</span>
              <UserCheck className="w-4 h-4 text-[#00BFA6]" />
            </div>
            <div className="text-3xl font-black text-slate-900">{totalCoaches}</div>
            <div className="text-[11px] text-slate-500 font-semibold">Coach accounts</div>
          </div>

          <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs space-y-1">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-xs font-semibold uppercase">Subscriptions</span>
              <CreditCard className="w-4 h-4 text-indigo-500" />
            </div>
            <div className="text-3xl font-black text-slate-900">{totalOrders}</div>
            <div className="text-[11px] text-slate-500 font-semibold">Subscription records</div>
          </div>

          <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs space-y-1">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-xs font-semibold uppercase">Pending Reviews</span>
              <Clock className="w-4 h-4 text-amber-500" />
            </div>
            <div className="text-3xl font-black text-amber-500">{pendingReviews}</div>
            <div className="text-[11px] text-slate-500">Awaiting coach feedback</div>
          </div>
        </div>

        {/* Recent Activity Timeline (Matches Reference 1 Screen 8) */}
        <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-extrabold text-base text-slate-900 flex items-center gap-2">
              <Activity className="w-5 h-5 text-[#00BFA6]" />
              <span>Recent Activity</span>
            </h3>
            <Link
              to="/admin/activity"
              className="text-xs font-bold text-[#00BFA6] hover:underline"
            >
              View Full Audit Log &rarr;
            </Link>
          </div>

          {/* Activity Timeline List (Matches Screen 8) */}
          <div className="divide-y divide-slate-100">
            {activities.map((act) => (
              <div key={act.id} className="py-3 flex items-center justify-between text-xs">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center shrink-0">
                    {getActivityIcon(act.type)}
                  </div>
                  <div>
                    <div className="font-bold text-slate-800">{act.action}</div>
                    <div className="text-[11px] text-slate-500">
                      {act.user} &bull; {act.target}
                    </div>
                  </div>
                </div>
                <span className="text-[11px] text-slate-400 font-medium">{act.time}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Actions (Matches Reference 1 Screen 8: Manage Users, Add Resource, View Orders, System Settings) */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-extrabold text-sm text-slate-900 uppercase tracking-wider">
              Quick Actions
            </h3>
            <span className="text-xs text-slate-400">Shortcuts</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <Link
              to="/admin/players"
              className="p-5 rounded-2xl bg-white border border-slate-200 hover:border-[#00BFA6]/40 hover:shadow-md transition-all flex flex-col items-center text-center gap-2 group"
            >
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-colors">
                <Users className="w-5 h-5" />
              </div>
              <div className="font-bold text-xs text-slate-900">Manage Users</div>
            </Link>

            <Link
              to="/admin/resources"
              className="p-5 rounded-2xl bg-white border border-slate-200 hover:border-[#00BFA6]/40 hover:shadow-md transition-all flex flex-col items-center text-center gap-2 group"
            >
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-[#00BFA6] flex items-center justify-center group-hover:bg-[#00BFA6] group-hover:text-[#0F172A] transition-colors">
                <BookOpen className="w-5 h-5" />
              </div>
              <div className="font-bold text-xs text-slate-900">Add Resource</div>
            </Link>

            <Link
              to="/admin/subscriptions"
              className="p-5 rounded-2xl bg-white border border-slate-200 hover:border-[#00BFA6]/40 hover:shadow-md transition-all flex flex-col items-center text-center gap-2 group"
            >
              <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                <CreditCard className="w-5 h-5" />
              </div>
              <div className="font-bold text-xs text-slate-900">View Orders</div>
            </Link>

            <Link
              to="/admin/assignments"
              className="p-5 rounded-2xl bg-white border border-slate-200 hover:border-[#00BFA6]/40 hover:shadow-md transition-all flex flex-col items-center text-center gap-2 group"
            >
              <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center group-hover:bg-slate-800 group-hover:text-white transition-colors">
                <Settings className="w-5 h-5" />
              </div>
              <div className="font-bold text-xs text-slate-900">System Settings</div>
            </Link>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};
