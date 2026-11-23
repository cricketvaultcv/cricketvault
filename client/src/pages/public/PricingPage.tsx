import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Navbar } from '../../components/layout/Navbar';
import { Footer } from '../../components/layout/Footer';
import { useApp } from '../../context/AppContext';
import type { CouponQuote } from '../../context/AppContext';
import { apiClient, apiErrorMessage } from '../../services/api';
import { notify } from '../../services/toast';
import {
  Check,
  ShieldCheck,
  CreditCard,
  Smartphone,
  Building,
  Wallet,
  Sparkles,
  ArrowRight,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Loader2,
  Lock,
} from 'lucide-react';

const formatPaise = (amount: number) =>
  new Intl.NumberFormat('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })
    .format(amount / 100);

export const PricingPage: React.FC = () => {
  const { plans, currentUser, purchaseSubscription, validateSubscriptionCoupon, activeSubscription, refresh } = useApp();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState<'reviews' | 'mentorship'>('reviews');
  const [selectedPlanId, setSelectedPlanId] = useState<string>(
    searchParams.get('plan') || ''
  );
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<
    'UPI' | 'Cards' | 'Net Banking' | 'Wallets'
  >('UPI');

  // Checkout modal states
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [checkoutStep, setCheckoutStep] = useState<'email-verification' | 'details' | 'processing' | 'success' | 'failure'>('details');
  const [checkoutOrderId, setCheckoutOrderId] = useState('');
  const [checkoutError, setCheckoutError] = useState('');
  const [couponInput, setCouponInput] = useState('');
  const [couponQuote, setCouponQuote] = useState<CouponQuote | null>(null);
  const [couponBusy, setCouponBusy] = useState(false);
  const [couponError, setCouponError] = useState('');
  const [emailOtp, setEmailOtp] = useState('');
  const [emailOtpSent, setEmailOtpSent] = useState(false);
  const [emailOtpBusy, setEmailOtpBusy] = useState(false);
  const [emailOtpError, setEmailOtpError] = useState('');
  const [emailVerifiedForPurchase, setEmailVerifiedForPurchase] = useState(false);

  const selectedPlan = plans.find((p) => p.id === selectedPlanId) || plans[0];
  const hasExistingSubscription = currentUser?.role === 'player' && Boolean(activeSubscription);
  const originalAmountPaise = Math.round((selectedPlan?.price || 0) * 100);
  const appliedCoupon = couponQuote?.originalAmountPaise === originalAmountPaise ? couponQuote : null;
  const totalPayablePaise = appliedCoupon?.finalAmountPaise ?? originalAmountPaise;
  const hasPurchaseEmailVerification = Boolean(
    currentUser?.subscriptionEmailVerified || emailVerifiedForPurchase,
  );

  useEffect(() => {
    if (plans.length && !plans.some((plan) => plan.id === selectedPlanId)) {
      setSelectedPlanId(plans[0].id);
    }
  }, [plans, selectedPlanId]);

  const handleSelectPlan = (planId: string) => {
    setSelectedPlanId(planId);
    setCouponInput('');
    setCouponQuote(null);
    setCouponError('');
  };

  const handleApplyCoupon = async () => {
    if (!selectedPlan || !couponInput.trim()) return;
    if (!currentUser) {
      navigate('/login?redirect=/pricing');
      return;
    }
    setCouponBusy(true);
    setCouponError('');
    try {
      const quote = await validateSubscriptionCoupon(selectedPlan.id, couponInput);
      setCouponQuote(quote);
      setCouponInput(quote.code);
    } catch (error) {
      setCouponQuote(null);
      setCouponError(apiErrorMessage(error));
    } finally {
      setCouponBusy(false);
    }
  };

  const handleStartCheckout = () => {
    if (!currentUser) {
      navigate('/login?redirect=/pricing');
      return;
    }

    if (activeSubscription) {
      navigate('/player/subscription');
      return;
    }

    setCheckoutStep(hasPurchaseEmailVerification ? 'details' : 'email-verification');
    setCheckoutError('');
    setEmailOtp('');
    setEmailOtpSent(false);
    setEmailOtpError('');
    setIsCheckingOut(true);
  };

  const sendPurchaseEmailCode = async () => {
    setEmailOtpBusy(true);
    setEmailOtpError('');
    try {
      const { data } = await apiClient.post('/subscriptions/email-verification/request');
      if (data.verified) {
        setEmailVerifiedForPurchase(true);
        setCheckoutStep('details');
        await refresh().catch((error) => notify.error(apiErrorMessage(error)));
        return;
      }
      setEmailOtpSent(true);
    } catch (error) {
      setEmailOtpError(apiErrorMessage(error));
    } finally {
      setEmailOtpBusy(false);
    }
  };

  const verifyPurchaseEmailCode = async (event: React.FormEvent) => {
    event.preventDefault();
    setEmailOtpBusy(true);
    setEmailOtpError('');
    try {
      await apiClient.post('/subscriptions/email-verification/verify', { otp: emailOtp });
      setEmailVerifiedForPurchase(true);
      setCheckoutStep('details');
      await refresh().catch((error) => notify.error(apiErrorMessage(error)));
    } catch (error) {
      setEmailOtpError(apiErrorMessage(error));
    } finally {
      setEmailOtpBusy(false);
    }
  };

  const processPayment = async () => {
    setCheckoutStep('processing');
    try {
      if (!selectedPlan) throw new Error('No published plans are currently available.');
      const result = await purchaseSubscription(selectedPlan.id, selectedPaymentMethod, appliedCoupon?.code);
      if (result.success && result.subscription) {
        setCheckoutOrderId(result.subscription.paymentDetails.orderId);
        setCheckoutStep('success');
      } else {
        setCheckoutStep('failure');
        const message = result.message || 'Payment could not be completed.';
        setCheckoutError(message);
        notify.error(message);
      }
    } catch (error) {
      setCheckoutStep('failure');
      const message = error instanceof Error ? error.message : 'Payment could not be completed.';
      setCheckoutError(message);
      notify.error(message);
    }
  };

  if (!selectedPlan) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex flex-col">
        <Navbar />
        <main className="max-w-6xl mx-auto px-4 py-12 flex-1 w-full text-center text-sm text-slate-600">
          No coaching plans are currently available.
        </main>
        <Footer />
      </div>
    );
  }
  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col">
      <Navbar />

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12 flex-1 w-full">
        {/* Header (Matches Reference 1 & 2 Screen 7) */}
        <div className="text-center max-w-2xl mx-auto mb-10 space-y-2">
          <span className="text-xs font-bold uppercase tracking-wider text-[#00BFA6]">
            Simple Pricing. Real Value.
          </span>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
            Choose Your Plan
          </h1>
          <p className="text-xs sm:text-sm text-slate-600">
            Get expert feedback and premium resources to take your game to the next level. Payments are securely processed through Razorpay.
          </p>

          {/* Plan Category Tabs */}
          <div className="pt-4 flex justify-center">
            <div className="inline-flex bg-slate-200/80 p-1 rounded-xl text-xs font-bold border border-slate-300">
              <button
                onClick={() => setActiveTab('reviews')}
                className={`px-5 py-2 rounded-lg transition-all ${
                  activeTab === 'reviews'
                    ? 'bg-[#0F172A] text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Video Reviews
              </button>
              <button
                onClick={() => setActiveTab('mentorship')}
                className={`px-5 py-2 rounded-lg transition-all ${
                  activeTab === 'mentorship'
                    ? 'bg-[#0F172A] text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Monthly Mentorship
              </button>
            </div>
          </div>
        </div>

        {hasExistingSubscription && activeSubscription && (
          <div className="mb-8 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 mt-0.5 text-emerald-600 shrink-0" />
              <div>
                <h2 className="text-sm font-bold text-emerald-900">
                  {activeSubscription.status === 'active'
                    ? "You're in an active subscription"
                    : activeSubscription.status === 'pending_coach'
                      ? 'Your subscription is active and awaiting coach selection'
                      : 'You have a subscription awaiting payment'}
                </h2>
                <p className="mt-1 text-xs text-emerald-800">
                  {activeSubscription.planName}
                  {activeSubscription.status === 'active' && activeSubscription.daysRemaining > 0
                    ? ` · ${activeSubscription.daysRemaining} days remaining`
                    : ''}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => navigate('/player/subscription')}
              className="shrink-0 rounded-xl bg-emerald-700 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-800"
            >
              Manage Subscription
            </button>
          </div>
        )}

        {/* Plan Cards Grid (Matches Reference 1 & 2 Screen 7) */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
          {plans
            .filter((p) =>
              activeTab === 'reviews' ? p.type === 'review' : p.type === 'development'
            )
            .map((plan) => {
              const isSelected = selectedPlanId === plan.id;

              return (
                <div
                  key={plan.id}
                  onClick={() => handleSelectPlan(plan.id)}
                  className={`relative rounded-3xl p-6 sm:p-7 flex flex-col justify-between transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-white border-2 border-[#00BFA6] shadow-xl ring-2 ring-[#00BFA6]/20'
                      : 'bg-white border border-slate-200 hover:border-slate-300 shadow-sm'
                  }`}
                >
                  {plan.isPopular && (
                    <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-[#00BFA6] text-[#0F172A] font-extrabold text-[11px] shadow-sm flex items-center gap-1">
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Most Popular</span>
                    </div>
                  )}

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-extrabold text-lg text-slate-900">{plan.name}</h3>
                      <div className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700">
                        {plan.turnaround}
                      </div>
                    </div>

                    <p className="text-xs text-slate-500 mb-4">{plan.tagline}</p>

                    <div className="flex items-baseline gap-2 mb-6">
                      <span className="text-4xl font-extrabold text-slate-900">₹{plan.price}</span>
                      {plan.originalPrice && (
                        <span className="text-sm text-slate-400 line-through">
                          ₹{plan.originalPrice}
                        </span>
                      )}
                      <span className="text-xs text-slate-500 font-medium">/ coaching pack</span>
                    </div>

                    <div className="border-t border-slate-100 pt-5 space-y-3">
                      <div className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                        Included Features:
                      </div>
                      <ul className="space-y-2.5 text-xs text-slate-600">
                        {plan.features.map((feat, idx) => (
                          <li key={idx} className="flex items-start gap-2.5">
                            <Check className="w-4 h-4 text-[#00BFA6] shrink-0 mt-0.5" />
                            <span>{feat}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  <div className="mt-8 pt-4 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (hasExistingSubscription) {
                          navigate('/player/subscription');
                          return;
                        }
                        handleSelectPlan(plan.id);
                        handleStartCheckout();
                      }}
                      className={`w-full py-3 rounded-xl font-bold text-xs transition-all shadow-sm ${
                        isSelected
                          ? 'bg-[#00BFA6] hover:bg-[#00D6BA] text-[#0F172A]'
                          : 'bg-slate-900 hover:bg-slate-800 text-white'
                      }`}
                    >
                      {hasExistingSubscription ? 'Manage Subscription' : `Get Started for ₹${plan.price}`}
                    </button>
                  </div>
                </div>
              );
            })}
        </div>

        {/* Selected Plan Checkout Preview Box (Matches bottom of Screen 7) */}
        <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm max-w-3xl mx-auto space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-6 border-b border-slate-200 gap-4">
            <div>
              <span className="text-[11px] font-bold text-[#00BFA6] uppercase tracking-wider">
                Selected Package
              </span>
              <h3 className="text-xl font-bold text-slate-900 mt-0.5">
                {selectedPlan.name} &bull; ₹{formatPaise(totalPayablePaise)}
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                {selectedPlan.reviewCount + (currentUser?.referralReviewCredits || 0)} video review
                {currentUser?.referralReviewCredits
                  ? ` (${currentUser.referralReviewCredits} referral bonus)`
                  : ''} &bull; {selectedPlan.turnaround}
              </p>
            </div>

            <div className="text-right">
              <span className="text-xs text-slate-400">Total Payable</span>
              <div className="text-2xl font-black text-slate-900">₹{formatPaise(totalPayablePaise)}</div>
            </div>
          </div>

          {hasExistingSubscription ? (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-center text-xs text-emerald-800">
              You already have a subscription. Manage its payment, coach assignment, and status from your subscription page.
            </div>
          ) : (
          <>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <label htmlFor="subscription-coupon" className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-800">
              Discount Coupon
            </label>
            <div className="flex flex-col gap-2 sm:flex-row">
              <input
                id="subscription-coupon"
                value={couponInput}
                onChange={(event) => {
                  setCouponInput(event.target.value.toUpperCase());
                  setCouponQuote(null);
                  setCouponError('');
                }}
                placeholder="Enter coupon code"
                maxLength={30}
                className="min-w-0 flex-1 rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-xs font-semibold uppercase"
              />
              <button
                type="button"
                disabled={!couponInput.trim() || couponBusy}
                onClick={handleApplyCoupon}
                className="rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-bold text-white disabled:cursor-not-allowed disabled:opacity-50"
              >
                {couponBusy ? 'Checking…' : appliedCoupon ? 'Applied' : 'Apply'}
              </button>
              {appliedCoupon && (
                <button
                  type="button"
                  onClick={() => {
                    setCouponQuote(null);
                    setCouponInput('');
                  }}
                  className="rounded-xl border border-slate-300 px-3 py-2.5 text-xs font-bold text-slate-600"
                >
                  Remove
                </button>
              )}
            </div>
            {couponError && <p className="mt-2 text-xs font-medium text-rose-600" role="alert">{couponError}</p>}
            {appliedCoupon && (
              <div className="mt-3 flex justify-between text-xs font-semibold text-emerald-700">
                <span>{appliedCoupon.code} applied</span>
                <span>You save ₹{formatPaise(appliedCoupon.discountPaise)}</span>
              </div>
            )}
          </div>
          {/* Payment Methods Selector (Matches Screen 7) */}
          <div>
            <div className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-3">
              Payment Methods
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <button
                type="button"
                onClick={() => setSelectedPaymentMethod('UPI')}
                className={`p-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-2 transition-all ${
                  selectedPaymentMethod === 'UPI'
                    ? 'border-[#00BFA6] bg-[#00BFA6]/10 text-[#0F172A] ring-1 ring-[#00BFA6]'
                    : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
                }`}
              >
                <Smartphone className="w-4 h-4 text-[#00BFA6]" />
                <span>UPI (GPay / PhonePe)</span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedPaymentMethod('Cards')}
                className={`p-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-2 transition-all ${
                  selectedPaymentMethod === 'Cards'
                    ? 'border-[#00BFA6] bg-[#00BFA6]/10 text-[#0F172A] ring-1 ring-[#00BFA6]'
                    : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
                }`}
              >
                <CreditCard className="w-4 h-4 text-blue-500" />
                <span>Debit / Credit Cards</span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedPaymentMethod('Net Banking')}
                className={`p-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-2 transition-all ${
                  selectedPaymentMethod === 'Net Banking'
                    ? 'border-[#00BFA6] bg-[#00BFA6]/10 text-[#0F172A] ring-1 ring-[#00BFA6]'
                    : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
                }`}
              >
                <Building className="w-4 h-4 text-indigo-500" />
                <span>Net Banking</span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedPaymentMethod('Wallets')}
                className={`p-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-2 transition-all ${
                  selectedPaymentMethod === 'Wallets'
                    ? 'border-[#00BFA6] bg-[#00BFA6]/10 text-[#0F172A] ring-1 ring-[#00BFA6]'
                    : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
                }`}
              >
                <Wallet className="w-4 h-4 text-amber-500" />
                <span>Wallets</span>
              </button>
            </div>
          </div>

          {/* Razorpay Trust Seal Card (from Reference 1 & 2 Screen 7) */}
          <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200/80 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white shadow-xs text-[#00BFA6] flex items-center justify-center shrink-0">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div>
                <div className="text-xs font-bold text-slate-900">
                  Secure Payments with Razorpay
                </div>
                <div className="text-[11px] text-slate-600">
                  Your payment is 100% secure. Verified 256-bit encryption.
                </div>
              </div>
            </div>

            <div className="hidden sm:flex items-center gap-1.5 font-black text-slate-700 text-xs tracking-tighter">
              <span className="text-blue-600">Razor</span>
              <span className="text-blue-900">pay</span>
            </div>
          </div>

          {/* Proceed CTA */}
          <button
            type="button"
            onClick={handleStartCheckout}
            className="w-full py-3.5 rounded-xl bg-[#00BFA6] hover:bg-[#00D6BA] text-[#0F172A] font-extrabold text-sm shadow-md transition-all flex items-center justify-center gap-2"
          >
            <span>Proceed to Pay ₹{formatPaise(totalPayablePaise)}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
          </>
          )}
        </div>
      </main>

      {/* Checkout summary and payment status */}
      {isCheckingOut && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-xs"
            onClick={() => {
              if (checkoutStep !== 'processing') setIsCheckingOut(false);
            }}
          />

          <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl z-50 overflow-hidden border border-slate-200">
            {/* Header */}
            <div className="px-6 py-4 bg-[#0F172A] text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Lock className="w-4 h-4 text-[#00BFA6]" />
                <span className="font-bold text-sm">CricketVault Secure Checkout</span>
              </div>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#00BFA6]/20 text-[#00BFA6] border border-[#00BFA6]/40">
                Secure Checkout
              </span>
            </div>

            {/* Stepper details */}
            <div className="p-6">
              {checkoutStep === 'email-verification' && (
                <div className="space-y-4">
                  <div className="text-center">
                    <span className="text-xs font-bold uppercase tracking-wider text-[#00BFA6]">Required before purchase</span>
                    <h3 className="mt-1 text-lg font-extrabold text-slate-900">Verify your email</h3>
                    <p className="mt-2 text-xs leading-relaxed text-slate-500">
                      Enter the 6-digit code sent to {currentUser?.email}. The code expires in 10 minutes.
                    </p>
                  </div>
                  {!emailOtpSent ? (
                    <button
                      type="button"
                      disabled={emailOtpBusy}
                      onClick={sendPurchaseEmailCode}
                      className="w-full rounded-xl bg-[#00BFA6] px-4 py-3 text-xs font-bold text-[#0F172A] disabled:opacity-60"
                    >
                      {emailOtpBusy ? 'Sending code…' : 'Send email verification code'}
                    </button>
                  ) : (
                    <form onSubmit={verifyPurchaseEmailCode} className="space-y-3">
                      <input
                        type="text"
                        required
                        inputMode="numeric"
                        autoComplete="one-time-code"
                        pattern="[0-9]{6}"
                        maxLength={6}
                        value={emailOtp}
                        onChange={(event) => setEmailOtp(event.target.value.replace(/\D/g, '').slice(0, 6))}
                        placeholder="6-digit code"
                        aria-label="Email verification code"
                        className="w-full rounded-xl border border-slate-300 px-3 py-3 text-center text-lg tracking-[0.5em]"
                      />
                      <button
                        type="submit"
                        disabled={emailOtpBusy}
                        className="w-full rounded-xl bg-[#00BFA6] px-4 py-3 text-xs font-bold text-[#0F172A] disabled:opacity-60"
                      >
                        {emailOtpBusy ? 'Verifying…' : 'Verify email and continue'}
                      </button>
                      <button
                        type="button"
                        disabled={emailOtpBusy}
                        onClick={sendPurchaseEmailCode}
                        className="w-full text-xs font-semibold text-[#00BFA6] disabled:opacity-50"
                      >
                        Send another code
                      </button>
                    </form>
                  )}
                  {emailOtpError && <p className="text-center text-xs text-rose-600" role="alert">{emailOtpError}</p>}
                  <button
                    type="button"
                    onClick={() => setIsCheckingOut(false)}
                    className="w-full rounded-xl border border-slate-300 py-2.5 text-xs font-semibold text-slate-600"
                  >
                    Cancel
                  </button>
                </div>
              )}

              {checkoutStep === 'details' && (
                <div className="space-y-4">
                  <div className="text-center pb-3 border-b border-slate-100">
                    <span className="text-xs text-slate-500">Plan Summary</span>
                    <h3 className="font-extrabold text-lg text-slate-900">{selectedPlan.name}</h3>
                    <div className="text-2xl font-black text-[#00BFA6] mt-1">
                      ₹{formatPaise(totalPayablePaise)}
                    </div>
                  </div>

                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between text-slate-600">
                      <span>Method:</span>
                      <strong className="text-slate-900">{selectedPaymentMethod}</strong>
                    </div>
                    <div className="flex justify-between text-slate-600">
                      <span>Subtotal:</span>
                      <span>₹{formatPaise(originalAmountPaise)}</span>
                    </div>
                    {currentUser?.referralReviewCredits ? (
                      <div className="flex justify-between text-emerald-700">
                        <span>Referral bonus:</span>
                        <span>+{currentUser.referralReviewCredits} reviews</span>
                      </div>
                    ) : null}
                    {appliedCoupon && (
                      <div className="flex justify-between text-emerald-700">
                        <span>Coupon ({appliedCoupon.code}):</span>
                        <span>-₹{formatPaise(appliedCoupon.discountPaise)}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-slate-600">
                      <span>GST (18% inclusive):</span>
                      <span>₹0</span>
                    </div>
                    <div className="flex justify-between text-slate-900 font-bold pt-2 border-t border-slate-100">
                      <span>Amount Payable:</span>
                      <span>₹{formatPaise(totalPayablePaise)}</span>
                    </div>
                  </div>

                  <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-amber-800 text-[11px] leading-relaxed">
                    Payment is verified by the server before coach selection is enabled. Local development without Razorpay credentials uses a development-only confirmation.
                  </div>

                  <div className="space-y-2 pt-2">
                    <button
                      type="button"
                      onClick={processPayment}
                      className="w-full py-3 rounded-xl bg-[#00BFA6] hover:bg-[#00D6BA] text-[#0F172A] font-bold text-xs shadow-md transition-colors"
                    >
                      Continue to Payment (₹{formatPaise(totalPayablePaise)})
                    </button>

                    <button
                      type="button"
                      onClick={() => setIsCheckingOut(false)}
                      className="w-full py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 font-semibold text-xs border border-slate-300 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {checkoutStep === 'processing' && (
                <div className="py-12 text-center space-y-4">
                  <Loader2 className="w-12 h-12 text-[#00BFA6] animate-spin mx-auto" />
                  <div>
                    <h4 className="font-bold text-base text-slate-900">
                      Connecting to Bank Gateway...
                    </h4>
                    <p className="text-xs text-slate-500 mt-1">
                      Verifying UPI/Card authorization. Please do not close or refresh.
                    </p>
                  </div>
                </div>
              )}

              {checkoutStep === 'success' && (
                <div className="text-center space-y-4 py-4">
                  <div className="w-16 h-16 rounded-full bg-emerald-100 text-[#00BFA6] flex items-center justify-center mx-auto">
                    <CheckCircle2 className="w-10 h-10" />
                  </div>
                  <div>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-[#00BFA6]">
                      Payment Successful
                    </span>
                    <h4 className="font-extrabold text-xl text-slate-900 mt-0.5">
                      Order #{checkoutOrderId}
                    </h4>
                    <p className="text-xs text-slate-600 mt-1 max-w-xs mx-auto">
                      Your payment of ₹{formatPaise(totalPayablePaise)} was authorized. You can now select an accredited coach to begin your coaching period!
                    </p>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-xl text-xs text-slate-700 text-left space-y-1">
                    <div><strong>Plan:</strong> {selectedPlan.name}</div>
                    <div><strong>Turnaround:</strong> {selectedPlan.turnaround}</div>
                    <div><strong>Coaching status:</strong> Ready for coach selection</div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setIsCheckingOut(false);
                      navigate('/player/coaches');
                    }}
                    className="w-full py-3 rounded-xl bg-[#00BFA6] hover:bg-[#00D6BA] text-[#0F172A] font-bold text-xs flex items-center justify-center gap-2 shadow-md transition-colors"
                  >
                    <span>Proceed to Select Coach</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              )}

              {checkoutStep === 'failure' && (
                <div className="text-center space-y-4 py-4">
                  <div className="w-16 h-16 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
                    <XCircle className="w-10 h-10" />
                  </div>
                  <div>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-rose-600">
                      Payment Unsuccessful
                    </span>
                    <h4 className="font-extrabold text-lg text-slate-900 mt-0.5">
                      Transaction Failed
                    </h4>
                    <p className="text-xs text-slate-600 mt-1">
                      {checkoutError}
                    </p>
                  </div>

                  <div className="flex gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setCheckoutStep('details')}
                      className="flex-1 py-2.5 rounded-xl bg-[#0F172A] text-white font-bold text-xs"
                    >
                      Try Again
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsCheckingOut(false)}
                      className="flex-1 py-2.5 rounded-xl bg-slate-100 text-slate-700 font-semibold text-xs border border-slate-200"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
};
