import React, { useCallback, useEffect, useState } from 'react';
import { DashboardLayout } from '../../components/layout/DashboardLayout';
import { useApp } from '../../context/AppContext';
import { UserPlus } from 'lucide-react';
import { notify } from '../../services/toast';
import { apiClient, apiErrorMessage } from '../../services/api';

type AssignableSubscription = {
  _id: string;
  createdAt: string;
  planSnapshot?: { name?: string };
  plan?: { name?: string };
  player?: { _id: string; name: string; email: string };
};

type AvailableCoach = {
  id: string;
  name: string;
  activeCount: number;
  reservedCount: number;
  capacity: number;
};

export const AdminAssignmentsPage: React.FC = () => {
  const { coachRequests, respondToCoachRequest, refresh } = useApp();
  const [assignable, setAssignable] = useState<AssignableSubscription[]>([]);
  const [availableCoaches, setAvailableCoaches] = useState<AvailableCoach[]>([]);
  const [selectedCoachIds, setSelectedCoachIds] = useState<Record<string, string>>({});
  const [assigningId, setAssigningId] = useState<string | null>(null);

  const loadAssignable = useCallback(async () => {
    try {
      const { data } = await apiClient.get('/admin/assignable-subscriptions');
      setAssignable(data.subscriptions || []);
      setAvailableCoaches(data.coaches || []);
    } catch (error) {
      notify.error(apiErrorMessage(error));
    }
  }, []);

  useEffect(() => {
    void loadAssignable();
  }, [loadAssignable]);

  const handleDecision = async (requestId: string, accepted: boolean) => {
    try {
      await respondToCoachRequest(requestId, accepted ? 'accepted' : 'rejected', 'Admin re-routed');
    } catch (error) {
      notify.error(error instanceof Error ? error.message : 'Unable to update the assignment.');
    }
  };

  const handleAssign = async (subscriptionId: string) => {
    const coachId = selectedCoachIds[subscriptionId];
    if (!coachId) {
      notify.error('Select a coach before assigning.');
      return;
    }
    setAssigningId(subscriptionId);
    try {
      await apiClient.post(`/admin/subscriptions/${subscriptionId}/assign-coach`, { coachId });
      notify.success('Coach assigned and subscription activated.');
      await Promise.all([loadAssignable(), refresh()]);
    } catch (error) {
      notify.error(apiErrorMessage(error));
    } finally {
      setAssigningId(null);
    }
  };

  return (
    <DashboardLayout role="admin">
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900">Coach Assignments Overview</h1>
          <p className="text-xs text-slate-500 mt-1">
            Monitor player-to-coach matchmaking, acceptance statuses, and override controls.
          </p>
        </div>

        <section className="space-y-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-xs sm:p-6">
          <div>
            <h2 className="text-base font-extrabold text-slate-900">Assign a Coach Directly</h2>
            <p className="mt-1 text-xs text-slate-500">
              Assign an approved coach to a paid subscription waiting for a coach. The assignment starts the coaching period immediately.
            </p>
          </div>
          {assignable.length === 0 ? (
            <p className="rounded-2xl bg-slate-50 p-4 text-center text-xs text-slate-500">
              No paid subscriptions are currently waiting for a coach.
            </p>
          ) : (
            <div className="divide-y divide-slate-100">
              {assignable.map((subscription) => (
                <div key={subscription._id} className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <div className="text-sm font-bold text-slate-900">{subscription.player?.name || 'Player'}</div>
                    <div className="mt-0.5 text-xs text-slate-500">
                      {subscription.player?.email} &bull; {subscription.planSnapshot?.name || subscription.plan?.name || 'Paid plan'}
                    </div>
                    <div className="mt-0.5 text-[11px] text-slate-400">
                      Paid {new Date(subscription.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                  <div className="flex flex-col gap-2 sm:w-80 sm:flex-row">
                    <select
                      aria-label={`Coach for ${subscription.player?.name || 'player'}`}
                      value={selectedCoachIds[subscription._id] || ''}
                      onChange={(event) => setSelectedCoachIds((current) => ({
                        ...current,
                        [subscription._id]: event.target.value,
                      }))}
                      className="min-w-0 flex-1 rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-xs text-slate-800"
                    >
                      <option value="">Select available coach</option>
                      {availableCoaches.map((coach) => (
                        <option key={coach.id} value={coach.id}>
                          {coach.name} ({coach.activeCount + coach.reservedCount}/{coach.capacity})
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      disabled={assigningId === subscription._id || !selectedCoachIds[subscription._id]}
                      onClick={() => handleAssign(subscription._id)}
                      className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-[#00BFA6] px-4 py-2 text-xs font-bold text-[#0F172A] disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <UserPlus className="h-4 w-4" />
                      {assigningId === subscription._id ? 'Assigning…' : 'Assign'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
          {assignable.length > 0 && availableCoaches.length === 0 && (
            <p className="text-xs text-amber-700">There are no approved coaches with available capacity right now.</p>
          )}
        </section>

        <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider">
                <tr>
                  <th className="p-4">Player</th>
                  <th className="p-4">Selected Coach</th>
                  <th className="p-4">Focus Area</th>
                  <th className="p-4">Requested Date</th>
                  <th className="p-4">Status</th>
                  <th className="p-4 text-right">Admin Override</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {coachRequests.map((req) => (
                  <tr key={req.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="p-4 flex items-center gap-2.5">
                      <img src={req.playerAvatar} alt={req.playerName} className="w-8 h-8 rounded-full object-cover" />
                      <span className="font-bold text-slate-900">{req.playerName}</span>
                    </td>
                    <td className="p-4 font-semibold text-slate-800">
                      Coach {req.coachName}
                    </td>
                    <td className="p-4 text-slate-600">{req.playerRole}</td>
                    <td className="p-4 text-slate-500">
                      {new Date(req.requestedAt).toLocaleDateString()}
                    </td>
                    <td className="p-4">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold capitalize ${
                          req.status === 'accepted'
                            ? 'bg-emerald-100 text-emerald-800'
                            : req.status === 'rejected'
                            ? 'bg-rose-100 text-rose-800'
                            : req.status === 'withdrawn'
                              ? 'bg-slate-100 text-slate-600'
                              : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {req.status}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      {req.status === 'pending' ? (
                        <div className="flex justify-end gap-1.5">
                          <button
                            onClick={() => handleDecision(req.id, true)}
                            className="px-2.5 py-1 rounded bg-emerald-600 text-white font-bold text-[10px]"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => handleDecision(req.id, false)}
                            className="px-2.5 py-1 rounded bg-rose-600 text-white font-bold text-[10px]"
                          >
                            Reject
                          </button>
                        </div>
                      ) : (
                        <span className="text-[10px] text-slate-400">Locked</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};
