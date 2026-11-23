import React, { useState } from 'react';
import { DashboardLayout } from '../../components/layout/DashboardLayout';
import { useApp } from '../../context/AppContext';
import { CoachAssignmentRequest } from '../../types';
import { notify } from '../../services/toast';
import {
  ClipboardList,
  CheckCircle2,
  XCircle,
  Clock,
  User,
  ShieldCheck,
  AlertTriangle,
  X,
  Target,
} from 'lucide-react';

export const CoachRequestsPage: React.FC = () => {
  const { coachRequests, respondToCoachRequest, currentUser } = useApp();
  const [selectedReqForAction, setSelectedReqForAction] = useState<{
    request: CoachAssignmentRequest;
    action: 'accept' | 'reject';
  } | null>(null);
  const [rejectReason, setRejectReason] = useState('Weekly training cohort at maximum capacity');

  const pendingRequests = coachRequests.filter((r) => r.status === 'pending');
  const pastRequests = coachRequests.filter((r) => r.status !== 'pending');

  const handleConfirmAction = async () => {
    if (!selectedReqForAction) return;
    const { request, action } = selectedReqForAction;
    try {
      await respondToCoachRequest(
        request.id,
        action === 'accept' ? 'accepted' : 'rejected',
        action === 'reject' ? rejectReason : undefined
      );
      setSelectedReqForAction(null);
    } catch (error) {
      notify.error(error instanceof Error ? error.message : 'Unable to update the request.');
    }
  };

  return (
    <DashboardLayout role="coach">
      <div className="max-w-5xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900">Incoming Player Requests</h1>
          <p className="text-xs text-slate-500 mt-1">
            Review player assignment applications, goals, and technical focus areas.
          </p>
        </div>

        {/* Pending Requests List */}
        <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <h2 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
              <Clock className="w-5 h-5 text-amber-500" />
              <span>Pending Decisions ({pendingRequests.length})</span>
            </h2>
            <span className="text-xs text-slate-400">Response required</span>
          </div>

          {pendingRequests.length > 0 ? (
            <div className="space-y-4">
              {pendingRequests.map((req) => (
                <div
                  key={req.id}
                  className="p-5 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col md:flex-row items-start md:items-center justify-between gap-6"
                >
                  <div className="flex items-start gap-4">
                    <img
                      src={req.playerAvatar}
                      alt={req.playerName}
                      className="w-14 h-14 rounded-2xl object-cover border-2 border-[#00BFA6] shrink-0"
                    />
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-extrabold text-base text-slate-900">{req.playerName}</h3>
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#00BFA6]/10 text-[#00BFA6]">
                          {req.playerRole}
                        </span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-200 text-slate-700">
                          {req.playerLevel}
                        </span>
                      </div>
                      <p className="text-xs text-slate-600">
                        {req.notes ? `"${req.notes}"` : 'Eager to improve fundamentals and match temperament.'}
                      </p>
                      <div className="text-[11px] text-slate-400">
                        Requested on {new Date(req.requestedAt).toLocaleDateString()} &bull; Subscription ID:{' '}
                        <span className="font-mono">{req.subscriptionId}</span>
                      </div>
                    </div>
                  </div>

                  {/* Actions: Accept or Reject */}
                  <div className="flex items-center gap-2 w-full md:w-auto">
                    <button
                      type="button"
                      onClick={() =>
                        setSelectedReqForAction({ request: req, action: 'accept' })
                      }
                      className="flex-1 md:flex-initial px-5 py-2.5 rounded-xl bg-[#00BFA6] hover:bg-[#00D6BA] text-[#0F172A] font-extrabold text-xs shadow-sm transition-colors"
                    >
                      Accept Trainee
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setSelectedReqForAction({ request: req, action: 'reject' })
                      }
                      className="flex-1 md:flex-initial px-4 py-2.5 rounded-xl bg-slate-200 hover:bg-rose-100 hover:text-rose-700 text-slate-700 font-bold text-xs transition-colors"
                    >
                      Decline
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-8 text-center text-slate-400 text-xs">
              No pending assignment requests at the moment.
            </div>
          )}
        </div>

        {/* Past Requests History */}
        <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <h2 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
              <ClipboardList className="w-5 h-5 text-slate-400" />
              <span>Request History</span>
            </h2>
            <span className="text-xs text-slate-400">{pastRequests.length} Recorded</span>
          </div>

          <div className="divide-y divide-slate-100">
            {pastRequests.map((req) => (
              <div
                key={req.id}
                className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
              >
                <div className="flex items-center gap-3">
                  <img
                    src={req.playerAvatar}
                    alt={req.playerName}
                    className="w-10 h-10 rounded-xl object-cover"
                  />
                  <div>
                    <div className="font-bold text-slate-900">{req.playerName}</div>
                    <div className="text-[11px] text-slate-400">
                      {req.playerRole} &bull; Decided on{' '}
                      {req.respondedAt ? new Date(req.respondedAt).toLocaleDateString() : 'N/A'}
                    </div>
                  </div>
                </div>

                <div>
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold capitalize ${
                      req.status === 'accepted'
                        ? 'bg-emerald-100 text-emerald-800'
                        : req.status === 'withdrawn'
                          ? 'bg-slate-100 text-slate-600'
                          : 'bg-rose-100 text-rose-800'
                    }`}
                  >
                    {req.status === 'accepted'
                      ? 'Accepted'
                      : req.status === 'withdrawn'
                        ? 'Withdrawn'
                        : 'Declined'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Confirmation Dialog Modal (Required by prompt) */}
      {selectedReqForAction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-xs"
            onClick={() => setSelectedReqForAction(null)}
          />

          <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl z-50 p-6 border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-extrabold text-base text-slate-900">
                {selectedReqForAction.action === 'accept'
                  ? 'Accept Trainee Request'
                  : 'Decline Trainee Request'}
              </h3>
              <button
                onClick={() => setSelectedReqForAction(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="text-xs text-slate-600 leading-relaxed">
              {selectedReqForAction.action === 'accept' ? (
                <p>
                  Confirm accepting <strong>{selectedReqForAction.request.playerName}</strong>? Their paid coaching duration will commence immediately and you will receive their training videos.
                </p>
              ) : (
                <div className="space-y-3">
                  <p>
                    Declining will NOT cancel {selectedReqForAction.request.playerName}'s paid subscription. Their full entitlement is guaranteed, allowing them to choose another coach.
                  </p>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Reason for player (Optional):
                    </label>
                    <input
                      type="text"
                      value={rejectReason}
                      onChange={(e) => setRejectReason(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs text-slate-800"
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={handleConfirmAction}
                className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-colors ${
                  selectedReqForAction.action === 'accept'
                    ? 'bg-[#00BFA6] hover:bg-[#00D6BA] text-[#0F172A]'
                    : 'bg-rose-600 hover:bg-rose-700 text-white'
                }`}
              >
                Confirm {selectedReqForAction.action === 'accept' ? 'Acceptance' : 'Decline'}
              </button>
              <button
                type="button"
                onClick={() => setSelectedReqForAction(null)}
                className="px-4 py-2.5 rounded-xl bg-slate-100 text-slate-700 font-semibold text-xs border border-slate-200"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
};
