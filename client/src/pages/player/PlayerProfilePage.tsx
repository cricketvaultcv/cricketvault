import React, { useEffect, useState } from 'react';
import { DashboardLayout } from '../../components/layout/DashboardLayout';
import { useApp } from '../../context/AppContext';
import { notify } from '../../services/toast';
import { CricketProfile } from '../../types';
import {
  User,
  Shield,
  Save,
  CheckCircle2,
  Award,
  Sparkles,
  Target,
  Plus,
  X,
  Camera,
} from 'lucide-react';

export const PlayerProfilePage: React.FC = () => {
  const { currentUser, updatePlayerProfile } = useApp();
  const profile = currentUser?.cricketProfile;

  const [playingRole, setPlayingRole] = useState<CricketProfile['playingRole']>(
    profile?.playingRole || 'Batter'
  );
  const [battingStyle, setBattingStyle] = useState<CricketProfile['battingStyle']>(
    profile?.battingStyle || 'Right-hand bat'
  );
  const [bowlingStyle, setBowlingStyle] = useState<CricketProfile['bowlingStyle']>(
    profile?.bowlingStyle || 'None'
  );
  const [ageGroup, setAgeGroup] = useState<CricketProfile['ageGroup']>(
    profile?.ageGroup || 'Open'
  );
  const [experience, setExperience] = useState<CricketProfile['experience']>(
    profile?.experience || 'Beginner'
  );
  const [location, setLocation] = useState(profile?.location || '');
  const [availability, setAvailability] = useState(profile?.availability || '');
  const [goals, setGoals] = useState<string[]>(
    profile?.trainingGoals || []
  );
  const [newGoalInput, setNewGoalInput] = useState('');
  const [saveSuccess, setSaveSuccess] = useState(false);

  const completionPercentage = profile?.profileCompletion || 0;

  useEffect(() => {
    if (!profile) return;
    setPlayingRole(profile.playingRole);
    setBattingStyle(profile.battingStyle);
    setBowlingStyle(profile.bowlingStyle);
    setAgeGroup(profile.ageGroup);
    setExperience(profile.experience);
    setLocation(profile.location);
    setAvailability(profile.availability);
    setGoals(profile.trainingGoals);
  }, [profile]);

  const handleAddGoal = (e: React.FormEvent) => {
    e.preventDefault();
    if (newGoalInput.trim() && !goals.includes(newGoalInput.trim())) {
      setGoals([...goals, newGoalInput.trim()]);
      setNewGoalInput('');
    }
  };

  const handleRemoveGoal = (index: number) => {
    setGoals(goals.filter((_, i) => i !== index));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await updatePlayerProfile({
      playingRole,
      battingStyle,
      bowlingStyle,
      ageGroup,
      experience,
      location,
      availability,
      trainingGoals: goals,
      });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (error) {
      notify.error(error instanceof Error ? error.message : 'Unable to save player profile.');
    }
  };

  return (
    <DashboardLayout role="player">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-extrabold text-slate-900">My Cricket Profile</h1>
            <p className="text-xs text-slate-500 mt-1">
              Your profile information helps coaches personalize frame reviews and net drills.
            </p>
          </div>

          {/* Profile Completion Indicator (Required by prompt) */}
          <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#00BFA6]/10 text-[#00BFA6] font-extrabold text-xs flex items-center justify-center">
              {completionPercentage}%
            </div>
            <div>
              <div className="text-xs font-bold text-slate-800">Profile Completion</div>
              <div className="w-32 bg-slate-100 h-1.5 rounded-full overflow-hidden mt-1">
                <div
                  className="bg-[#00BFA6] h-full rounded-full transition-all duration-500"
                  style={{ width: `${completionPercentage}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {saveSuccess && (
          <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <span>Profile successfully updated! Coaches will see your revised technical specifications.</span>
          </div>
        )}

        {/* Profile Card Form */}
        <form onSubmit={handleSave} className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-xs space-y-6">
          {/* Avatar & Basic Details */}
          <div className="flex items-center gap-4 pb-6 border-b border-slate-100">
            <div className="relative group">
              <img
                src={currentUser?.avatar}
                alt={currentUser?.name}
                className="w-20 h-20 rounded-2xl object-cover border-2 border-[#00BFA6] shadow-sm"
              />
              <button
                type="button"
                onClick={() => notify.info('Profile photo uploads are not configured yet.')}
                className="absolute inset-0 bg-black/40 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white"
                title="Change Photo Preview"
              >
                <Camera className="w-5 h-5" />
              </button>
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">{currentUser?.name}</h2>
              <p className="text-xs text-slate-500">{currentUser?.email}</p>
              <div className="mt-1 text-[11px] text-[#00BFA6] font-semibold flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Player Profile</span>
              </div>
            </div>
          </div>

          {/* Cricket Specifications Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {/* Playing Role */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Primary Playing Role
              </label>
              <select
                value={playingRole}
                onChange={(e) => setPlayingRole(e.target.value as any)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs font-medium text-slate-800 focus:outline-none focus:border-[#00BFA6]"
              >
                <option value="Batter">Batter</option>
                <option value="Bowler">Bowler (Fast / Spin)</option>
                <option value="All-Rounder">All-Rounder</option>
                <option value="Wicketkeeper">Wicketkeeper</option>
              </select>
            </div>

            {/* Batting Style */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Batting Stance / Style
              </label>
              <select
                value={battingStyle}
                onChange={(e) => setBattingStyle(e.target.value as any)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs font-medium text-slate-800 focus:outline-none focus:border-[#00BFA6]"
              >
                <option value="Right-hand bat">Right-hand bat</option>
                <option value="Left-hand bat">Left-hand bat</option>
              </select>
            </div>

            {/* Bowling Style */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Bowling Delivery Style
              </label>
              <select
                value={bowlingStyle}
                onChange={(e) => setBowlingStyle(e.target.value as any)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs font-medium text-slate-800 focus:outline-none focus:border-[#00BFA6]"
              >
                <option value="Right-arm fast">Right-arm fast</option>
                <option value="Right-arm medium">Right-arm medium / seam</option>
                <option value="Left-arm fast">Left-arm fast</option>
                <option value="Right-arm off spin">Right-arm off spin</option>
                <option value="Left-arm orthodox">Left-arm orthodox spin</option>
                <option value="Leg break">Leg break / Googly</option>
                <option value="None">None (Pure Batter / Keeper)</option>
              </select>
            </div>

            {/* Age Group */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Competitive Age Category
              </label>
              <select
                value={ageGroup}
                onChange={(e) => setAgeGroup(e.target.value as any)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs font-medium text-slate-800 focus:outline-none focus:border-[#00BFA6]"
              >
                <option value="Under 14">Under 14</option>
                <option value="Under 16">Under 16</option>
                <option value="Under 19">Under 19</option>
                <option value="Senior">Senior (Club / Corporate)</option>
                <option value="Open">Open Category</option>
              </select>
            </div>

            {/* Experience Level */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Current Cricket Experience
              </label>
              <select
                value={experience}
                onChange={(e) => setExperience(e.target.value as any)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs font-medium text-slate-800 focus:outline-none focus:border-[#00BFA6]"
              >
                <option value="Beginner">Beginner (Street / School)</option>
                <option value="Intermediate">Intermediate (Local Club / Academy)</option>
                <option value="District">District Tournament Representation</option>
                <option value="State / Academy">State Trials / High-Performance Academy</option>
              </select>
            </div>

            {/* Location */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Location (District &amp; State)
              </label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="e.g. Hyderabad, Telangana"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs font-medium text-slate-800 focus:outline-none focus:border-[#00BFA6]"
              />
            </div>
          </div>

          {/* Training Availability */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Practice Availability
            </label>
            <input
              type="text"
              value={availability}
              onChange={(e) => setAvailability(e.target.value)}
              placeholder="e.g. Daily mornings 6am - 8am, Weekends full day"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs font-medium text-slate-800 focus:outline-none focus:border-[#00BFA6]"
            />
          </div>

          {/* Training Goals Tag List */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Preferred Training Goals &amp; Weaknesses to Fix
            </label>
            <div className="flex flex-wrap gap-2 mb-3">
              {goals.map((goal, idx) => (
                <span
                  key={idx}
                  className="px-3 py-1.5 rounded-xl bg-slate-100 text-slate-800 text-xs font-medium flex items-center gap-1.5 border border-slate-200"
                >
                  <Target className="w-3.5 h-3.5 text-[#00BFA6]" />
                  <span>{goal}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveGoal(idx)}
                    className="p-0.5 hover:text-rose-500 rounded-full"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>

            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="text"
                value={newGoalInput}
                onChange={(e) => setNewGoalInput(e.target.value)}
                placeholder="Add goal (e.g. Better back-foot defense against express pace)"
                className="flex-1 px-3.5 py-2 rounded-xl border border-slate-300 text-xs font-medium focus:outline-none focus:border-[#00BFA6]"
              />
              <button
                type="button"
                onClick={handleAddGoal}
                className="self-end sm:self-auto px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold flex items-center gap-1"
              >
                <Plus className="w-4 h-4" />
                <span>Add Goal</span>
              </button>
            </div>
          </div>

          {/* Save Button */}
          <div className="pt-4 border-t border-slate-100 flex justify-end">
            <button
              type="submit"
              className="px-6 py-3 rounded-xl bg-[#00BFA6] hover:bg-[#00D6BA] text-[#0F172A] font-extrabold text-xs shadow-md flex items-center gap-2 transition-colors"
            >
              <Save className="w-4 h-4" />
              <span>Save &amp; Update Profile</span>
            </button>
          </div>
        </form>
      </div>
    </DashboardLayout>
  );
};
