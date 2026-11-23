import React from 'react';
import { Link } from 'react-router-dom';
import { Navbar } from '../../components/layout/Navbar';
import { Footer } from '../../components/layout/Footer';
import { AlertCircle, ArrowLeft } from 'lucide-react';

export const NotFoundPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col">
      <Navbar />
      <main className="flex-1 flex items-center justify-center p-6 text-center">
        <div className="max-w-md space-y-4">
          <div className="w-16 h-16 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center mx-auto">
            <AlertCircle className="w-8 h-8" />
          </div>
          <h1 className="text-3xl font-extrabold text-slate-900">404 - Page Not Found</h1>
          <p className="text-xs sm:text-sm text-slate-500">
            The page or net drill you are looking for does not exist or has been relocated.
          </p>
          <div className="pt-2">
            <Link
              to="/"
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-[#00BFA6] text-[#0F172A] font-bold text-xs shadow-sm hover:bg-[#00D6BA] transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to CricketVault Home</span>
            </Link>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};
