import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { DashboardLayout } from '../../components/layout/DashboardLayout';
import { useApp } from '../../context/AppContext';
import { apiErrorMessage } from '../../services/api';
import { notify } from '../../services/toast';
import { VideoSubmission } from '../../types';
import {
  AlertTriangle,
  CheckCircle2,
  Link2,
  ShieldAlert,
  Loader2,
} from 'lucide-react';

export const PlayerVideoUploadPage: React.FC = () => {
  const { activeSubscription, cancelPendingSubscription, currentUser, submitVideoLink } = useApp();
  const navigate = useNavigate();

  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<VideoSubmission['category']>('Batting');
  const [notes, setNotes] = useState('');
  const [videoLink, setVideoLink] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successVideoId, setSuccessVideoId] = useState<string | null>(null);
  const [isCancellingPayment, setIsCancellingPayment] = useState(false);

  // Check subscription restrictions
  const isExpired = activeSubscription?.status === 'expired' || (activeSubscription && activeSubscription.daysRemaining <= 0);
  const hasNoPlan = !activeSubscription;
  const isPendingPayment = activeSubscription?.status === 'pending_payment';
  const isPendingCoach = activeSubscription?.status === 'pending_coach';

  const handleCancelPendingPayment = async () => {
    if (!activeSubscription) return;
    setIsCancellingPayment(true);
    try {
      await cancelPendingSubscription(activeSubscription.id);
      navigate('/pricing');
    } catch (error) {
      notify.error(apiErrorMessage(error));
    } finally {
      setIsCancellingPayment(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!videoLink.trim()) {
      setErrorMessage('Please enter a YouTube or Google Drive video link.');
      return;
    }
    if (!title.trim()) {
      setErrorMessage('Please provide a title for this video clip.');
      return;
    }

    setErrorMessage('');
    setIsSubmitting(true);
    try {
      let res = await submitVideoLink({
        title,
        category,
        linkUrl: videoLink.trim(),
        notes,
      });
      if (res.code === 'REFERRAL_CREDIT_CONFIRMATION_REQUIRED') {
        const credits = res.referralCredits ?? currentUser?.referralReviewCredits ?? 0;
        const approved = window.confirm(
          `Your plan's video-review limit is reached. Use 1 of your ${credits} referral credit${credits === 1 ? '' : 's'} for this extra review?`,
        );
        if (approved) {
          res = await submitVideoLink({
            title,
            category,
            linkUrl: videoLink.trim(),
            notes,
            useReferralCredit: true,
          });
        } else {
          setErrorMessage('Video submission cancelled. Your referral credits were not used.');
          return;
        }
      }
      if (res.success && res.video) {
        setSuccessVideoId(res.video.id);
      } else {
        const message = res.message || 'Video link could not be submitted.';
        setErrorMessage(message);
        notify.error(message);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Video link could not be submitted.';
      setErrorMessage(message);
      notify.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <DashboardLayout role="player">
      <div className="max-w-3xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900">Submit Training Video Link</h1>
          <p className="text-xs text-slate-500 mt-1">
            Share a YouTube or Google Drive practice clip for review by your assigned coach.
          </p>
          {currentUser?.referralReviewCredits ? (
            <p className="mt-2 text-xs font-semibold text-[#008f7e]">
              Referral credits available: {currentUser.referralReviewCredits}. Each credit can approve one extra video review after your plan limit.
            </p>
          ) : null}
        </div>

        {/* Subscription Restriction Banner (Required by prompt) */}
        {isPendingPayment ? (
          <div className="p-6 rounded-3xl bg-rose-50 border border-rose-200 text-rose-900 space-y-3">
            <div className="flex items-center gap-3">
              <ShieldAlert className="w-6 h-6 text-rose-600 shrink-0" />
              <h3 className="font-bold text-sm">Payment Confirmation Required</h3>
            </div>
            <p className="text-xs leading-relaxed">
              Complete your pending payment before selecting a coach or sharing video links.
            </p>
            <button
              type="button"
              onClick={handleCancelPendingPayment}
              disabled={isCancellingPayment}
              className="inline-block px-5 py-2.5 rounded-xl bg-rose-600 text-white font-bold text-xs"
            >
              {isCancellingPayment ? 'Cancelling…' : 'Cancel Payment & Choose Another Plan'}
            </button>
          </div>
        ) : isExpired ? (
          <div className="p-6 rounded-3xl bg-amber-50 border border-amber-300 text-amber-900 space-y-3">
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-6 h-6 text-amber-600 shrink-0" />
              <h3 className="font-bold text-sm">Subscription Has Expired — Submissions Restricted</h3>
            </div>
            <p className="text-xs leading-relaxed">
              Your coaching duration has expired. New video link submissions and action plan edits are disabled. Past submissions and reviews remain accessible.
            </p>
            <div className="pt-2">
              <Link
                to="/pricing"
                className="inline-block px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs"
              >
                Renew Subscription Plan
              </Link>
            </div>
          </div>
        ) : hasNoPlan ? (
          <div className="p-6 rounded-3xl bg-slate-100 border border-slate-300 text-slate-800 space-y-3">
            <div className="flex items-center gap-3">
              <ShieldAlert className="w-6 h-6 text-slate-600 shrink-0" />
              <h3 className="font-bold text-sm">Subscription Required</h3>
            </div>
            <p className="text-xs leading-relaxed">
              An active coaching subscription is required to submit videos for coach review.
            </p>
            <Link
              to="/pricing"
              className="inline-block px-5 py-2.5 rounded-xl bg-[#00BFA6] text-[#0F172A] font-bold text-xs"
            >
              Choose a Review Plan
            </Link>
          </div>
        ) : isPendingCoach ? (
          <div className="p-6 rounded-3xl bg-blue-50 border border-blue-200 text-blue-900 space-y-3">
            <div className="flex items-center gap-3">
              <ShieldAlert className="w-6 h-6 text-blue-600 shrink-0" />
              <h3 className="font-bold text-sm">Awaiting Coach Acceptance</h3>
            </div>
            <p className="text-xs leading-relaxed">
              You have a pending coach assignment request. Sharing video links unlocks as soon as the coach accepts.
            </p>
            <Link
              to="/player/assignment"
              className="inline-block px-5 py-2.5 rounded-xl bg-blue-600 text-white font-bold text-xs"
            >
              View Assignment Status
            </Link>
          </div>
        ) : successVideoId ? (
          <div className="bg-white rounded-3xl border border-emerald-200 p-8 text-center space-y-4 shadow-sm">
            <div className="w-16 h-16 rounded-full bg-emerald-100 text-[#00BFA6] flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-10 h-10" />
            </div>
            <h2 className="text-xl font-extrabold text-slate-900">
              Video Submitted Successfully!
            </h2>
            <p className="text-xs text-slate-600 max-w-md mx-auto">
              Your video has been added to your coach's review workspace. You will receive a notification once the coach completes your frame-by-frame analysis.
            </p>
            <div className="flex justify-center gap-3 pt-2">
              <Link
                to={`/player/videos/${successVideoId}`}
                className="px-5 py-2.5 rounded-xl bg-[#00BFA6] text-[#0F172A] font-bold text-xs"
              >
                View Submission
              </Link>
              <button
                type="button"
                onClick={() => {
                  setSuccessVideoId(null);
                  setVideoLink('');
                  setTitle('');
                  setNotes('');
                }}
                className="px-5 py-2.5 rounded-xl bg-slate-100 text-slate-700 font-semibold text-xs border border-slate-200"
              >
                Submit Another Link
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-xs space-y-6">
            {errorMessage && (
              <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            <div>
              <label className="mb-2 block text-xs font-bold text-slate-700">
                YouTube or Google Drive Link
              </label>
              <div className="space-y-2">
                <input
                  type="url"
                  value={videoLink}
                  onChange={(event) => setVideoLink(event.target.value)}
                  placeholder="https://youtu.be/... or https://drive.google.com/file/d/.../view"
                  className="w-full rounded-xl border border-slate-300 px-3.5 py-3 text-xs font-medium text-slate-800 focus:border-[#00BFA6] focus:outline-none"
                  required
                />
                <p className="text-[11px] leading-5 text-slate-500">
                  Share a YouTube link or set Google Drive access to “Anyone with the link” and Viewer.
                </p>
              </div>
            </div>

            {/* Video Title */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Video Title / Topic
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Batting - Front Foot Drive & Weight Transfer"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs font-medium text-slate-800 focus:outline-none focus:border-[#00BFA6]"
              />
            </div>

            {/* Category selection */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Cricket Skill Category
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                {(['Batting', 'Bowling', 'Fielding', 'Wicketkeeping', 'Fitness'] as const).map(
                  (cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setCategory(cat)}
                      className={`py-2 px-3 rounded-xl text-xs font-semibold border transition-all ${
                        category === cat
                          ? 'border-[#00BFA6] bg-[#00BFA6]/10 text-[#0F172A] font-bold'
                          : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      {cat}
                    </button>
                  )
                )}
              </div>
            </div>

            {/* Coach Notes */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Notes / What should the coach look out for?
              </label>
              <textarea
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g. In this clip, I am trying to play against an outswinging delivery. Please check if my front foot is planting too across the line."
                className="w-full p-3 rounded-xl border border-slate-300 text-xs font-medium text-slate-800 focus:outline-none focus:border-[#00BFA6]"
              />
            </div>

            {/* Submit button */}
            <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
              <span className="text-[11px] text-slate-400">
                🔒 Privacy guaranteed &bull; Private coach review
              </span>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-6 py-3 rounded-xl bg-[#00BFA6] hover:bg-[#00D6BA] text-[#0F172A] font-extrabold text-xs shadow-md flex items-center gap-2 transition-colors disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Submitting...</span>
                  </>
                ) : (
                  <>
                    <Link2 className="w-4 h-4" />
                    <span>Submit for Review</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </DashboardLayout>
  );
};
