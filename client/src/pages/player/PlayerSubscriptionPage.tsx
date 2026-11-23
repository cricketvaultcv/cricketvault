import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { DashboardLayout } from '../../components/layout/DashboardLayout';
import { useApp, type PlayerRefundPreview } from '../../context/AppContext';
import { apiErrorMessage } from '../../services/api';
import { notify } from '../../services/toast';
import {
  CreditCard,
  ShieldCheck,
  ArrowRight,
  FileText,
} from 'lucide-react';

export const PlayerSubscriptionPage: React.FC = () => {
  const {
    currentUser,
    subscriptions,
    activeSubscription,
    assignedCoach,
    cancelPendingSubscription,
    getPlayerRefundPreview,
    requestPlayerRefund,
  } = useApp();
  const navigate = useNavigate();
  const [refundPreview, setRefundPreview] = useState<PlayerRefundPreview | null>(null);
  const [loadingRefundSubscriptionId, setLoadingRefundSubscriptionId] = useState<string | null>(null);
  const [requestingRefund, setRequestingRefund] = useState(false);
  const [cancellingPendingPayment, setCancellingPendingPayment] = useState(false);
  const cancelPayment = async () => {
    if (!activeSubscription) return;
    setCancellingPendingPayment(true);
    try {
      await cancelPendingSubscription(activeSubscription.id);
      navigate('/pricing');
    } catch (error) {
      notify.error(apiErrorMessage(error));
    } finally {
      setCancellingPendingPayment(false);
    }
  };

  const userSubs = subscriptions.filter((s) => currentUser && s.playerId === currentUser.id);
  const openRefundPreview = async (subscriptionId: string) => {
    setLoadingRefundSubscriptionId(subscriptionId);
    try {
      setRefundPreview(await getPlayerRefundPreview(subscriptionId));
    } catch (error) {
      notify.error(apiErrorMessage(error));
    } finally {
      setLoadingRefundSubscriptionId(null);
    }
  };
  const confirmRefundRequest = async () => {
    if (!refundPreview?.canRequest) return;
    setRequestingRefund(true);
    try {
      await requestPlayerRefund(refundPreview.subscriptionId);
      setRefundPreview(null);
    } catch (error) {
      notify.error(apiErrorMessage(error));
    } finally {
      setRequestingRefund(false);
    }
  };

  return (
    <DashboardLayout role="player">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-extrabold text-slate-900">Subscription &amp; Coaching Duration</h1>
            <p className="text-xs text-slate-500 mt-1">
              Track your coaching entitlement, days remaining, and transaction receipts.
            </p>
          </div>

          <Link
            to="/pricing"
            className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs flex items-center gap-2 self-start sm:self-auto"
          >
            <span>Browse All Plans</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {/* Current Active Plan Card */}
        {activeSubscription ? (
          <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-xs space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 border-b border-slate-100 gap-4">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#00BFA6]">
                  Active Coaching Entitlement
                </span>
                <h2 className="text-2xl font-extrabold text-slate-900 mt-0.5">
                  {activeSubscription.planName}
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  Ordered on {new Date(activeSubscription.purchasedAt).toLocaleDateString()} &bull; Order ID:{' '}
                  <span className="font-mono">{activeSubscription.paymentDetails.orderId}</span>
                </p>
              </div>

              <div className="text-right">
                <span
                  className={`inline-block px-3 py-1 rounded-full text-xs font-bold ${
                    activeSubscription.status === 'active'
                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                      : activeSubscription.status === 'pending_payment'
                      ? 'bg-rose-100 text-rose-800 border border-rose-200'
                      : activeSubscription.status === 'pending_coach'
                      ? 'bg-amber-100 text-amber-800 border border-amber-200'
                      : 'bg-rose-100 text-rose-800'
                  }`}
                >
                  {activeSubscription.status === 'active'
                    ? 'Active Coaching'
                    : activeSubscription.status === 'pending_payment'
                    ? 'Payment Pending'
                    : activeSubscription.status === 'pending_coach'
                    ? 'Pending Coach Acceptance'
                    : 'Expired'}
                </span>
                <div className="text-lg font-black text-slate-900 mt-1">
                  ₹{activeSubscription.price}
                </div>
                {activeSubscription.status === 'pending_payment' && (
                  <button
                    type="button"
                    onClick={cancelPayment}
                    disabled={cancellingPendingPayment}
                    className="mt-2 px-3 py-1.5 rounded-lg bg-rose-600 text-white text-xs font-bold disabled:opacity-60"
                  >
                    {cancellingPendingPayment ? 'Cancelling…' : 'Cancel Payment & Choose Another Plan'}
                  </button>
                )}
              </div>
            </div>

            {/* Countdown and policy bar */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
                <span className="text-[11px] text-slate-400 font-semibold uppercase">
                  Remaining Days
                </span>
                <div className="text-3xl font-black text-slate-900 mt-1 flex items-baseline gap-1">
                  <span>{activeSubscription.daysRemaining}</span>
                  <span className="text-xs text-slate-500 font-normal">days left</span>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
                <span className="text-[11px] text-slate-400 font-semibold uppercase">
                  Assigned Coach
                </span>
                <div className="text-sm font-extrabold text-slate-900 mt-1">
                  {assignedCoach ? assignedCoach.name : 'Awaiting Coach Selection'}
                </div>
                <div className="text-[11px] text-[#00BFA6] font-semibold mt-0.5">
                  {assignedCoach ? 'BCCI Certified' : 'Choose eligible mentor'}
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
                <span className="text-[11px] text-slate-400 font-semibold uppercase">
                  Payment Method
                </span>
                <div className="text-sm font-extrabold text-slate-900 mt-1 flex items-center gap-1.5">
                  <CreditCard className="w-4 h-4 text-emerald-600" />
                  <span>{activeSubscription.paymentDetails.method} (Razorpay)</span>
                </div>
                <div className="text-[11px] text-emerald-700 font-medium mt-0.5">
                  {activeSubscription.paymentDetails.status === 'success' ? 'Payment verified' : 'Payment verification required'}
                </div>
              </div>
            </div>

            {/* Business Policy Note (Required by prompt) */}
            <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200 text-xs text-slate-700 leading-relaxed space-y-1">
              <div className="font-bold text-slate-900 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-[#00BFA6]" />
                <span>CricketVault Coaching Period Guarantee:</span>
              </div>
              <p>
                The subscription duration countdown began the moment your assigned coach accepted your request. If a coach ever declines or becomes unavailable, your full paid entitlement is preserved, allowing you to select another accredited mentor at no additional cost.
              </p>
            </div>

          </div>
        ) : (
          <div className="bg-white rounded-3xl border border-slate-200 p-8 text-center space-y-4">
            <CreditCard className="w-12 h-12 text-slate-300 mx-auto" />
            <h3 className="text-lg font-bold text-slate-900">No Active Coaching Plan</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              You do not currently have an active coaching package. Choose a review plan to get personalized video analysis from certified coaches.
            </p>
            <Link
              to="/pricing"
              className="inline-block px-6 py-2.5 rounded-xl bg-[#00BFA6] text-[#0F172A] font-bold text-xs"
            >
              Choose a Subscription Plan
            </Link>
          </div>
        )}

        {/* Purchase & Transaction History */}
        <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-extrabold text-base text-slate-900">Purchase History &amp; Orders</h3>
            <span className="text-xs text-slate-400">{userSubs.length} Records</span>
          </div>

          <div className="divide-y divide-slate-100">
            {userSubs.map((sub) => (
              <div
                key={sub.id}
                className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center font-bold">
                    <FileText className="w-5 h-5 text-slate-500" />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-slate-900">{sub.planName}</h4>
                    <p className="text-xs text-slate-400">
                      Order: <span className="font-mono">{sub.paymentDetails.orderId}</span> &bull;{' '}
                      {new Date(sub.purchasedAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-3 sm:justify-end">
                  <span className="font-extrabold text-slate-900 text-sm">₹{sub.price}</span>
                  <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                    sub.status === 'refunded'
                      ? 'bg-slate-100 text-slate-700'
                      : sub.status === 'refund_pending'
                        ? 'bg-amber-100 text-amber-800'
                        : sub.paymentDetails.status === 'success'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-rose-100 text-rose-800'
                  }`}>
                    {sub.status === 'refunded'
                      ? 'Refunded'
                      : sub.status === 'refund_pending'
                        ? 'Refund pending'
                        : sub.paymentDetails.status === 'success'
                          ? `Paid (${sub.paymentDetails.method})`
                          : sub.status.replace(/_/g, ' ')}
                  </span>
                  {sub.status !== 'refunded' &&
                    sub.status !== 'refund_pending' &&
                    sub.status !== 'pending_payment' &&
                    sub.paymentDetails.status === 'success' && (
                      <button
                        type="button"
                        disabled={loadingRefundSubscriptionId === sub.id}
                        onClick={() => void openRefundPreview(sub.id)}
                        className="rounded-lg border border-slate-200 px-3 py-1.5 text-[11px] font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                      >
                        {loadingRefundSubscriptionId === sub.id ? 'Checking…' : 'Request refund'}
                      </button>
                    )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      {refundPreview && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !requestingRefund) {
              setRefundPreview(null);
            }
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="refund-title"
            className="w-full max-w-lg rounded-2xl bg-white p-5 shadow-2xl sm:p-6"
          >
            <h2 id="refund-title" className="text-lg font-extrabold text-slate-900">
              Refund estimate
            </h2>
            <p className="mt-1 text-sm text-slate-600">{refundPreview.planName}</p>
            <div className="mt-4 space-y-2 rounded-xl bg-slate-50 p-4 text-sm">
              <div className="flex justify-between gap-4">
                <span className="text-slate-600">Verified payment</span>
                <span className="font-bold text-slate-900">
                  ₹{(refundPreview.paidAmountPaise / 100).toLocaleString('en-IN')}
                </span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-slate-600">
                  Video submissions ({refundPreview.submittedVideos} × ₹80)
                </span>
                <span className="font-bold text-slate-900">
                  ₹{(refundPreview.deductionPaise / 100).toLocaleString('en-IN')}
                </span>
              </div>
              <div className="flex justify-between gap-4 border-t border-slate-200 pt-2">
                <span className="font-bold text-slate-700">Estimated refund</span>
                <span className="font-extrabold text-slate-900">
                  ₹{(refundPreview.refundPaise / 100).toLocaleString('en-IN')}
                </span>
              </div>
            </div>
            {refundPreview.message && (
              <p className="mt-3 rounded-lg bg-amber-50 p-3 text-xs leading-5 text-amber-800">
                {refundPreview.message}
              </p>
            )}
            {refundPreview.canRequest && (
              <p className="mt-3 text-xs leading-5 text-slate-600">
                Confirming ends this coaching subscription and submits the refund to Razorpay.
                Refund processing time depends on your payment provider. Only a verified captured
                Razorpay transaction can be refunded.
              </p>
            )}
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                disabled={requestingRefund}
                onClick={() => setRefundPreview(null)}
                className="rounded-lg border border-slate-200 px-4 py-2 text-xs font-bold text-slate-700 disabled:opacity-50"
              >
                Close
              </button>
              {refundPreview.canRequest && (
                <button
                  type="button"
                  disabled={requestingRefund}
                  onClick={() => void confirmRefundRequest()}
                  className="rounded-lg bg-rose-600 px-4 py-2 text-xs font-bold text-white disabled:opacity-50"
                >
                  {requestingRefund ? 'Submitting…' : 'Confirm refund'}
                </button>
              )}
            </div>
          </section>
        </div>
      )}
    </DashboardLayout>
  );
};
