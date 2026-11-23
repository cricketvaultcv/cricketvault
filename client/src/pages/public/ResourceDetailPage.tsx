import React, { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Navbar } from '../../components/layout/Navbar';
import { Footer } from '../../components/layout/Footer';
import { useApp } from '../../context/AppContext';
import { notify } from '../../services/toast';
import {
  ArrowLeft,
  Star,
  CheckCircle2,
  BookOpen,
  ShieldCheck,
  Award,
  X,
  FileText,
} from 'lucide-react';

export const ResourceDetailPage: React.FC = () => {
  const { resourceId } = useParams<{ resourceId: string }>();
  const { resources, purchasedResourceIds, purchaseResource, currentUser } = useApp();
  const navigate = useNavigate();
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [purchasedSuccess, setPurchasedSuccess] = useState(false);

  const resource = resources.find((r) => r.id === resourceId);
  if (!resource) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex flex-col">
        <Navbar />
        <main className="max-w-4xl mx-auto px-4 py-12 flex-1 w-full text-center">
          <p className="text-sm text-slate-600">This resource is unavailable.</p>
          <Link to="/resources" className="inline-block mt-4 text-sm font-bold text-[#00BFA6]">
            Browse resources
          </Link>
        </main>
        <Footer />
      </div>
    );
  }
  const isPurchased = purchasedResourceIds.includes(resource.id);

  const handleBuy = async () => {
    if (!currentUser) {
      navigate('/login?redirect=/resources/' + resource.id);
      return;
    }
    try {
      await purchaseResource(resource.id);
      setPurchasedSuccess(true);
    } catch (error) {
      notify.error(error instanceof Error ? error.message : 'Unable to add this resource to your library.');
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col">
      <Navbar />

      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8 flex-1 w-full">
        {/* Back Link */}
        <Link
          to="/resources"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-[#00BFA6] mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Resources</span>
        </Link>

        {/* E-book detail card (Matches Reference 3 screen 9) */}
        <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm">
          {/* Cover Hero Banner */}
          <div className="relative h-64 sm:h-80 bg-slate-900 overflow-hidden">
            <img
              src={resource.coverImage}
              alt={resource.title}
              className="w-full h-full object-cover opacity-80"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />

            {/* Demo badge top-right */}
            <div className="absolute top-4 right-4">
              <span className="px-3 py-1 rounded-full text-xs font-extrabold bg-[#00BFA6] text-[#0F172A] shadow-md">
                Training Resource
              </span>
            </div>

            {/* Title overlay in image (like reference screen 9) */}
            <div className="absolute bottom-6 left-6 right-6">
              <span className="inline-block px-2.5 py-1 rounded-md text-[11px] font-bold bg-[#00BFA6]/90 text-[#0F172A] uppercase tracking-wider mb-2">
                {resource.category}
              </span>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-white leading-tight">
                {resource.title}
              </h1>
            </div>
          </div>

          {/* Pricing, Meta & Content */}
          <div className="p-6 sm:p-8 space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4 pb-6 border-b border-slate-100">
              <div>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-extrabold text-slate-900">
                    {resource.isFree ? 'Free' : `₹${resource.price}`}
                  </span>
                  {!resource.isFree && (
                    <span className="text-sm text-slate-400 line-through">₹{resource.price * 2}</span>
                  )}
                </div>
                <div className="flex items-center gap-1.5 text-xs text-amber-500 mt-1">
                  <Star className="w-4 h-4 fill-current" />
                  <span className="font-bold text-slate-800">{resource.rating}</span>
                  <span className="text-slate-500">({resource.reviewsCount} verified player ratings)</span>
                </div>
              </div>

              {/* Tags list */}
              <div className="flex flex-wrap gap-2">
                <span className="px-3 py-1 rounded-lg text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  {resource.level}
                </span>
                <span className="px-3 py-1 rounded-lg text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                  {resource.category}
                </span>
                <span className="px-3 py-1 rounded-lg text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                  Digital E-book + Drill Cards
                </span>
              </div>
            </div>

            {/* Description */}
            <div>
              <h3 className="text-sm font-bold text-slate-900 mb-2">Overview</h3>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                {resource.description} Written and reviewed by accredited BCCI coaches for ambitious cricketers who practice independently without expensive infrastructure.
              </p>
            </div>

            {/* What's Inside Checklist (Matches screen 9 in reference 3) */}
            <div className="bg-slate-50 rounded-2xl p-6 border border-slate-200">
              <h3 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-[#00BFA6]" />
                <span>What's Inside</span>
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {resource.whatInside.map((item, idx) => (
                  <div key={idx} className="flex items-start gap-2.5 text-xs text-slate-700">
                    <CheckCircle2 className="w-4 h-4 text-[#00BFA6] shrink-0 mt-0.5" />
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Author card */}
            <div className="flex items-center gap-3 p-4 rounded-xl bg-white border border-slate-200">
              <div className="w-10 h-10 rounded-full bg-[#0F172A] text-[#00BFA6] font-bold text-xs flex items-center justify-center">
                <Award className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xs font-bold text-slate-900">{resource.author}</div>
                <div className="text-[11px] text-slate-500">Resource author</div>
              </div>
            </div>

            {/* Purchase / Open Action Buttons */}
            {purchasedSuccess ? (
              <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-center space-y-2">
                <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto" />
                <h4 className="font-bold text-sm text-emerald-900">Added to your Library!</h4>
                <p className="text-xs text-emerald-700">
                  You can access this resource from your library.
                </p>
                <button
                  onClick={() => setShowPreviewModal(true)}
                  className="px-6 py-2.5 rounded-xl bg-[#00BFA6] text-[#0F172A] font-bold text-xs"
                >
                  Read Resource
                </button>
              </div>
            ) : (
              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                {isPurchased ? (
                  <button
                    onClick={() => setShowPreviewModal(true)}
                    className="flex-1 py-3 px-6 rounded-xl bg-[#00BFA6] hover:bg-[#00D6BA] text-[#0F172A] font-bold text-xs flex items-center justify-center gap-2 shadow-md transition-colors"
                  >
                    <BookOpen className="w-4 h-4" />
                    <span>Read Now (Purchased)</span>
                  </button>
                ) : (
                  <button
                    onClick={handleBuy}
                    className="flex-1 py-3 px-6 rounded-xl bg-[#00BFA6] hover:bg-[#00D6BA] text-[#0F172A] font-bold text-xs flex items-center justify-center gap-2 shadow-md transition-colors"
                  >
                    <span>{resource.isFree ? 'Add to Library (Free)' : `Buy Now for ₹${resource.price}`}</span>
                  </button>
                )}

                <button
                  onClick={() => setShowPreviewModal(true)}
                  className="py-3 px-6 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold text-xs border border-slate-300 transition-colors"
                >
                  Preview Sample Pages
                </button>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Reader & Preview Modal */}
      {showPreviewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-black/70 backdrop-blur-xs"
            onClick={() => setShowPreviewModal(false)}
          />
          <div className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl z-50 overflow-hidden flex flex-col max-h-[85vh]">
            <div className="px-6 py-4 bg-[#0F172A] text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-[#00BFA6]" />
                <span className="font-bold text-sm truncate">{resource.title}</span>
              </div>
              <button
                onClick={() => setShowPreviewModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4 text-xs text-slate-700 leading-relaxed font-sans">
              <p>{resource.description}</p>
              {resource.whatInside.length > 0 && (
                <ul className="list-disc pl-5 space-y-2">
                  {resource.whatInside.map((item) => <li key={item}>{item}</li>)}
                </ul>
              )}
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs">
              <span className="text-slate-500">{resource.author}</span>
              <button
                onClick={() => setShowPreviewModal(false)}
                className="px-4 py-2 rounded-xl bg-[#00BFA6] text-[#0F172A] font-bold flex items-center gap-1.5"
              >
                <span>Close Preview</span>
              </button>
            </div>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
};
