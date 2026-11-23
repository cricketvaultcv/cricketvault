import React, { useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Navbar } from '../../components/layout/Navbar';
import { Footer } from '../../components/layout/Footer';
import { useApp } from '../../context/AppContext';
import { apiErrorMessage } from '../../services/api';
import { notify } from '../../services/toast';
import {
  Search,
  Star,
  Award,
  MapPin,
  CheckCircle,
  Clock,
  Shield,
  ArrowRight,
  UserCheck,
  Video,
  X,
  Sparkles,
} from 'lucide-react';
import { User } from '../../types';

export const CoachDirectoryPage: React.FC = () => {
  const { users, currentUser, activeSubscription, requestCoach, coachRequests, refresh } = useApp();
  const navigate = useNavigate();

  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCoachModal, setSelectedCoachModal] = useState<User | null>(null);
  const [requestSuccess, setRequestSuccess] = useState(false);
  const [coachNotes, setCoachNotes] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [refreshError, setRefreshError] = useState('');

  const refreshDirectory = useCallback(async () => {
    setRefreshing(true);
    setRefreshError('');
    try {
      await refresh();
    } catch (error) {
      setRefreshError(apiErrorMessage(error));
    } finally {
      setRefreshing(false);
    }
  }, [refresh]);

  const coaches = users.filter((u) => u.role === 'coach');

  const categories = ['All', 'Batting', 'Bowling', 'Fielding', 'Wicketkeeping'];

  const filteredCoaches = coaches.filter((coach) => {
    const prof = coach.coachProfile;
    if (!prof) return false;

    const matchesCategory =
      selectedCategory === 'All' ||
      prof.specialization.toLowerCase().includes(selectedCategory.toLowerCase()) ||
      prof.supportedRoles.some((r) => r.toLowerCase().includes(selectedCategory.toLowerCase()));

    const matchesSearch =
      coach.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      prof.specialization.toLowerCase().includes(searchQuery.toLowerCase()) ||
      coach.location.toLowerCase().includes(searchQuery.toLowerCase()) ||
      prof.approach.toLowerCase().includes(searchQuery.toLowerCase());

    return matchesCategory && matchesSearch;
  });

  const handleSelectCoach = (coach: User) => {
    if (!currentUser) {
      navigate('/login?redirect=/coaches');
      return;
    }

    if (!activeSubscription) {
      notify.error('Please choose and pay for a coaching subscription before selecting a coach.');
      navigate('/pricing');
      return;
    }
    if (activeSubscription.status === 'pending_payment') {
      notify.error('Complete your pending payment before selecting a coach.');
      navigate('/player/subscription');
      return;
    }
    if (activeSubscription.status !== 'pending_coach') {
      notify.error('A coach is already assigned to your active subscription.');
      navigate('/player/subscription');
      return;
    }

    // Check if player already requested this or another coach
    const pendingReq = coachRequests.find(
      (r) => r.playerId === currentUser.id && r.status === 'pending'
    );
    if (pendingReq) {
      notify.error(
        `You already have a pending assignment request with Coach ${pendingReq.coachName}. Please wait for their response or manage it in Assignment Status.`
      );
      navigate('/player/assignment');
      return;
    }

    setSelectedCoachModal(coach);
  };

  const submitAssignment = async () => {
    if (!selectedCoachModal) return;
    const coachProfileId = selectedCoachModal.coachProfile?.id;
    if (!coachProfileId) {
      notify.error('Coach profile information is missing. Refresh the directory and try again.');
      return;
    }
    const res = await requestCoach(coachProfileId, coachNotes);
    if (res.success) {
      setRequestSuccess(true);
      setTimeout(() => {
        setSelectedCoachModal(null);
        setRequestSuccess(false);
        navigate('/player/assignment');
      }, 1500);
    } else {
      notify.error(res.message || 'Unable to request this coach.');
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col">
      <Navbar />

      {/* Hero Header (Matches Reference 2 & 3 Screen 5) */}
      <section className="bg-[#0F172A] text-white py-12 px-4 sm:px-6 lg:px-8 border-b border-slate-800 relative overflow-hidden">
        <div className="max-w-5xl mx-auto text-center space-y-3 relative z-10">
          <span className="text-xs font-bold uppercase tracking-wider text-[#00BFA6]">
            Video Review Marketplace
          </span>
          <h1 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight">
            Get Expert Feedback on Your Game
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 max-w-2xl mx-auto leading-relaxed">
            Choose a category, share a YouTube or Google Drive video link, and get professional feedback and personalized drills from BCCI and State accredited coaches.
          </p>

          {/* Search bar (from Reference 2 Screen 5) */}
          <div className="pt-4 max-w-xl mx-auto">
            <div className="relative flex items-center bg-white rounded-2xl shadow-xl p-1.5 border border-slate-200">
              <Search className="w-5 h-5 text-slate-400 ml-3 shrink-0" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search coaches by name, specialization, or location..."
                className="w-full px-3 py-2 text-xs sm:text-sm text-slate-800 placeholder-slate-400 focus:outline-none"
              />
            </div>
          </div>

          {/* Filter Chips (Matches Reference 2 & 3 Screen 5) */}
          <div className="pt-3 flex flex-wrap items-center justify-center gap-2">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all ${
                  selectedCategory === cat
                    ? 'bg-[#00BFA6] text-[#0F172A] shadow-md font-bold'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Main Coaches List */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 flex-1 w-full">
        {/* Active plan status banner if player is ready to pick coach */}
        {activeSubscription && activeSubscription.status === 'pending_coach' && (
          <div className="mb-8 p-4 rounded-2xl bg-emerald-50 border border-emerald-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-[#00BFA6] text-[#0F172A] flex items-center justify-center font-bold shrink-0">
                <CheckCircle className="w-6 h-6" />
              </div>
              <div>
                <h4 className="font-bold text-sm text-slate-900">
                  Select a Coach to Activate Your {activeSubscription.planName}
                </h4>
                <p className="text-xs text-slate-600">
                  Your payment was verified. Choose an accredited coach below to submit your assignment request!
                </p>
              </div>
            </div>
            <span className="px-3 py-1 rounded-full text-xs font-bold bg-[#00BFA6]/20 text-[#0F172A] border border-[#00BFA6]/40">
              1 Selection Credit Available
            </span>
          </div>
        )}

        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-bold text-slate-900">
              Available Coaches ({filteredCoaches.length})
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              Showing approved, available coaches with open capacity.
            </p>
            {refreshError && <p role="alert" className="mt-1 text-xs text-rose-700">{refreshError}</p>}
          </div>
          <button
            type="button"
            onClick={() => void refreshDirectory()}
            disabled={refreshing}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 disabled:opacity-50"
          >
            {refreshing ? 'Refreshing…' : 'Refresh coaches'}
          </button>
        </div>

        {/* Coaches Grid (Matches Reference 2 & 3 Screen 5) */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCoaches.map((coach) => {
            const prof = coach.coachProfile!;
            const isAssigned = activeSubscription?.assignedCoachId === coach.id;

            return (
              <div
                key={coach.id}
                className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-xs hover:shadow-xl transition-all flex flex-col justify-between"
              >
                <div>
                  {/* Card Header with Avatar & Details */}
                  <div className="p-6 border-b border-slate-100 flex items-start gap-4">
                    <img
                      src={coach.avatar}
                      alt={coach.name}
                      className="w-16 h-16 rounded-2xl object-cover border-2 border-[#00BFA6] shrink-0"
                    />
                    <div className="overflow-hidden">
                      <div className="flex items-center gap-1 text-xs text-amber-500">
                        <Star className="w-4 h-4 fill-current" />
                        <span className="font-bold text-slate-800">{prof.rating}</span>
                        <span className="text-slate-400 text-[11px]">({prof.reviewCount} reviews)</span>
                      </div>
                      <h3 className="font-extrabold text-base text-slate-900 mt-0.5 truncate">
                        {coach.name}
                      </h3>
                      <div className="text-xs font-semibold text-[#00BFA6]">
                        {prof.specialization}
                      </div>
                      <div className="flex items-center gap-1 text-[11px] text-slate-400 mt-1">
                        <MapPin className="w-3.5 h-3.5 shrink-0" />
                        <span className="truncate">{coach.location}</span>
                      </div>
                    </div>
                  </div>

                  {/* Body Specs */}
                  <div className="p-6 space-y-4">
                    <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                      {prof.bio}
                    </p>

                    <div className="space-y-1.5 text-xs text-slate-500">
                      <div className="flex items-center justify-between">
                        <span>Coaching Experience:</span>
                        <strong className="text-slate-800">{prof.experienceYears}+ Years</strong>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Assigned Players:</span>
                        <strong className="text-slate-800">{prof.assignedPlayersCount} Active</strong>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Availability:</span>
                        <span className="inline-flex items-center gap-1 text-emerald-600 font-bold">
                          <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                          Accepting Reviews
                        </span>
                      </div>
                    </div>

                    {/* Supported Roles Tags */}
                    <div>
                      <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                        Coaching Focus:
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {prof.supportedRoles.map((role) => (
                          <span
                            key={role}
                            className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-slate-100 text-slate-700 border border-slate-200"
                          >
                            {role}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Footer CTA */}
                <div className="p-6 bg-slate-50 border-t border-slate-100 flex items-center justify-end">
                  {isAssigned ? (
                    <span className="px-4 py-2 rounded-xl bg-emerald-100 text-emerald-800 font-bold text-xs flex items-center gap-1">
                      <CheckCircle className="w-3.5 h-3.5" />
                      <span>Your Coach</span>
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleSelectCoach(coach)}
                      className="px-5 py-2.5 rounded-xl bg-[#00BFA6] hover:bg-[#00D6BA] text-[#0F172A] font-bold text-xs shadow-sm transition-colors"
                    >
                      {activeSubscription ? 'Select Coach' : 'Book Review'}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
        {filteredCoaches.length === 0 && (
          <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-8 text-center">
            <h3 className="font-bold text-slate-900">No coaches are available right now</h3>
            <p className="mt-2 text-sm text-slate-600">
              Coaches appear here after an admin approves them, they enable availability, and they have open capacity.
              Refresh the list after approval.
            </p>
          </div>
        )}

        {/* Request a Video Review 3-Step Banner (Matches bottom of Reference 2 Screen 5) */}
        <section className="mt-14 p-8 rounded-3xl bg-slate-900 text-white border border-slate-800">
          <div className="text-center max-w-xl mx-auto mb-8">
            <span className="text-xs font-bold uppercase tracking-wider text-[#00BFA6]">
              Coaching Workflow
            </span>
            <h3 className="text-xl font-bold text-white mt-1">Request a Video Review</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
            <div className="p-5 rounded-2xl bg-slate-800/60 border border-slate-700/60 flex flex-col items-center">
              <div className="w-10 h-10 rounded-full bg-[#00BFA6] text-[#0F172A] font-extrabold flex items-center justify-center mb-3">
                1
              </div>
              <h4 className="font-bold text-sm text-white mb-1">Choose Coach &amp; Subscribe</h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                Pick your preferred coach after your subscription payment is verified.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-slate-800/60 border border-slate-700/60 flex flex-col items-center">
              <div className="w-10 h-10 rounded-full bg-[#00BFA6] text-[#0F172A] font-extrabold flex items-center justify-center mb-3">
                2
              </div>
              <h4 className="font-bold text-sm text-white mb-1">Share Video Link</h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                Record your net session, match footage, or shadow drills, then share a YouTube or Google Drive link.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-slate-800/60 border border-slate-700/60 flex flex-col items-center">
              <div className="w-10 h-10 rounded-full bg-[#00BFA6] text-[#0F172A] font-extrabold flex items-center justify-center mb-3">
                3
              </div>
              <h4 className="font-bold text-sm text-white mb-1">Get Feedback &amp; Action Plan</h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                Receive frame breakdown, strengths, technical flaws, and daily checklist tasks.
              </p>
            </div>
          </div>
        </section>
      </main>

      {/* Coach Assignment Request Modal */}
      {selectedCoachModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-black/70 backdrop-blur-xs"
            onClick={() => setSelectedCoachModal(null)}
          />

          <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl z-50 overflow-hidden border border-slate-200">
            <div className="px-6 py-4 bg-[#0F172A] text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <UserCheck className="w-5 h-5 text-[#00BFA6]" />
                <span className="font-bold text-sm">Assign Coach to Your Subscription</span>
              </div>
              <button
                onClick={() => setSelectedCoachModal(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="flex items-center gap-4 p-4 rounded-2xl bg-slate-50 border border-slate-200">
                <img
                  src={selectedCoachModal.avatar}
                  alt={selectedCoachModal.name}
                  className="w-14 h-14 rounded-2xl object-cover border-2 border-[#00BFA6]"
                />
                <div>
                  <h4 className="font-extrabold text-base text-slate-900">
                    {selectedCoachModal.name}
                  </h4>
                  <div className="text-xs font-semibold text-[#00BFA6]">
                    {selectedCoachModal.coachProfile?.specialization}
                  </div>
                  <div className="text-xs text-slate-500">
                    {selectedCoachModal.coachProfile?.experienceYears}+ Years Experience &bull; {selectedCoachModal.location}
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Message / Specific Goals for the Coach (Optional):
                </label>
                <textarea
                  rows={3}
                  value={coachNotes}
                  onChange={(e) => setCoachNotes(e.target.value)}
                  placeholder="e.g. Hi Coach, I am struggling with inswing deliveries and front-foot balance. Excited to train with you!"
                  className="w-full p-3 rounded-xl border border-slate-300 text-xs text-slate-800 focus:outline-none focus:border-[#00BFA6]"
                />
              </div>

              <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-emerald-800 text-[11px] leading-relaxed">
                ✓ <strong>Policy Note:</strong> Your coaching duration officially commences as soon as Coach {selectedCoachModal.name} accepts your request. If they are unavailable, you can pick another coach without paying again!
              </div>

              {requestSuccess ? (
                <div className="p-3 bg-emerald-100 rounded-xl text-center text-xs font-bold text-emerald-900">
                  Assignment request submitted! Redirecting to tracker...
                </div>
              ) : (
                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={submitAssignment}
                    className="flex-1 py-3 rounded-xl bg-[#00BFA6] hover:bg-[#00D6BA] text-[#0F172A] font-extrabold text-xs shadow-md transition-colors"
                  >
                    Confirm Coach Request
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedCoachModal(null)}
                    className="px-5 py-3 rounded-xl bg-slate-100 text-slate-700 font-semibold text-xs border border-slate-200"
                  >
                    Cancel
                  </button>
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
