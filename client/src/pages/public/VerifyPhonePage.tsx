import React, { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { CheckCircle2, Loader2, Smartphone } from 'lucide-react';
import { Logo } from '../../components/common/Logo';
import { apiClient, apiErrorMessage } from '../../services/api';

export const VerifyPhonePage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const [email, setEmail] = useState(searchParams.get('email') || '');
  const phone = searchParams.get('phone') || '';
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [verified, setVerified] = useState(false);
  const [error, setError] = useState('');
  const [resendMessage, setResendMessage] = useState('');

  const verify = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError('');
    try {
      await apiClient.post('/auth/phone-verification/verify', { email, otp });
      setVerified(true);
    } catch (requestError) {
      setError(apiErrorMessage(requestError));
    } finally {
      setLoading(false);
    }
  };

  const resend = async () => {
    setLoading(true);
    setError('');
    setResendMessage('');
    try {
      const { data } = await apiClient.post('/auth/phone-verification/resend', { email });
      setResendMessage(data.message);
    } catch (requestError) {
      setError(apiErrorMessage(requestError));
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#071420] p-4 text-slate-100">
      <section className="w-full max-w-md rounded-3xl border border-slate-800 bg-[#0F172A] p-8 text-center shadow-2xl">
        <Logo variant="light" className="justify-center" />
        {verified ? (
          <>
            <CheckCircle2 className="mx-auto mt-8 h-12 w-12 text-[#00BFA6]" />
            <h1 className="mt-4 text-xl font-extrabold">Mobile number verified</h1>
            <p className="mt-2 text-sm text-slate-400">Your player account is active. Sign in to continue.</p>
            <Link to="/login" className="mt-6 inline-block rounded-xl bg-[#00BFA6] px-5 py-3 text-sm font-bold text-[#0F172A]">
              Sign in
            </Link>
          </>
        ) : (
          <>
            <Smartphone className="mx-auto mt-8 h-12 w-12 text-[#00BFA6]" />
            <h1 className="mt-4 text-xl font-extrabold">Verify your mobile number</h1>
            <p className="mt-2 text-sm text-slate-400">
              Enter the 6-digit SMS code sent to {phone || 'your mobile number'}. It expires in 10 minutes.
            </p>
            <form onSubmit={verify} className="mt-6 space-y-4 text-left">
              <label htmlFor="signup-email" className="block text-xs font-semibold text-slate-300">Signup email</label>
              <input
                id="signup-email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="w-full rounded-xl border border-slate-700 bg-slate-800 px-3 py-2.5 text-sm text-white"
                placeholder="name@example.com"
              />
              <label htmlFor="phone-otp" className="block text-xs font-semibold text-slate-300">SMS verification code</label>
              <input
                id="phone-otp"
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                pattern="[0-9]{6}"
                maxLength={6}
                required
                value={otp}
                onChange={(event) => setOtp(event.target.value.replace(/\D/g, '').slice(0, 6))}
                className="w-full rounded-xl border border-slate-700 bg-slate-800 px-3 py-3 text-center text-lg tracking-[0.5em] text-white"
                placeholder="000000"
              />
              {error && <p className="text-sm text-rose-300" role="alert">{error}</p>}
              <button disabled={loading} className="w-full rounded-xl bg-[#00BFA6] px-4 py-3 text-sm font-bold text-[#0F172A] disabled:opacity-60">
                {loading ? <Loader2 className="mx-auto h-5 w-5 animate-spin" /> : 'Verify mobile number'}
              </button>
            </form>
            <button type="button" disabled={loading || !email} onClick={resend} className="mt-4 text-sm font-semibold text-[#00BFA6] disabled:opacity-50">
              Send a new SMS code
            </button>
            {resendMessage && <p className="mt-2 text-xs text-slate-400" role="status">{resendMessage}</p>}
            <div className="mt-5">
              <Link to="/login" className="text-sm text-slate-400 hover:text-white">Return to sign in</Link>
            </div>
          </>
        )}
      </section>
    </main>
  );
};
