import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Navbar } from '../../components/layout/Navbar';
import { Footer } from '../../components/layout/Footer';
import { useApp } from '../../context/AppContext';
import {
  Video,
  Users,
  BookOpen,
  Target,
  ArrowRight,
  CheckCircle2,
  ChevronDown,
  Award,
  Sparkles,
  ShieldCheck,
  TrendingUp,
  X,
} from 'lucide-react';

export const LandingPage: React.FC = () => {
  const { currentUser, resources } = useApp();
  const navigate = useNavigate();
  const [activeFaq, setActiveFaq] = useState<number | null>(null);
  const [showIntroPopup, setShowIntroPopup] = useState(false);

  const featuredResources = resources.slice(0, 4);

  useEffect(() => {
    const timer = window.setTimeout(() => setShowIntroPopup(true), 1000);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!showIntroPopup) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setShowIntroPopup(false);
    };
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [showIntroPopup]);

  const faqs = [
    {
      q: 'How does video coaching on CricketVault work?',
      a: 'Record your batting stance, bowling action, or fielding drills using your smartphone camera, then share a YouTube or Google Drive link. Your assigned BCCI/State-certified coach breaks down your technique frame-by-frame, providing technical observations, recommended drills, and action-plan tasks with clear milestones.',
    },
    {
      q: 'Is this suitable for cricketers without an academy or grass pitch?',
      a: 'Yes, CricketVault was purposefully built for village, small-town, and self-coached cricketers. Our coaches provide tailored drills you can practice on open ground, against a wall, in a courtyard, or with a hanging tennis ball at home.',
    },
    {
      q: 'How does coach assignment work after I purchase a plan?',
      a: 'Once you select a review or development plan and complete payment, you can browse all accredited coaches and submit an assignment request. When the coach accepts your request, your coaching duration begins. If a coach is at capacity, your full subscription entitlement is preserved so you can pick another coach without paying again.',
    },
    {
      q: 'How are payments handled?',
      a: 'Payments use Razorpay Checkout when gateway credentials are configured. Local development without Razorpay credentials uses a development-only payment confirmation.',
    },
  ];

  const handlePlayerCTA = () => {
    navigate('/login?tab=signup');
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col">
      <Navbar />

      {showIntroPopup && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/75 p-4 backdrop-blur-sm"
          onClick={() => setShowIntroPopup(false)}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="intro-popup-title"
            className="relative w-full max-w-2xl overflow-hidden rounded-3xl border border-slate-700 bg-[#0F172A] text-white shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setShowIntroPopup(false)}
              aria-label="Close introduction"
              className="absolute right-3 top-3 z-10 rounded-full bg-slate-900/80 p-2 text-slate-300 transition-colors hover:bg-slate-800 hover:text-white"
            >
              <X className="h-5 w-5" />
            </button>
            <div className="flex aspect-video flex-col items-center justify-center gap-3 bg-slate-900 px-6 text-center">
              <Video className="h-12 w-12 text-[#00BFA6]" />
              <h2 id="intro-popup-title" className="text-xl font-extrabold sm:text-2xl">
                Welcome to CricketVault
              </h2>
              <p className="max-w-md text-sm text-slate-400">
                Our introduction video will be available here soon.
              </p>
            </div>
            <div className="flex justify-end border-t border-slate-800 px-5 py-4">
              <button
                type="button"
                onClick={() => setShowIntroPopup(false)}
                className="rounded-xl bg-[#00BFA6] px-5 py-2.5 text-sm font-bold text-[#0F172A] transition-colors hover:bg-[#00D6BA]"
              >
                Continue to site
              </button>
            </div>
          </section>
        </div>
      )}

      {/* Hero Section (Recreates Reference 1 & 2 Home Page Hero) */}
      <section className="relative bg-[#0F172A] text-white overflow-hidden py-16 sm:py-24 border-b border-slate-800">
        {/* Subtle background glow */}
        <div className="absolute top-0 right-0 -mr-20 -mt-20 w-96 h-96 rounded-full bg-[#00BFA6]/10 blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-80 h-80 rounded-full bg-emerald-600/10 blur-3xl pointer-events-none" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            {/* Left Column: Value Prop */}
            <div className="lg:col-span-7 space-y-6">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#00BFA6]/15 border border-[#00BFA6]/30 text-[#00BFA6] text-xs font-semibold uppercase tracking-wider">
                <Sparkles className="w-3.5 h-3.5" />
                <span>For Every Dreaming Cricketer</span>
              </div>

              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-white leading-tight">
                Your Cricket Journey.{' '}
                <span className="text-[#00BFA6] underline decoration-[#00BFA6]/40 underline-offset-8">
                  Better Guided.
                </span>
              </h1>

              <p className="text-base sm:text-lg text-slate-300 max-w-2xl leading-relaxed">
                Get expert coaching, video feedback and practical resources to improve your game. Built specifically for village and small-town cricketers striving for district and state selection.
              </p>

              {/* CTAs */}
              <div className="flex flex-wrap items-center gap-4 pt-2">
                {!currentUser && (
                  <button
                    onClick={handlePlayerCTA}
                    className="px-6 py-3.5 rounded-xl bg-[#00BFA6] hover:bg-[#00D6BA] text-[#0F172A] font-bold text-sm flex items-center gap-2.5 shadow-lg shadow-[#00BFA6]/20 transition-all transform hover:-translate-y-0.5"
                  >
                    <span>Join as a Player</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                )}

                <Link
                  to="/resources"
                  className="px-4 py-3.5 text-sm font-semibold text-slate-300 hover:text-[#00BFA6] flex items-center gap-1.5 transition-colors"
                >
                  <span>Explore Resources</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>

              {/* Trust metric badges */}
              <div className="pt-6 border-t border-slate-800/80 flex items-center gap-6 text-xs text-slate-400">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#00BFA6]" />
                  <span>BCCI & State Certified Mentors</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#00BFA6]" />
                  <span>Frame-by-Frame Video Reviews</span>
                </div>
              </div>
            </div>

            {/* Right Column: Hero Visual with Cricketer */}
            <div className="lg:col-span-5 relative">
              <div className="relative mx-auto max-w-md lg:max-w-none">
                {/* Decorative border card */}
                <div className="relative rounded-3xl overflow-hidden shadow-2xl border border-slate-700 bg-slate-800/80 aspect-[4/5] group">
                  <img
                    src="https://images.unsplash.com/photo-1540747913346-19e32dc3e97e?w=800&auto=format&fit=crop&q=80"
                    alt="Cricket Player in Whites Batting"
                    className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#0F172A] via-transparent to-transparent opacity-80" />

                  {/* Floating badge (from reference: "Small Town Big Dreams") */}
                  <div className="absolute top-6 right-6 px-3.5 py-1.5 rounded-full bg-slate-900/90 backdrop-blur-md border border-[#00BFA6]/40 text-xs font-bold text-[#00BFA6] shadow-lg flex items-center gap-1.5">
                    <Award className="w-3.5 h-3.5" />
                    <span>Small Town, Big Dreams</span>
                  </div>

                  {/* Bottom overlay card */}
                  <div className="absolute bottom-6 left-6 right-6 p-4 rounded-2xl bg-slate-900/90 backdrop-blur-md border border-slate-700/80 text-white">
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="font-semibold text-slate-300">Sample Coach Feedback</span>
                      <span className="text-[#00BFA6] font-bold">Technique Review</span>
                    </div>
                    <div className="font-bold text-sm text-white">Batting: Front Foot Drive &amp; Weight Transfer</div>
                    <div className="flex items-center gap-1 text-[11px] text-[#00BFA6] mt-2">
                      <ShieldCheck className="w-3.5 h-3.5" />
                      <span className="text-slate-400 ml-1.5 text-[10px]">Illustrative example</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Feature 4-Grid (Matches Reference 1 & 2 screen 1) */}
      <section className="py-14 bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Feature 1 */}
            <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200/80 hover:border-[#00BFA6]/40 hover:shadow-md transition-all">
              <div className="w-12 h-12 rounded-xl bg-emerald-50 text-[#00BFA6] border border-emerald-100 flex items-center justify-center mb-4">
                <Video className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-base text-slate-900 mb-1.5">Coach Feedback</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Get expert reviews on your videos. Receive clear frame annotations, strengths, and targeted improvement notes.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200/80 hover:border-[#00BFA6]/40 hover:shadow-md transition-all">
              <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 border border-blue-100 flex items-center justify-center mb-4">
                <Users className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-base text-slate-900 mb-1.5">Player Community</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Connect with ambitious cricketers across different districts. Learn from each other's journeys and grow together.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200/80 hover:border-[#00BFA6]/40 hover:shadow-md transition-all">
              <div className="w-12 h-12 rounded-xl bg-teal-50 text-teal-600 border border-teal-100 flex items-center justify-center mb-4">
                <BookOpen className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-base text-slate-900 mb-1.5">Cricket Resources</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Access structured e-books, drill cards, and training guides designed specifically for subcontinental conditions.
              </p>
            </div>

            {/* Feature 4 */}
            <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200/80 hover:border-[#00BFA6]/40 hover:shadow-md transition-all">
              <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 border border-amber-100 flex items-center justify-center mb-4">
                <Target className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-base text-slate-900 mb-1.5">Training Guidance</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Structured action plans with daily tasks and checklists. Turn coach advice into habitual muscle memory.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Callout Banner: "Join the CricketVault Community" (Matches Reference 1 & 2) */}
      <section className="py-12 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="rounded-3xl bg-gradient-to-r from-[#0F172A] to-[#0A292A] text-white p-8 sm:p-12 relative overflow-hidden border border-slate-800 shadow-xl flex flex-col md:flex-row items-center justify-between gap-8">
            <div className="space-y-3 max-w-xl text-center md:text-left z-10">
              <h2 className="text-2xl sm:text-3xl font-extrabold text-white">
                Join the CricketVault Community
              </h2>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                Be part of a growing network of cricketers, accredited mentors, and academy coaches across India. Start with structured drills today.
              </p>
            </div>

            <div className="z-10 flex flex-wrap gap-3">
              {!currentUser && (
                <button
                  onClick={handlePlayerCTA}
                  className="px-6 py-3 rounded-xl bg-[#00BFA6] hover:bg-[#00D6BA] text-[#0F172A] font-bold text-sm shadow-md transition-all"
                >
                  Get Started &rarr;
                </button>
              )}
              <Link
                to="/pricing"
                className="px-5 py-3 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-white font-semibold text-sm border border-slate-700 transition-colors"
              >
                View Plans
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Resources (Matches Reference 1 & 2 screen 1 bottom section) */}
      <section className="py-14 bg-[#F8FAFC] border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between mb-8">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-[#00BFA6]">Practice Materials</span>
              <h2 className="text-2xl font-extrabold text-slate-900">Featured Resources</h2>
            </div>
            <Link
              to="/resources"
              className="text-xs font-bold text-[#00BFA6] hover:text-[#00A690] flex items-center gap-1"
            >
              <span>View All &rarr;</span>
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {featuredResources.map((res) => (
              <div
                key={res.id}
                className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs hover:shadow-md transition-all flex flex-col group"
              >
                <div className="relative h-44 overflow-hidden bg-slate-100">
                  <img
                    src={res.coverImage}
                    alt={res.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute top-3 left-3">
                    <span className="px-2.5 py-1 rounded-md text-[11px] font-bold bg-slate-900/80 backdrop-blur-xs text-white">
                      {res.category}
                    </span>
                  </div>
                  <div className="absolute top-3 right-3">
                    <span
                      className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                        res.isFree
                          ? 'bg-emerald-500 text-white'
                          : 'bg-[#00BFA6] text-[#0F172A]'
                      }`}
                    >
                      {res.isFree ? 'Free' : `₹${res.price}`}
                    </span>
                  </div>
                </div>

                <div className="p-4 flex-1 flex flex-col justify-between">
                  <div>
                    <h3 className="font-bold text-sm text-slate-900 line-clamp-1 group-hover:text-[#00BFA6] transition-colors">
                      {res.title}
                    </h3>
                    <p className="text-[11px] text-slate-500 mt-1 line-clamp-2">
                      {res.description}
                    </p>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                    <span className="text-[11px] text-slate-500 font-medium">{res.level}</span>
                    <Link
                      to={`/resources/${res.id}`}
                      className="font-bold text-[#00BFA6] hover:underline"
                    >
                      View Details &rarr;
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Coaching features */}
      <section className="py-14 bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-xl mx-auto mb-10">
            <span className="text-xs font-bold uppercase tracking-wider text-[#00BFA6]">Built for Your Game</span>
            <h2 className="text-2xl font-extrabold text-slate-900 mt-1">A Clearer Path to Better Cricket</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200">
              <div className="flex items-center gap-2 text-[#00BFA6] mb-3">
                <Video className="w-4 h-4" />
                <span className="text-xs font-bold">Video feedback</span>
              </div>
              <p className="text-xs text-slate-700 italic leading-relaxed">
                Share a video link and get focused observations from a coach, wherever you practice.
              </p>
              <div className="mt-4 pt-3 border-t border-slate-200 flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-[#00BFA6] text-[#0F172A] font-bold text-xs flex items-center justify-center">
                  <Video className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-900">Technique review</div>
                  <div className="text-[10px] text-slate-500">Coach-led observations</div>
                </div>
              </div>
            </div>

            <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200">
              <div className="flex items-center gap-2 text-[#00BFA6] mb-3">
                <Target className="w-4 h-4" />
                <span className="text-xs font-bold">Action plans</span>
              </div>
              <p className="text-xs text-slate-700 italic leading-relaxed">
                Turn coaching feedback into practical tasks and track your completed work over time.
              </p>
              <div className="mt-4 pt-3 border-t border-slate-200 flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-[#00BFA6] text-[#0F172A] font-bold text-xs flex items-center justify-center">
                  <Target className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-900">Personalized practice</div>
                  <div className="text-[10px] text-slate-500">Progress at your pace</div>
                </div>
              </div>
            </div>

            <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200">
              <div className="flex items-center gap-2 text-[#00BFA6] mb-3">
                <BookOpen className="w-4 h-4" />
                <span className="text-xs font-bold">Practice resources</span>
              </div>
              <p className="text-xs text-slate-700 italic leading-relaxed">
                Explore training materials designed to help you keep learning between coaching sessions.
              </p>
              <div className="mt-4 pt-3 border-t border-slate-200 flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-[#00BFA6] text-[#0F172A] font-bold text-xs flex items-center justify-center">
                  <BookOpen className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-900">Learning library</div>
                  <div className="text-[10px] text-slate-500">Resources for every stage</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-14 bg-[#F8FAFC]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-8">
            <span className="text-xs font-bold uppercase tracking-wider text-[#00BFA6]">Got Questions?</span>
            <h2 className="text-2xl font-extrabold text-slate-900 mt-1">Frequently Asked Questions</h2>
          </div>

          <div className="space-y-3">
            {faqs.map((faq, idx) => {
              const isOpen = activeFaq === idx;
              return (
                <div
                  key={idx}
                  className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs"
                >
                  <button
                    onClick={() => setActiveFaq(isOpen ? null : idx)}
                    className="w-full p-4 text-left flex items-center justify-between text-xs sm:text-sm font-bold text-slate-900 hover:text-[#00BFA6] transition-colors"
                  >
                    <span>{faq.q}</span>
                    <ChevronDown
                      className={`w-4 h-4 text-slate-400 transition-transform ${
                        isOpen ? 'rotate-180 text-[#00BFA6]' : ''
                      }`}
                    />
                  </button>
                  {isOpen && (
                    <div className="px-4 pb-4 text-xs text-slate-600 leading-relaxed border-t border-slate-100 pt-3">
                      {faq.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};
