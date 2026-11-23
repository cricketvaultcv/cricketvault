import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { DashboardLayout } from '../../components/layout/DashboardLayout';
import { useApp, type AdminUserDeletionPreview } from '../../context/AppContext';
import { apiErrorMessage } from '../../services/api';
import { Search, UserPlus, Copy, Trash2 } from 'lucide-react';
import { notify } from '../../services/toast';

export const AdminUsersPage: React.FC = () => {
  const {
    users,
    updateAdminCoach,
    createAdminCoach,
    getAdminUserDeletionPreview,
    deleteAdminUser,
  } = useApp();
  const location = useLocation();
  const coachManagement = location.pathname === '/admin/coaches';
  const [roleFilter, setRoleFilter] = useState<'all' | 'player' | 'coach' | 'admin'>(
    coachManagement ? 'coach' : 'all',
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [savingCoachId, setSavingCoachId] = useState<string | null>(null);
  const [actionError, setActionError] = useState('');
  const [coachName, setCoachName] = useState('');
  const [coachEmail, setCoachEmail] = useState('');
  const [coachPassword, setCoachPassword] = useState('');
  const [coachSpecialties, setCoachSpecialties] = useState('');
  const [coachExperience, setCoachExperience] = useState('');
  const [coachLocation, setCoachLocation] = useState('');
  const [coachBio, setCoachBio] = useState('');
  const [coachCapacity, setCoachCapacity] = useState('8');
  const [creatingCoach, setCreatingCoach] = useState(false);
  const [createdCredentials, setCreatedCredentials] = useState<{
    email: string;
    password: string;
  } | null>(null);
  const [copiedCredentials, setCopiedCredentials] = useState(false);
  const [deletionPreview, setDeletionPreview] = useState<AdminUserDeletionPreview | null>(null);
  const [loadingDeletionUserId, setLoadingDeletionUserId] = useState<string | null>(null);
  const [deletingUser, setDeletingUser] = useState(false);
  const [deleteConfirmed, setDeleteConfirmed] = useState(false);

  useEffect(() => {
    setRoleFilter(coachManagement ? 'coach' : 'all');
  }, [coachManagement]);

  const filtered = users.filter((u) => {
    const matchesRole = roleFilter === 'all' || u.role === roleFilter;
    const matchesSearch =
      u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.location.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesRole && matchesSearch;
  });

  const handleApprovalChange = async (userId: string, profileId: string | undefined, approved: boolean) => {
    if (!profileId) {
      setActionError('Coach profile is missing; approval could not be updated.');
      return;
    }
    setSavingCoachId(userId);
    setActionError('');
    try {
      await updateAdminCoach(profileId, { approved });
    } catch (error) {
      setActionError(apiErrorMessage(error));
    } finally {
      setSavingCoachId(null);
    }
  };

  const handleCreateCoach = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const specialties = coachSpecialties.split(',').map((item) => item.trim()).filter(Boolean);
    if (specialties.length === 0) {
      setActionError('Enter at least one coaching specialty.');
      notify.error('Enter at least one coaching specialty.');
      return;
    }

    setCreatingCoach(true);
    setActionError('');
    setCreatedCredentials(null);
    setCopiedCredentials(false);
    try {
      await createAdminCoach({
        name: coachName.trim(),
        email: coachEmail.trim(),
        password: coachPassword,
        specialties,
        bio: coachBio.trim() || undefined,
        experience: coachExperience ? Number(coachExperience) : undefined,
        location: coachLocation.trim() || undefined,
        capacity: Number(coachCapacity),
      });
      setCreatedCredentials({ email: coachEmail.trim(), password: coachPassword });
      setCoachName('');
      setCoachEmail('');
      setCoachPassword('');
      setCoachSpecialties('');
      setCoachExperience('');
      setCoachLocation('');
      setCoachBio('');
      setCoachCapacity('8');
    } catch (error) {
      const message = apiErrorMessage(error);
      setActionError(message);
      notify.error(message);
    } finally {
      setCreatingCoach(false);
    }
  };

  const copyCoachCredentials = async () => {
    if (!createdCredentials) return;
    try {
      await navigator.clipboard.writeText(
        `Email: ${createdCredentials.email}\nPassword: ${createdCredentials.password}`,
      );
      setCopiedCredentials(true);
    } catch {
      const message = 'Could not access the clipboard. Copy the credentials shown below manually.';
      setActionError(message);
      notify.error(message);
    }
  };

  const openDeletionPreview = async (userId: string) => {
    setLoadingDeletionUserId(userId);
    setActionError('');
    setDeleteConfirmed(false);
    try {
      setDeletionPreview(await getAdminUserDeletionPreview(userId));
    } catch (error) {
      const message = apiErrorMessage(error);
      setActionError(message);
      notify.error(message);
    } finally {
      setLoadingDeletionUserId(null);
    }
  };

  const confirmUserDeletion = async () => {
    if (!deletionPreview?.canDelete || !deleteConfirmed) return;
    setDeletingUser(true);
    setActionError('');
    try {
      await deleteAdminUser(deletionPreview.user.id);
      setDeletionPreview(null);
      setDeleteConfirmed(false);
    } catch (error) {
      const message = apiErrorMessage(error);
      setActionError(message);
      notify.error(message);
      try {
        setDeletionPreview(await getAdminUserDeletionPreview(deletionPreview.user.id));
      } catch {
        setDeletionPreview(null);
      }
    } finally {
      setDeletingUser(false);
    }
  };

  return (
    <DashboardLayout role="admin">
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-extrabold text-slate-900">
              {coachManagement ? 'Coach Management' : 'User Management'}
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              {coachManagement
                ? 'Create coach accounts, share their login details, and manage their coach profiles.'
                : 'Browse player profiles, accredited coaches, and platform administrators.'}
            </p>
          </div>

          <div className="flex gap-1.5 bg-slate-200/80 p-1 rounded-xl text-xs font-bold self-start sm:self-auto">
            {(['all', 'player', 'coach', 'admin'] as const).map((r) => (
              <button
                key={r}
                onClick={() => setRoleFilter(r)}
                className={`px-3 py-1 rounded-lg capitalize transition-all ${
                  roleFilter === r ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {r === 'all' ? 'All Roles' : `${r}s`}
              </button>
            ))}
          </div>
        </div>

        {coachManagement && (
          <section className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center gap-2">
              <UserPlus className="w-4 h-4 text-[#00BFA6]" />
              <h2 className="text-sm font-extrabold text-slate-900">Create Coach Account</h2>
            </div>
            <p className="text-xs text-slate-500">
              The new coach can sign in immediately and will be available for player selection. Share the password with the coach securely.
            </p>
            <form onSubmit={handleCreateCoach} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              <input
                required
                minLength={2}
                maxLength={120}
                value={coachName}
                onChange={(event) => setCoachName(event.target.value)}
                placeholder="Coach full name"
                className="px-3 py-2 text-xs bg-slate-50 rounded-xl border border-slate-200 focus:outline-none focus:border-[#00BFA6]"
              />
              <input
                required
                type="email"
                value={coachEmail}
                onChange={(event) => setCoachEmail(event.target.value)}
                placeholder="Coach email"
                className="px-3 py-2 text-xs bg-slate-50 rounded-xl border border-slate-200 focus:outline-none focus:border-[#00BFA6]"
              />
              <input
                required
                type="password"
                minLength={8}
                maxLength={128}
                autoComplete="new-password"
                value={coachPassword}
                onChange={(event) => setCoachPassword(event.target.value)}
                placeholder="Initial password (8+ characters)"
                className="px-3 py-2 text-xs bg-slate-50 rounded-xl border border-slate-200 focus:outline-none focus:border-[#00BFA6]"
              />
              <input
                required
                value={coachSpecialties}
                onChange={(event) => setCoachSpecialties(event.target.value)}
                placeholder="Specialties (comma-separated)"
                className="px-3 py-2 text-xs bg-slate-50 rounded-xl border border-slate-200 focus:outline-none focus:border-[#00BFA6]"
              />
              <input
                type="number"
                min="0"
                max="80"
                value={coachExperience}
                onChange={(event) => setCoachExperience(event.target.value)}
                placeholder="Experience (years)"
                className="px-3 py-2 text-xs bg-slate-50 rounded-xl border border-slate-200 focus:outline-none focus:border-[#00BFA6]"
              />
              <input
                value={coachLocation}
                onChange={(event) => setCoachLocation(event.target.value)}
                placeholder="Location"
                className="px-3 py-2 text-xs bg-slate-50 rounded-xl border border-slate-200 focus:outline-none focus:border-[#00BFA6]"
              />
              <input
                value={coachBio}
                onChange={(event) => setCoachBio(event.target.value)}
                placeholder="Short coach bio"
                className="px-3 py-2 text-xs bg-slate-50 rounded-xl border border-slate-200 focus:outline-none focus:border-[#00BFA6]"
              />
              <input
                required
                type="number"
                min="1"
                max="100"
                value={coachCapacity}
                onChange={(event) => setCoachCapacity(event.target.value)}
                placeholder="Player capacity"
                className="px-3 py-2 text-xs bg-slate-50 rounded-xl border border-slate-200 focus:outline-none focus:border-[#00BFA6]"
              />
              <div className="sm:col-span-2 lg:col-span-3">
                <button
                  type="submit"
                  disabled={creatingCoach}
                  className="px-4 py-2 rounded-xl bg-[#00BFA6] text-[#0F172A] text-xs font-extrabold disabled:opacity-50"
                >
                  {creatingCoach ? 'Creating account…' : 'Create Coach Account'}
                </button>
              </div>
            </form>
            {createdCredentials && (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-xs text-emerald-900">
                <div className="font-bold">Coach account created. Share these login details with the coach:</div>
                <div className="mt-2">Email: <strong>{createdCredentials.email}</strong></div>
                <div className="mt-1">Password: <strong>{createdCredentials.password}</strong></div>
                <button
                  type="button"
                  onClick={() => void copyCoachCredentials()}
                  className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-emerald-700 px-3 py-1.5 font-bold text-white"
                >
                  <Copy className="w-3.5 h-3.5" />
                  {copiedCredentials ? 'Copied' : 'Copy login details'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setCreatedCredentials(null);
                    setCopiedCredentials(false);
                  }}
                  className="ml-2 rounded-lg border border-emerald-700 px-3 py-1.5 font-bold text-emerald-800"
                >
                  Hide credentials
                </button>
              </div>
            )}
          </section>
        )}

        {/* Search */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <div className="relative w-full max-w-md">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name, email, or district..."
              className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 rounded-xl border border-slate-200 focus:outline-none focus:border-[#00BFA6]"
            />
          </div>
        </div>

        {actionError && (
          <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {actionError}
          </div>
        )}

        {/* Users Table */}
        <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider">
                <tr>
                  <th className="p-4">User</th>
                  <th className="p-4">Role</th>
                  <th className="p-4">Specialization / Role</th>
                  <th className="p-4">Location</th>
                  <th className="p-4">Registered</th>
                  <th className="p-4">Coach eligibility</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="p-4 flex items-center gap-3">
                      <img src={u.avatar} alt={u.name} className="w-9 h-9 rounded-full object-cover border border-[#00BFA6]" />
                      <div>
                        <div className="font-bold text-slate-900">{u.name}</div>
                        <div className="text-[11px] text-slate-400">{u.email}</div>
                      </div>
                    </td>
                    <td className="p-4">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold capitalize ${
                          u.role === 'coach'
                            ? 'bg-blue-100 text-blue-800'
                            : u.role === 'admin'
                            ? 'bg-purple-100 text-purple-800'
                            : 'bg-emerald-100 text-emerald-800'
                        }`}
                      >
                        {u.role}
                      </span>
                    </td>
                    <td className="p-4 text-slate-600">
                      {u.role === 'coach'
                        ? u.coachProfile?.specialization
                        : u.role === 'player'
                        ? `${u.cricketProfile?.playingRole} (${u.cricketProfile?.experience})`
                        : 'System Staff'}
                    </td>
                    <td className="p-4 text-slate-600">{u.location}</td>
                    <td className="p-4 text-slate-400">{u.createdAt}</td>
                    <td className="p-4">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        u.role === 'coach'
                          ? u.coachProfile?.approved
                            ? 'bg-emerald-50 text-emerald-700'
                            : 'bg-amber-50 text-amber-700'
                          : u.status === 'DISABLED'
                            ? 'bg-rose-50 text-rose-700'
                            : u.status === 'PENDING'
                              ? 'bg-amber-50 text-amber-700'
                              : 'bg-emerald-50 text-emerald-700'
                      }`}>
                        {u.role === 'coach'
                          ? u.coachProfile?.approved
                            ? 'APPROVED'
                            : 'PENDING APPROVAL'
                          : u.status || 'ACTIVE'}
                      </span>
                      {u.role === 'coach' && (
                        <div className="mt-1 text-[10px] text-slate-500">
                          {u.coachProfile?.available ? 'Available' : 'Unavailable'}
                          {' · '}
                          {u.coachProfile?.assignedPlayersCount ?? 0}/
                          {u.coachProfile?.capacity ?? 0} assigned
                        </div>
                      )}
                    </td>
                    <td className="p-4 text-right">
                      <div className="inline-flex items-center gap-2">
                        {u.role === 'coach' && (
                          <button
                            type="button"
                            disabled={savingCoachId === u.id}
                            onClick={() => handleApprovalChange(
                              u.id,
                              u.coachProfile?.id,
                              !u.coachProfile?.approved,
                            )}
                            className="whitespace-nowrap rounded-lg bg-[#0F172A] px-3 py-2 text-[11px] font-bold text-white disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {savingCoachId === u.id
                              ? 'Saving…'
                              : u.coachProfile?.approved
                                ? 'Revoke approval'
                                : 'Approve coach'}
                          </button>
                        )}
                        {u.role !== 'admin' && (
                          <button
                            type="button"
                            disabled={loadingDeletionUserId === u.id || deletingUser}
                            onClick={() => void openDeletionPreview(u.id)}
                            aria-label={`Delete ${u.role} ${u.name}`}
                            className="inline-flex items-center gap-1 whitespace-nowrap rounded-lg border border-rose-200 px-3 py-2 text-[11px] font-bold text-rose-700 hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            {loadingDeletionUserId === u.id ? 'Loading…' : 'Delete'}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-sm text-slate-500">
                      No matching users found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      {deletionPreview && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !deletingUser) {
              setDeletionPreview(null);
              setDeleteConfirmed(false);
            }
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-user-title"
            className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl bg-white p-5 shadow-2xl sm:p-6"
          >
            <h2 id="delete-user-title" className="text-lg font-extrabold text-slate-900">
              Delete {deletionPreview.user.role === 'PLAYER' ? 'player' : 'coach'} account?
            </h2>
            <p className="mt-1 text-sm text-slate-600">
              {deletionPreview.user.name} · {deletionPreview.user.email}
            </p>
            {deletionPreview.user.role === 'PLAYER' ? (
              <>
                <p className="mt-4 text-xs leading-5 text-slate-600">
                  Player profile, videos, reviews, action plans, requests, and notifications will be permanently deleted. Payment and subscription records are retained for financial history. Admin account deletion does not issue refunds. Any player refund that was already requested continues through Razorpay.
                </p>
                {deletionPreview.subscriptions.length > 0 ? (
                  <div className="mt-4 space-y-3">
                    {deletionPreview.subscriptions.map((subscription) => (
                      <div key={subscription.id} className="rounded-xl border border-slate-200 p-3 text-xs">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="font-bold text-slate-900">{subscription.planName}</div>
                            <div className="mt-1 text-slate-500">
                              {subscription.status.replace(/_/g, ' ')} · {subscription.submittedVideos} submitted video{subscription.submittedVideos === 1 ? '' : 's'}
                            </div>
                          </div>
                        </div>
                        {['CREATING', 'PENDING'].includes(subscription.refundStatus || '') && (
                          <p className="mt-2 font-semibold text-amber-700">A refund was already initiated and is pending.</p>
                        )}
                        {subscription.refundStatus === 'PROCESSED' && (
                          <p className="mt-2 font-semibold text-emerald-700">The refund was already processed.</p>
                        )}
                        {!['CREATING', 'PENDING'].includes(subscription.refundStatus || '') &&
                          subscription.refundStatus !== 'PROCESSED' && (
                            <p className="mt-2 text-slate-500">
                              No refund will be initiated by deleting this account.
                            </p>
                          )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="mt-4 rounded-xl bg-slate-50 p-3 text-xs text-slate-600">
                    No active subscriptions.
                  </p>
                )}
              </>
            ) : (
              <p className="mt-4 text-xs leading-5 text-slate-600">
                Coach accounts can only be deleted when they have no active player assignments or unresolved requests. Historical financial and review records are retained.
              </p>
            )}
            {deletionPreview.blockers.length > 0 && (
              <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800">
                <div className="font-bold">Deletion is blocked:</div>
                <ul className="mt-1 list-disc space-y-1 pl-5">
                  {deletionPreview.blockers.map((blocker) => <li key={blocker}>{blocker}</li>)}
                </ul>
              </div>
            )}
            {deletionPreview.canDelete && (
              <label className="mt-4 flex items-start gap-2 text-xs text-slate-700">
                <input
                  type="checkbox"
                  checked={deleteConfirmed}
                  onChange={(event) => setDeleteConfirmed(event.target.checked)}
                  className="mt-0.5 accent-rose-600"
                />
                <span>I understand this deletion is permanent and will not issue a refund.</span>
              </label>
            )}
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                disabled={deletingUser}
                onClick={() => {
                  setDeletionPreview(null);
                  setDeleteConfirmed(false);
                }}
                className="rounded-lg border border-slate-200 px-4 py-2 text-xs font-bold text-slate-700 disabled:opacity-50"
              >
                Cancel
              </button>
              {deletionPreview.canDelete && (
                <button
                  type="button"
                  disabled={!deleteConfirmed || deletingUser}
                  onClick={() => void confirmUserDeletion()}
                  className="rounded-lg bg-rose-600 px-4 py-2 text-xs font-bold text-white disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {deletingUser ? 'Deleting…' : 'Confirm deletion'}
                </button>
              )}
            </div>
          </section>
        </div>
      )}
    </DashboardLayout>
  );
};
