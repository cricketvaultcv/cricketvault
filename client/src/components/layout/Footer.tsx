import React from 'react';
import { Link } from 'react-router-dom';
import { Logo } from '../common/Logo';
import { ShieldCheck, Video, CreditCard, Smartphone, Users, Award } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="bg-[#0F172A] text-slate-300 border-t border-slate-800">
      {/* Feature Badges Bar (Matches bottom banner of Reference 1 & 2) */}
      <div className="border-b border-slate-800/80 bg-slate-900/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-center sm:text-left">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#00BFA6]/10 text-[#00BFA6] flex items-center justify-center shrink-0">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xs font-bold text-white">Secure Login</div>
                <div className="text-[11px] text-slate-400">Your data is protected</div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#00BFA6]/10 text-[#00BFA6] flex items-center justify-center shrink-0">
                <Video className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xs font-bold text-white">Private Video Storage</div>
                <div className="text-[11px] text-slate-400">Only authorized access</div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#00BFA6]/10 text-[#00BFA6] flex items-center justify-center shrink-0">
                <CreditCard className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xs font-bold text-white">Razorpay Integration</div>
                <div className="text-[11px] text-slate-400">UPI, Cards, Net Banking</div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#00BFA6]/10 text-[#00BFA6] flex items-center justify-center shrink-0">
                <Smartphone className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xs font-bold text-white">Mobile Responsive</div>
                <div className="text-[11px] text-slate-400">Learn on any device</div>
              </div>
            </div>

            <div className="flex items-center gap-3 col-span-2 md:col-span-1">
              <div className="w-10 h-10 rounded-xl bg-[#00BFA6]/10 text-[#00BFA6] flex items-center justify-center shrink-0">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xs font-bold text-white">Community Driven</div>
                <div className="text-[11px] text-slate-400">Grow together</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Footer Links */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-8">
          {/* Brand info */}
          <div className="md:col-span-2 space-y-4">
            <Logo variant="light" />
            <p className="text-sm text-slate-400 max-w-sm leading-relaxed">
              Empowering grassroots, village, and small-town cricketers across India with expert video analysis, verified coaches, and structured training materials.
            </p>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-800 border border-slate-700 text-xs text-[#00BFA6]">
              <Award className="w-3.5 h-3.5" />
              <span className="font-semibold text-slate-200">For Every Dreaming Cricketer</span>
            </div>
          </div>

          {/* Quick Links 1 */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-white mb-3">
              Coaching & Reviews
            </h4>
            <ul className="space-y-2 text-xs text-slate-400">
              <li><Link to="/coaches" className="hover:text-[#00BFA6] transition-colors">Find a Coach</Link></li>
              <li><Link to="/pricing" className="hover:text-[#00BFA6] transition-colors">Video Review Pricing</Link></li>
              <li><Link to="/player/videos/upload" className="hover:text-[#00BFA6] transition-colors">Share Training Video Link</Link></li>
              <li><Link to="/signup" className="hover:text-[#00BFA6] transition-colors">Join as a Coach</Link></li>
            </ul>
          </div>

          {/* Quick Links 2 */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-white mb-3">
              Training Resources
            </h4>
            <ul className="space-y-2 text-xs text-slate-400">
              <li><Link to="/resources?category=Batting" className="hover:text-[#00BFA6] transition-colors">Batting Drills</Link></li>
              <li><Link to="/resources?category=Bowling" className="hover:text-[#00BFA6] transition-colors">Pace & Spin Mechanics</Link></li>
              <li><Link to="/resources?category=Fielding" className="hover:text-[#00BFA6] transition-colors">Fielding & Agility</Link></li>
              <li><Link to="/resources?category=Home+Practice" className="hover:text-[#00BFA6] transition-colors">Home Practice Guides</Link></li>
              <li><Link to="/resources" className="hover:text-[#00BFA6] transition-colors">All E-books & Plans</Link></li>
            </ul>
          </div>

          {/* Quick Links 3 */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-white mb-3">
              Platform & Legal
            </h4>
            <ul className="space-y-2 text-xs text-slate-400">
              <li><Link to="/login" className="hover:text-[#00BFA6] transition-colors">Player Login</Link></li>
              <li><Link to="/login" className="hover:text-[#00BFA6] transition-colors">Coach Portal</Link></li>
              <li><Link to="/admin/dashboard" className="hover:text-[#00BFA6] transition-colors">Admin Portal</Link></li>
              <li><span className="text-slate-500 cursor-not-allowed">Privacy Policy</span></li>
              <li><span className="text-slate-500 cursor-not-allowed">Terms & Conditions</span></li>
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-12 pt-6 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-4">
          <div>
            &copy; {new Date().getFullYear()} CricketVault. Built with care for Indian cricketers.
          </div>
          <div className="font-semibold text-slate-400 flex items-center gap-2">
            <span>Play Better</span>
            <span>&bull;</span>
            <span className="text-[#00BFA6]">Learn Faster</span>
            <span>&bull;</span>
            <span>Grow Together</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
