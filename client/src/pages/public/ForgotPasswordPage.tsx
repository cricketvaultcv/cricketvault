import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, KeyRound, Mail } from 'lucide-react';
import { Logo } from '../../components/common/Logo';
import { apiClient, apiErrorMessage } from '../../services/api';

export const ForgotPasswordPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [codeSent, setCodeSent] = useState(false);
  const [complete, setComplete] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const requestCode = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError('');
    setMessage('');
    try {
      const { data } = await apiClient.post('/auth/password-reset/request', { email });
      setCodeSent(true);
      setMessage(data.message);
    } catch (requestError) {
      setError(apiErrorMessage(requestError));
    } finally {
      setBusy(false);
    }
  };

  const resetPassword = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    setMessage('');
    if (password !== confirmPassword) {
      setError('The passwords do not match.');
      return;
    }
    setBusy(true);
    try {
      const { data } = await apiClient.post('/auth/password-reset/complete', {
        email,
        otp,
        password,
      });
      setComplete(true);
      setMessage(data.message);
    } catch (requestError) {
      setError(apiErrorMessage(requestError));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#071420] text-slate-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-[#0F172A] border border-slate-800 rounded-3xl p-8 shadow-2xl">
        <div className="text-center mb-6">
          <Logo variant="light" className="justify-center" />
          <h2 className="text-xl font-bold text-white mt-6">
            {complete ? 'Password Updated' : 'Reset Your Password'}
          </h2>
          <p className="text-xs text-slate-400 mt-2">
            {complete
              ? 'Your password has been changed. Sign in with your new password.'
              : codeSent
                ? 'Enter the 6-digit code sent to your email and choose a new password.'
                : 'Enter your registered email address and we will send a password reset code.'}
          </p>
        </div>

        {message && (
          <div className="mb-4 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-200 text-xs text-center" role="status">
            {message}
          </div>
        )}
        {error && (
          <div className="mb-4 p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-200 text-xs text-center" role="alert">
            {error}
          </div>
        )}

        {!codeSent ? (
          <form onSubmit={requestCode} className="space-y-4">
            <label htmlFor="reset-email" className="block text-xs font-semibold text-slate-300">
              Email address
            </label>
            <div className="relative">
              <input
                id="reset-email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="name@example.com"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 focus:border-[#00BFA6] text-white text-xs placeholder-slate-500 focus:outline-none"
              />
              <Mail className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
            </div>
            <button
              type="submit"
              disabled={busy}
              className="w-full py-2.5 rounded-xl bg-[#00BFA6] hover:bg-[#00D6BA] text-[#0F172A] font-bold text-xs transition-colors shadow-md disabled:opacity-60"
            >
              {busy ? 'Sending code…' : 'Send Password Reset Code'}
            </button>
          </form>
        ) : !complete ? (
          <form onSubmit={resetPassword} className="space-y-4">
            <label htmlFor="reset-code" className="block text-xs font-semibold text-slate-300">
              6-digit reset code
            </label>
            <input
              id="reset-code"
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              pattern="[0-9]{6}"
              maxLength={6}
              required
              value={otp}
              onChange={(event) => setOtp(event.target.value.replace(/\D/g, '').slice(0, 6))}
              className="w-full px-3.5 py-3 rounded-xl bg-slate-800 border border-slate-700 focus:border-[#00BFA6] text-white text-center text-lg tracking-[0.5em] focus:outline-none"
              placeholder="000000"
            />
            <label htmlFor="new-password" className="block text-xs font-semibold text-slate-300">
              New password
            </label>
            <input
              id="new-password"
              type="password"
              autoComplete="new-password"
              minLength={8}
              maxLength={128}
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 focus:border-[#00BFA6] text-white text-xs focus:outline-none"
            />
            <label htmlFor="confirm-password" className="block text-xs font-semibold text-slate-300">
              Confirm new password
            </label>
            <input
              id="confirm-password"
              type="password"
              autoComplete="new-password"
              minLength={8}
              maxLength={128}
              required
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 focus:border-[#00BFA6] text-white text-xs focus:outline-none"
            />
            <button
              type="submit"
              disabled={busy}
              className="w-full py-2.5 rounded-xl bg-[#00BFA6] hover:bg-[#00D6BA] text-[#0F172A] font-bold text-xs transition-colors shadow-md disabled:opacity-60"
            >
              {busy ? 'Updating password…' : 'Reset Password'}
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => { setCodeSent(false); setOtp(''); setMessage(''); setError(''); }}
              className="w-full text-xs font-semibold text-[#00BFA6] disabled:opacity-50"
            >
              Send another code
            </button>
          </form>
        ) : (
          <div className="text-center">
            <KeyRound className="mx-auto h-10 w-10 text-[#00BFA6]" />
            <Link to="/login" className="mt-5 inline-block rounded-xl bg-[#00BFA6] px-5 py-3 text-sm font-bold text-[#0F172A]">
              Return to Login
            </Link>
          </div>
        )}

        {!complete && (
          <div className="mt-6 pt-4 border-t border-slate-800 text-center">
            <Link
              to="/login"
              className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-[#00BFA6]"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Return to Login</span>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
};
