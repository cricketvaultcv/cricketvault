import React from 'react';
import { useNavigate } from 'react-router-dom';
import { DashboardLayout } from '../../components/layout/DashboardLayout';
import { useApp } from '../../context/AppContext';
import { Bell, CheckCircle, Clock, Trash2, ArrowRight } from 'lucide-react';
import { notify } from '../../services/toast';

export const PlayerNotificationsPage: React.FC = () => {
  const { notifications, currentUser, markNotificationAsRead, markAllNotificationsAsRead } = useApp();
  const navigate = useNavigate();

  const userNotifs = notifications.filter((n) => currentUser && n.userId === currentUser.id);
  const markAllAsRead = async () => {
    try {
      await markAllNotificationsAsRead();
    } catch (error) {
      notify.error(error instanceof Error ? error.message : 'Unable to update notifications.');
    }
  };
  const openNotification = async (id: string, link?: string) => {
    try {
      await markNotificationAsRead(id);
      if (link) navigate(link);
    } catch (error) {
      notify.error(error instanceof Error ? error.message : 'Unable to update notification.');
    }
  };

  return (
    <DashboardLayout role="player">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-extrabold text-slate-900">Notifications &amp; Activity</h1>
            <p className="text-xs text-slate-500 mt-1">
              Review updates on coach feedback, assignment statuses, and training reminders.
            </p>
          </div>

          {userNotifs.some((n) => !n.isRead) && (
            <button
              onClick={markAllAsRead}
              className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs"
            >
              Mark All as Read
            </button>
          )}
        </div>

        <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-xs divide-y divide-slate-100">
          {userNotifs.length > 0 ? (
            userNotifs.map((n) => (
              <div
                key={n.id}
                onClick={() => openNotification(n.id, n.link)}
                className={`p-5 flex items-start gap-4 cursor-pointer hover:bg-slate-50 transition-colors ${
                  !n.isRead ? 'bg-emerald-50/40 border-l-4 border-[#00BFA6]' : ''
                }`}
              >
                <div
                  className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${
                    !n.isRead ? 'bg-[#00BFA6] text-[#0F172A]' : 'bg-slate-100 text-slate-500'
                  }`}
                >
                  <Bell className="w-5 h-5" />
                </div>

                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-sm text-slate-900">{n.title}</h3>
                    <span className="text-[11px] text-slate-400">{n.createdAt}</span>
                  </div>
                  <p className="text-xs text-slate-600 mt-1">{n.message}</p>
                  {n.link && (
                    <div className="mt-2 text-xs font-bold text-[#00BFA6] flex items-center gap-1">
                      <span>View details</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </div>
                  )}
                </div>
              </div>
            ))
          ) : (
            <div className="p-12 text-center text-slate-400 text-xs">
              No notifications at this time.
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
};
