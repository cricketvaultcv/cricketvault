import React, { useEffect, useState } from 'react';
import { DashboardLayout } from '../../components/layout/DashboardLayout';
import { useApp } from '../../context/AppContext';
import { notify } from '../../services/toast';
import { User, Save, CheckCircle2, Award, ShieldCheck, DollarSign } from 'lucide-react';

export const CoachProfileSettingsPage: React.FC = () => {
  const { currentUser, updateCoachProfile } = useApp();
  const prof = currentUser?.coachProfile;

  const [specialization, setSpecialization] = useState(
    prof?.specialization || ''
  );
  const [experienceYears, setExperienceYears] = useState(prof?.experienceYears || 0);
  const [pricePerReview, setPricePerReview] = useState(prof?.pricePerReview || 0);
  const [approach, setApproach] = useState(prof?.approach || '');
  const [bio, setBio] = useState(prof?.bio || '');
  const [isAvailable, setIsAvailable] = useState(prof?.isAvailable ?? true);
  const [savedSuccess, setSavedSuccess] = useState(false);

  useEffect(() => {
    if (!prof) return;
    setSpecialization(prof.specialization);
    setExperienceYears(prof.experienceYears);
    setPricePerReview(prof.pricePerReview);
    setApproach(prof.approach);
    setBio(prof.bio);
    setIsAvailable(prof.isAvailable);
  }, [prof]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await updateCoachProfile({
      specialization,
      experienceYears,
      pricePerReview,
      approach,
      bio,
      isAvailable,
      });
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 2500);
    } catch (error) {
      notify.error(error instanceof Error ? error.message : 'Unable to save coach profile.');
    }
  };

  return (
    <DashboardLayout role="coach">
      <div className="max-w-3xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900">Coach Profile &amp; Availability</h1>
          <p className="text-xs text-slate-500 mt-1">
            Configure your coaching specialties, review pricing, and acceptance availability.
          </p>
        </div>

        {savedSuccess && (
          <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <span>Profile and marketplace settings updated successfully!</span>
          </div>
        )}

        <form onSubmit={handleSave} className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-xs space-y-6">
          <div className="flex items-center gap-4 pb-6 border-b border-slate-100">
            <img
              src={currentUser?.avatar}
              alt={currentUser?.name}
              className="w-16 h-16 rounded-2xl object-cover border-2 border-[#00BFA6]"
            />
            <div>
              <h2 className="text-lg font-bold text-slate-900">{currentUser?.name}</h2>
              <p className="text-xs text-slate-500">{currentUser?.email}</p>
              <div className="text-[11px] text-[#00BFA6] font-semibold mt-0.5">
                BCCI Level-2 Certified Coach
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Specialization</label>
              <input
                type="text"
                value={specialization}
                onChange={(e) => setSpecialization(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs font-medium focus:outline-none focus:border-[#00BFA6]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Experience (Years)
              </label>
              <input
                type="number"
                value={experienceYears}
                onChange={(e) => setExperienceYears(Number(e.target.value))}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs font-medium focus:outline-none focus:border-[#00BFA6]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Standard Review Rate (₹ INR)
              </label>
              <input
                type="number"
                value={pricePerReview}
                onChange={(e) => setPricePerReview(Number(e.target.value))}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs font-medium focus:outline-none focus:border-[#00BFA6]"
              />
            </div>

            <div className="flex flex-col justify-center">
              <label className="text-xs font-bold text-slate-700 mb-1">
                Accepting New Trainees
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="availCheck"
                  checked={isAvailable}
                  onChange={(e) => setIsAvailable(e.target.checked)}
                  className="w-4 h-4 accent-[#00BFA6]"
                />
                <label htmlFor="availCheck" className="text-xs text-slate-600 cursor-pointer">
                  {isAvailable ? 'Available for new review requests' : 'Temporarily paused'}
                </label>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Coaching Bio</label>
            <textarea
              rows={3}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              className="w-full p-3 rounded-xl border border-slate-300 text-xs font-medium focus:outline-none focus:border-[#00BFA6]"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Coaching Approach &amp; Philosophy
            </label>
            <textarea
              rows={3}
              value={approach}
              onChange={(e) => setApproach(e.target.value)}
              className="w-full p-3 rounded-xl border border-slate-300 text-xs font-medium focus:outline-none focus:border-[#00BFA6]"
            />
          </div>

          <div className="pt-4 border-t border-slate-100 flex justify-end">
            <button
              type="submit"
              className="px-6 py-2.5 rounded-xl bg-[#00BFA6] hover:bg-[#00D6BA] text-[#0F172A] font-extrabold text-xs shadow-md transition-colors"
            >
              Save Profile Settings
            </button>
          </div>
        </form>
      </div>
    </DashboardLayout>
  );
};
