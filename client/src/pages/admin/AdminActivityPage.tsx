import React from 'react';
import { DashboardLayout } from '../../components/layout/DashboardLayout';
import { useApp } from '../../context/AppContext';
import { Activity, Users, CreditCard, Clock, BookOpen } from 'lucide-react';

export const AdminActivityPage: React.FC = () => {
  const { activities } = useApp();

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
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900">Platform Audit Activity Log</h1>
          <p className="text-xs text-slate-500 mt-1">
            Real-time feed of user registrations, order transactions, coach assignments, and reviews.
          </p>
        </div>

        <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs divide-y divide-slate-100">
          {activities.map((act) => (
            <div key={act.id} className="py-3.5 flex items-center justify-between text-xs">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center shrink-0">
                  {getActivityIcon(act.type)}
                </div>
                <div>
                  <div className="font-bold text-slate-900">{act.action}</div>
                  <div className="text-[11px] text-slate-500">
                    Initiator: <span className="font-semibold text-slate-700">{act.user}</span> &bull; Target: {act.target}
                  </div>
                </div>
              </div>
              <span className="text-[11px] text-slate-400 font-medium">{act.time}</span>
            </div>
          ))}
        </div>
      </div>
    </DashboardLayout>
  );
};
