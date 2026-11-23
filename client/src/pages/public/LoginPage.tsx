import React, { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { Logo } from '../../components/common/Logo';
import { useApp } from '../../context/AppContext';
import { apiClient, apiErrorMessage, apiStatusCode } from '../../services/api';
import { notify } from '../../services/toast';
import { Eye, EyeOff, ArrowLeft } from 'lucide-react';

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (options: {
            client_id: string;
            callback: (response: { credential: string }) => void;
          }) => void;
          renderButton: (element: HTMLElement, options: Record<string, unknown>) => void;
        };
      };
    };
  }
}

export const LoginPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const initialTab = searchParams.get('tab') === 'signup' || location.pathname === '/signup' ? 'signup' : 'login';
  const [activeTab, setActiveTab] = useState<'login' | 'signup'>(initialTab);
  const [showPassword, setShowPassword] = useState(false);
  const [emailOrPhone, setEmailOrPhone] = useState('');
  const [password, setPassword] = useState('');
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [signupPhone, setSignupPhone] = useState('');
  const [signupReferralCode, setSignupReferralCode] = useState('');
  const selectedRole: 'player' | 'coach' = 'player';
  const [fullName, setFullName] = useState('');
  const [playingRole, setPlayingRole] = useState<'Batter' | 'Bowler' | 'All-Rounder' | 'Wicketkeeper'>('Batter');
  const [feedbackMsg, setFeedbackMsg] = useState('');
  const [verificationPending, setVerificationPending] = useState(false);
  const [signupVerificationMethod, setSignupVerificationMethod] = useState<'phone' | 'email'>('phone');
  const [pendingVerificationMethod, setPendingVerificationMethod] = useState<'phone' | 'email'>('phone');
  const [resendingVerification, setResendingVerification] = useState(false);
  const [googleClientId, setGoogleClientId] = useState<string | null>(null);
  const [googleConfigLoaded, setGoogleConfigLoaded] = useState(false);
  const [googleConfigFailed, setGoogleConfigFailed] = useState(false);
  const googleButtonRef = useRef<HTMLDivElement>(null);
  const googleInitializedRef = useRef(false);
  const { login, loginWithGoogle, register } = useApp();
  const navigate = useNavigate();
  const googleAuthRef = useRef({
    loginWithGoogle,
    role: selectedRole,
    intent: activeTab,
    navigate,
  });
  googleAuthRef.current = { loginWithGoogle, role: selectedRole, intent: activeTab, navigate };

  useEffect(() => {
    let active = true;
    apiClient.get('/auth/config')
      .then(({ data }) => {
        if (active) {
          setGoogleClientId(typeof data.googleClientId === 'string' ? data.googleClientId : null);
          if (data.signupVerificationMethod === 'email' || data.signupVerificationMethod === 'phone') {
            setSignupVerificationMethod(data.signupVerificationMethod);
          }
        }
      })
      .catch(() => {
        if (active) {
          setGoogleClientId(null);
          setGoogleConfigFailed(true);
        }
      })
      .finally(() => {
        if (active) setGoogleConfigLoaded(true);
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const element = googleButtonRef.current;
    if (activeTab !== 'login' || !googleClientId || !element) return;
    let active = true;
    let scriptErrorHandler: (() => void) | undefined;
    const renderGoogleButton = () => {
      if (!active || !window.google || !googleButtonRef.current) return;
      if (!googleInitializedRef.current) {
        window.google.accounts.id.initialize({
          client_id: googleClientId,
          callback: ({ credential }) => {
            if (!credential) {
              setFeedbackMsg('Google did not return a sign-in credential. Please try again.');
              return;
            }
            void (async () => {
              setFeedbackMsg('');
              try {
                const authState = googleAuthRef.current;
                const user = await authState.loginWithGoogle(
                  credential,
                  authState.role,
                  authState.intent,
                );
                authState.navigate(
                  user.role === 'coach'
                    ? '/coach/dashboard'
                    : user.role === 'admin'
                      ? '/admin/dashboard'
                      : '/player/dashboard',
                );
              } catch (error) {
                const message = apiErrorMessage(error);
                setFeedbackMsg(message);
                notify.error(message);
              }
            })();
          },
        });
        googleInitializedRef.current = true;
      }
      googleButtonRef.current.replaceChildren();
      window.google.accounts.id.renderButton(googleButtonRef.current, {
        theme: 'filled_black',
        size: 'large',
        shape: 'pill',
        text: 'signin_with',
        width: Math.min(400, Math.max(220, googleButtonRef.current.clientWidth)),
      });
    };
    const scriptUrl = 'https://accounts.google.com/gsi/client';
    let script = document.querySelector<HTMLScriptElement>(`script[src="${scriptUrl}"]`);
    if (window.google) {
      renderGoogleButton();
    } else {
      if (!script) {
        script = document.createElement('script');
        script.src = scriptUrl;
        script.async = true;
        script.defer = true;
        document.head.appendChild(script);
      }
      script.addEventListener('load', renderGoogleButton);
      scriptErrorHandler = () => setFeedbackMsg('Google sign-in could not be loaded. Please try again later.');
      script.addEventListener('error', scriptErrorHandler);
    }
    return () => {
      active = false;
      script?.removeEventListener('load', renderGoogleButton);
      if (scriptErrorHandler) script?.removeEventListener('error', scriptErrorHandler);
    };
  }, [googleClientId, activeTab, selectedRole]);

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedbackMsg('');
    try {
      const user = await login(emailOrPhone, password);
      navigate(user.role === 'coach' ? '/coach/dashboard' : user.role === 'admin' ? '/admin/dashboard' : '/player/dashboard');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to sign in.';
      setFeedbackMsg(message);
      const lowerMessage = message.toLowerCase();
      const phoneVerification = apiStatusCode(error) === 403 && lowerMessage.includes('verify your mobile number');
      const emailVerification = apiStatusCode(error) === 403 && lowerMessage.includes('verify your email');
      setVerificationPending(phoneVerification || emailVerification);
      if (phoneVerification) setPendingVerificationMethod('phone');
      if (emailVerification) setPendingVerificationMethod('email');
      notify.error(message);
    }
  };

  const handleSignupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedbackMsg('');
    try {
      if (!fullName.trim()) throw new Error('Please enter your full name.');
      const method = await register(
        fullName,
        signupEmail,
        signupPassword,
        'player',
        signupPhone,
        playingRole,
        signupReferralCode.trim(),
      );
      const verificationRoute = method === 'phone' ? '/verify-phone' : '/verify-signup-email';
      const phoneQuery = method === 'phone' ? `&phone=${encodeURIComponent(signupPhone)}` : '';
      navigate(`${verificationRoute}?email=${encodeURIComponent(signupEmail)}${phoneQuery}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to create your account.';
      setFeedbackMsg(message);
      if (message.toLowerCase().includes('verification code could not be sent')) {
        setVerificationPending(true);
        const method = signupVerificationMethod;
        const verificationRoute = method === 'phone' ? '/verify-phone' : '/verify-signup-email';
        const phoneQuery = method === 'phone' ? `&phone=${encodeURIComponent(signupPhone)}` : '';
        navigate(`${verificationRoute}?email=${encodeURIComponent(signupEmail)}${phoneQuery}`);
      } else {
        setVerificationPending(false);
      }
      notify.error(message);
    }
  };

  const resendVerification = async () => {
    setResendingVerification(true);
    try {
      const method = activeTab === 'signup' ? signupVerificationMethod : pendingVerificationMethod;
      const endpoint = method === 'phone'
        ? '/auth/phone-verification/resend'
        : '/auth/signup-email-verification/resend';
      await apiClient.post(endpoint, {
        email: activeTab === 'signup' ? signupEmail : emailOrPhone,
      });
      notify.success(method === 'phone'
        ? 'If this player account needs mobile verification, a new SMS code has been sent.'
        : 'If this player account needs email verification, a new code has been sent.');
    } catch (error) {
      notify.error(apiErrorMessage(error));
    } finally {
      setResendingVerification(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#071420] text-slate-100 flex items-start sm:items-center justify-center p-3 sm:p-6 lg:p-8">
      {/* Background radial glow */}
      <div className="absolute top-0 right-1/4 w-96 h-96 rounded-full bg-[#00BFA6]/10 blur-3xl pointer-events-none" />

      <div className="max-w-4xl w-full bg-[#0F172A] border border-slate-800 rounded-2xl sm:rounded-3xl overflow-hidden shadow-2xl grid grid-cols-1 md:grid-cols-12 relative z-10">
        {/* Left Side Banner (Matches Reference 1 & 2 Screen 2) */}
        <div className="md:col-span-5 relative bg-gradient-to-br from-[#0B252C] via-[#0F172A] to-[#0A192F] p-5 sm:p-8 flex flex-col justify-between overflow-hidden border-b md:border-b-0 md:border-r border-slate-800">
          {/* Subtle background image */}
          <div className="absolute inset-0 opacity-25 mix-blend-overlay">
            <img
              src="https://images.unsplash.com/photo-1540747913346-19e32dc3e97e?w=800&auto=format&fit=crop&q=80"
              alt="Cricket pitch"
              className="w-full h-full object-cover"
            />
          </div>

          <div className="relative z-10">
            <Logo variant="light" />
            <div className="mt-8 space-y-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#00BFA6]">
                Your Game, Our Mission
              </span>
              <h2 className="text-2xl font-extrabold text-white leading-tight">
                Welcome to CricketVault
              </h2>
              <p className="text-xs text-slate-300 leading-relaxed pt-1">
                Your cricket journey starts here. Players can create an account online. Coach accounts are provided by an administrator.
              </p>
            </div>
          </div>

          <div className="relative z-10 mt-8 pt-6 border-t border-slate-800">
            <p className="text-xs font-semibold text-slate-200">Create your player account or sign in.</p>
            <p className="mt-1 text-xs leading-relaxed text-slate-400">
              Coach access is provisioned by an administrator. Contact your administrator for login details.
            </p>
          </div>
        </div>

        {/* Right Side Form (Matches Reference 1 & 2 Screen 2) */}
        <div className="md:col-span-7 min-w-0 p-5 sm:p-10 bg-slate-900/90 flex flex-col justify-between">
          <div>
            {/* Top tabs: [Login] [Sign Up] */}
            <div className="flex bg-slate-800 p-1 rounded-xl max-w-xs mx-auto mb-6 border border-slate-700/60">
              <button
                type="button"
                onClick={() => {
                  setActiveTab('login');
                  setFeedbackMsg('');
                }}
                className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${
                  activeTab === 'login'
                    ? 'bg-[#00BFA6] text-[#0F172A] shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Login
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveTab('signup');
                  setFeedbackMsg('');
                }}
                className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${
                  activeTab === 'signup'
                    ? 'bg-[#00BFA6] text-[#0F172A] shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Sign Up
              </button>
            </div>

            {/* Header titles */}
            <div className="text-center mb-6">
              <h3 className="text-xl font-bold text-white">
                {activeTab === 'login' ? 'Login to your account' : 'Start your cricket development'}
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                {activeTab === 'login'
                  ? 'Continue your cricket journey and track reviews'
                  : 'Join CricketVault as a player'}
              </p>
            </div>

            {feedbackMsg && (
              <div className={`mb-4 p-3 rounded-lg text-xs text-center ${verificationPending ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-300' : 'bg-rose-500/10 border border-rose-500/30 text-rose-300'}`}>
                {feedbackMsg}
              </div>
            )}
            {verificationPending && (
              <button
                type="button"
                onClick={resendVerification}
                disabled={resendingVerification}
                className="mb-4 w-full rounded-xl border border-slate-700 px-3 py-2 text-xs font-semibold text-[#00BFA6] disabled:opacity-60"
              >
                {resendingVerification ? 'Sending…' : 'Resend verification code'}
              </button>
            )}

            {/* Form */}
            {activeTab === 'login' ? (
              <form onSubmit={handleLoginSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Email address
                  </label>
                  <input
                    type="email"
                    required
                    value={emailOrPhone}
                    onChange={(e) => setEmailOrPhone(e.target.value)}
                    placeholder="Enter your email address"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 focus:border-[#00BFA6] text-white text-xs placeholder-slate-500 focus:outline-none transition-colors"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-semibold text-slate-300">Password</label>
                    <Link
                      to="/forgot-password"
                      className="text-[11px] text-[#00BFA6] hover:underline"
                    >
                      Forgot password?
                    </Link>
                  </div>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter your password"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 focus:border-[#00BFA6] text-white text-xs placeholder-slate-500 focus:outline-none transition-colors pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 rounded-xl bg-[#00BFA6] hover:bg-[#00D6BA] text-[#0F172A] font-bold text-xs transition-colors shadow-md mt-2"
                >
                  Login
                </button>
              </form>
            ) : (
              <form onSubmit={handleSignupSubmit} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Full Name</label>
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="e.g. Rahul Sharma"
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-800 border border-slate-700 focus:border-[#00BFA6] text-white text-xs placeholder-slate-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Mobile number {signupVerificationMethod === 'phone' ? '' : '(optional)'}
                  </label>
                  <input
                    type="tel"
                    required={signupVerificationMethod === 'phone'}
                    autoComplete="tel"
                    value={signupPhone}
                    onChange={(e) => setSignupPhone(e.target.value)}
                    placeholder="+91 98765 43210"
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-800 border border-slate-700 focus:border-[#00BFA6] text-white text-xs placeholder-slate-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Email address
                  </label>
                  <input
                    type="email"
                    required
                    value={signupEmail}
                    onChange={(e) => setSignupEmail(e.target.value)}
                    placeholder="name@example.com"
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-800 border border-slate-700 focus:border-[#00BFA6] text-white text-xs placeholder-slate-500 focus:outline-none"
                  />
                </div>

                <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Primary Cricket Role
                    </label>
                    <select
                      value={playingRole}
                      onChange={(e) => setPlayingRole(e.target.value as any)}
                      className="w-full px-3.5 py-2 rounded-xl bg-slate-800 border border-slate-700 focus:border-[#00BFA6] text-white text-xs focus:outline-none"
                    >
                      <option value="Batter">Batter</option>
                      <option value="Bowler">Bowler (Fast / Spin)</option>
                      <option value="All-Rounder">All-Rounder</option>
                      <option value="Wicketkeeper">Wicketkeeper</option>
                    </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Create Password</label>
                  <input
                    type="password"
                    required
                    minLength={8}
                    value={signupPassword}
                    onChange={(e) => setSignupPassword(e.target.value)}
                    placeholder="Minimum 8 characters"
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-800 border border-slate-700 focus:border-[#00BFA6] text-white text-xs placeholder-slate-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Referral code <span className="font-normal text-slate-500">(optional)</span>
                  </label>
                  <input
                    type="text"
                    autoComplete="off"
                    maxLength={20}
                    value={signupReferralCode}
                    onChange={(e) => setSignupReferralCode(e.target.value.toUpperCase())}
                    placeholder="Enter referral code"
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-800 border border-slate-700 focus:border-[#00BFA6] text-white text-xs placeholder-slate-500 focus:outline-none"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 rounded-xl bg-[#00BFA6] hover:bg-[#00D6BA] text-[#0F172A] font-bold text-xs transition-colors shadow-md mt-2"
                >
                  Create Player Account
                </button>
              </form>
            )}

            {activeTab === 'login' && <div className="relative my-5">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-800" />
              </div>
              <div className="relative flex justify-center text-[10px] uppercase">
                <span className="bg-slate-900 px-2 text-slate-500 font-semibold">Or continue with</span>
              </div>
            </div>}

            {activeTab === 'signup' ? (
              <p className="text-center text-xs text-slate-400">
                {signupVerificationMethod === 'phone'
                  ? 'We will verify your account by SMS. Enter a valid Indian mobile number.'
                  : 'We will send an email verification code to activate your account.'}
              </p>
            ) : googleClientId ? (
              <div ref={googleButtonRef} className="flex min-h-11 w-full justify-center overflow-hidden" />
            ) : (
              <p className="text-center text-xs text-slate-400" role="status">
                {googleConfigLoaded
                  ? googleConfigFailed
                    ? 'Unable to load sign-in configuration. Check the API connection and try again.'
                    : 'Google sign-in is not configured. Add GOOGLE_CLIENT_ID to the server environment.'
                  : 'Loading sign-in options…'}
              </p>
            )}
          </div>

          {/* Bottom links */}
          <div className="pt-5 sm:pt-6 border-t border-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-400">
            <Link to="/" className="inline-flex items-center gap-1.5 hover:text-[#00BFA6] transition-colors">
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Home</span>
            </Link>
            <div>
              {activeTab === 'login' ? (
                <span>
                  Don't have an account?{' '}
                  <button
                    onClick={() => setActiveTab('signup')}
                    className="text-[#00BFA6] font-bold hover:underline"
                  >
                    Sign up
                  </button>
                </span>
              ) : (
                <span>
                  Already have an account?{' '}
                  <button
                    onClick={() => setActiveTab('login')}
                    className="text-[#00BFA6] font-bold hover:underline"
                  >
                    Log in
                  </button>
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
