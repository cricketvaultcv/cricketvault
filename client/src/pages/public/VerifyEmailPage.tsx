import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { CheckCircle2, Loader2, MailWarning } from 'lucide-react';
import { apiClient, apiErrorMessage } from '../../services/api';
import { Logo } from '../../components/common/Logo';

export const VerifyEmailPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';
  const [loading, setLoading] = useState(Boolean(token));
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!token) {
      setError('This legacy verification link is missing its token.');
      return;
    }
    let active = true;
    apiClient.post('/auth/email-verification/verify', { token })
      .then(({ data }) => {
        if (active) setEmail(data.email);
      })
      .catch((requestError) => {
        if (active) setError(apiErrorMessage(requestError));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [token]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#071420] p-4 text-slate-100">
      <section className="w-full max-w-md rounded-3xl border border-slate-800 bg-[#0F172A] p-8 text-center shadow-2xl">
        <Logo variant="light" className="justify-center" />
        {loading ? (
          <>
            <Loader2 className="mx-auto mt-8 h-10 w-10 animate-spin text-[#00BFA6]" />
            <h1 className="mt-4 text-xl font-extrabold">Verifying email</h1>
          </>
        ) : email ? (
          <>
            <CheckCircle2 className="mx-auto mt-8 h-12 w-12 text-[#00BFA6]" />
            <h1 className="mt-4 text-xl font-extrabold">Email verified</h1>
            <p className="mt-2 text-sm text-slate-400">{email} is verified.</p>
            <Link to="/login" className="mt-6 inline-block rounded-xl bg-[#00BFA6] px-5 py-3 text-sm font-bold text-[#0F172A]">
              Sign in
            </Link>
          </>
        ) : (
          <>
            <MailWarning className="mx-auto mt-8 h-12 w-12 text-rose-400" />
            <h1 className="mt-4 text-xl font-extrabold">Could not verify email</h1>
            <p className="mt-2 text-sm text-slate-400">{error}</p>
            <p className="mt-3 text-xs text-slate-500">
              New players verify their mobile number during signup. Email verification for subscription purchases is available at checkout.
            </p>
            <Link to="/login" className="mt-6 inline-block rounded-xl border border-slate-600 px-5 py-3 text-sm font-bold text-white">
              Return to sign in
            </Link>
          </>
        )}
      </section>
    </main>
  );
};
