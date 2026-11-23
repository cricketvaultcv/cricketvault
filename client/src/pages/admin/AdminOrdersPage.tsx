import React from 'react';
import { DashboardLayout } from '../../components/layout/DashboardLayout';
import { useApp } from '../../context/AppContext';
import { CreditCard, ShieldCheck, CheckCircle2 } from 'lucide-react';

export const AdminOrdersPage: React.FC = () => {
  const { subscriptions, users } = useApp();

  return (
    <DashboardLayout role="admin">
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900">Subscriptions &amp; Payments</h1>
          <p className="text-xs text-slate-500 mt-1">
            Review verified Razorpay transactions, plan tiers, and coaching durations.
          </p>
        </div>

        <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider">
                <tr>
                  <th className="p-4">Order ID</th>
                  <th className="p-4">Player</th>
                  <th className="p-4">Plan</th>
                  <th className="p-4">Amount</th>
                  <th className="p-4">Gateway</th>
                  <th className="p-4">Status</th>
                  <th className="p-4 text-right">Remaining Duration</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {subscriptions.map((sub) => {
                  const player = users.find((u) => u.id === sub.playerId);
                  return (
                    <tr key={sub.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="p-4 font-mono font-bold text-slate-900">
                        {sub.paymentDetails.orderId}
                      </td>
                      <td className="p-4 text-slate-800 font-semibold">
                        {player?.name || sub.playerId}
                      </td>
                      <td className="p-4 font-bold text-slate-900">{sub.planName}</td>
                      <td className="p-4 font-extrabold text-slate-900">₹{sub.price}</td>
                      <td className="p-4 text-slate-600">
                        Razorpay ({sub.paymentDetails.method})
                      </td>
                      <td className="p-4">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                            sub.status === 'active'
                              ? 'bg-emerald-100 text-emerald-800'
                              : sub.status === 'pending_coach'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-rose-100 text-rose-800'
                          }`}
                        >
                          {sub.status === 'active'
                            ? 'Active'
                            : sub.status === 'pending_coach'
                            ? 'Pending Coach'
                            : 'Expired'}
                        </span>
                      </td>
                      <td className="p-4 text-right font-bold text-slate-800">
                        {sub.daysRemaining} Days
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};
