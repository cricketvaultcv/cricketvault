import React, { useEffect, useState } from 'react';
import { DashboardLayout } from '../../components/layout/DashboardLayout';
import { useApp } from '../../context/AppContext';
import { apiClient, apiErrorMessage } from '../../services/api';
import { Bell, CheckCircle2, Copy, Mail, Smartphone } from 'lucide-react';
import { notify } from '../../services/toast';

export const PlayerSettingsPage: React.FC = () => {
  const { currentUser, logout } = useApp();
  const [emailAlerts, setEmailAlerts] = useState(true);
  const [smsAlerts, setSmsAlerts] = useState(false);
  const [saveMsg, setSaveMsg] = useState(false);
  const [referral, setReferral] = useState<{
    referralCode: string;
    reviewCredits: number;
    successfulReferrals: number;
  } | null>(null);

  useEffect(() => {
    apiClient.get('/users/me/preferences')
      .then(({ data }) => {
        setEmailAlerts(Boolean(data.preferences.emailAlerts));
        setSmsAlerts(Boolean(data.preferences.smsAlerts));
      })
      .catch((error) => notify.error(apiErrorMessage(error)));
    apiClient.get('/players/me/referral')
      .then(({ data }) => setReferral(data))
      .catch((error) => notify.error(apiErrorMessage(error)));
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiClient.put('/users/me/preferences', { emailAlerts, smsAlerts });
      setSaveMsg(true);
      setTimeout(() => setSaveMsg(false), 2500);
      notify.success('Notification preferences saved.');
    } catch (error) {
      notify.error(apiErrorMessage(error));
    }
  };

  return (
    <DashboardLayout role="player">
      <div className="max-w-3xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900">Account &amp; Preferences</h1>
          <p className="text-xs text-slate-500 mt-1">
            Manage your email notifications and account preferences.
          </p>
        </div>

        {saveMsg && (
          <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <span>Preferences saved successfully.</span>
          </div>
        )}

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xs sm:p-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className="text-sm font-extrabold text-slate-900">Refer a Player</h2>
              <p className="mt-1 max-w-xl text-xs leading-relaxed text-slate-500">
                Share your code. When a referred player verifies their email and completes their first successful plan purchase, you earn 5 review credits. Credits are automatically added to a purchased plan.
              </p>
            </div>
            {referral && (
              <button
                type="button"
                onClick={() => navigator.clipboard.writeText(referral.referralCode)
                  .then(() => notify.success('Referral code copied.'))
                  .catch(() => notify.error('Could not copy the referral code.'))}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50"
              >
                <Copy className="h-4 w-4" />
                Copy code
              </button>
            )}
          </div>
          {referral && (
            <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="rounded-2xl bg-slate-50 p-4">
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Your referral code</div>
                <div className="mt-1 break-all font-mono text-lg font-black tracking-wider text-[#0F172A]">{referral.referralCode}</div>
              </div>
              <div className="rounded-2xl bg-slate-50 p-4">
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Available review credits</div>
                <div className="mt-1 text-lg font-black text-[#00BFA6]">{referral.reviewCredits}</div>
              </div>
              <div className="rounded-2xl bg-slate-50 p-4">
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Successful referrals</div>
                <div className="mt-1 text-lg font-black text-slate-900">{referral.successfulReferrals}</div>
              </div>
            </div>
          )}
        </section>

        <form onSubmit={handleSave} className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-xs space-y-6">
          <div className="space-y-4">
            <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
              <Bell className="w-4 h-4 text-[#00BFA6]" />
              <span>Email Notifications</span>
            </h3>

            <div className="space-y-3 text-xs">
              <div className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
                <div>
                  <div className="font-bold text-slate-800">Account email</div>
                  <div className="mt-1 flex items-center gap-1.5 text-slate-500">
                    <Mail className="h-3.5 w-3.5" />
                    <span>{currentUser?.email}</span>
                  </div>
                </div>
                <span className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold ${currentUser?.emailVerified ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
                  {currentUser?.emailVerified ? 'Verified' : 'Not verified'}
                </span>
              </div>

              <div className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
                <div>
                  <div className="font-bold text-slate-800">Mobile number</div>
                  <div className="mt-1 flex items-center gap-1.5 text-slate-500">
                    <Smartphone className="h-3.5 w-3.5" />
                    <span>{currentUser?.phone || 'No mobile number saved'}</span>
                  </div>
                </div>
                <span className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold ${currentUser?.phoneVerified ? 'bg-emerald-100 text-emerald-800' : currentUser?.signupVerificationMethod === 'EMAIL' ? 'bg-slate-100 text-slate-600' : 'bg-rose-100 text-rose-800'}`}>
                  {currentUser?.phoneVerified ? 'Verified' : currentUser?.signupVerificationMethod === 'EMAIL' ? 'Not required' : 'Not verified'}
                </span>
              </div>

              <label className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200 cursor-pointer">
                <div>
                  <div className="font-bold text-slate-800">Email Notifications</div>
                  <div className="text-slate-500">Receive emails for payment status, coach acceptance, reviews, and action plans</div>
                </div>
                <input
                  type="checkbox"
                  checked={emailAlerts}
                  onChange={(e) => setEmailAlerts(e.target.checked)}
                  className="w-4 h-4 accent-[#00BFA6]"
                />
              </label>

              <label className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200 cursor-pointer">
                <div>
                  <div className="font-bold text-slate-800">WhatsApp / SMS Reminders</div>
                  <div className="text-slate-500">WhatsApp and SMS notifications are not available yet</div>
                </div>
                <input
                  type="checkbox"
                  checked={smsAlerts}
                  onChange={(e) => setSmsAlerts(e.target.checked)}
                  className="w-4 h-4 accent-[#00BFA6]"
                  disabled
                  aria-label="WhatsApp / SMS reminders (not available yet)"
                />
              </label>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 flex justify-between items-center">
            <button
              type="button"
              onClick={() => {
                if (confirm('Sign out of your CricketVault account?')) {
                  logout();
                }
              }}
              className="text-xs text-rose-600 font-semibold hover:underline"
            >
              Sign Out
            </button>

            <button
              type="submit"
              className="px-6 py-2.5 rounded-xl bg-[#00BFA6] hover:bg-[#00D6BA] text-[#0F172A] font-extrabold text-xs shadow-md transition-colors"
            >
              Save Preferences
            </button>
          </div>
        </form>
      </div>
    </DashboardLayout>
  );
};
