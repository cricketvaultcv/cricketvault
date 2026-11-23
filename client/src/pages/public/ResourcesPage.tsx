import React, { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Navbar } from '../../components/layout/Navbar';
import { Footer } from '../../components/layout/Footer';
import { useApp } from '../../context/AppContext';
import {
  Search,
  BookOpen,
  Filter,
  CheckCircle,
  Star,
  Zap,
  Target,
  Shield,
  Home,
  Activity,
  Layers,
} from 'lucide-react';

export const ResourcesPage: React.FC = () => {
  const { resources, purchasedResourceIds } = useApp();
  const [searchParams, setSearchParams] = useSearchParams();
  const categoryParam = searchParams.get('category') || 'All';
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLevel, setSelectedLevel] = useState<string>('All');

  const categoryIcons: Record<string, typeof Layers> = {
    Batting: Target,
    Bowling: Zap,
    Fielding: Shield,
    Wicketkeeping: BookOpen,
    Fitness: Activity,
    'Home Practice': Home,
  };
  const categories = [
    { name: 'All', label: 'All Resources', icon: Layers, count: resources.length },
    ...Array.from(new Set(resources.map((resource) => resource.category)))
      .sort((a, b) => a.localeCompare(b))
      .map((category) => ({
        name: category,
        label: category,
        icon: categoryIcons[category] || BookOpen,
        count: resources.filter((resource) => resource.category === category).length,
      })),
  ];

  const filteredResources = resources.filter((res) => {
    const matchesCategory =
      categoryParam === 'All' || res.category === categoryParam;
    const matchesLevel =
      selectedLevel === 'All' || res.level === selectedLevel;
    const matchesSearch =
      res.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      res.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      res.author.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesLevel && matchesSearch;
  });

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col">
      <Navbar />

      {/* Hero Section (Matches Reference 1 & 2 Screen 6) */}
      <section className="relative bg-[#0F172A] text-white py-14 px-4 sm:px-6 lg:px-8 overflow-hidden">
        <div className="absolute inset-0 opacity-15">
          <img
            src="https://images.unsplash.com/photo-1540747913346-19e32dc3e97e?w=1600&auto=format&fit=crop&q=80"
            alt="Cricket pitch training"
            className="w-full h-full object-cover"
          />
        </div>

        <div className="relative max-w-4xl mx-auto text-center space-y-4">
          <span className="text-xs font-bold uppercase tracking-wider text-[#00BFA6]">
            CricketVault Academy Library
          </span>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
            Learn. Practice. Improve.
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 max-w-2xl mx-auto leading-relaxed">
            Access cricket guides, e-books, drill sheets, and training resources designed by senior coaches to take your skills to the next level.
          </p>

          {/* Integrated Search Bar */}
          <div className="pt-4 max-w-2xl mx-auto">
            <div className="relative flex items-center bg-white rounded-2xl shadow-xl p-1.5 border border-slate-200">
              <Search className="w-5 h-5 text-slate-400 ml-3 shrink-0" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search drills, batting stance, bowling variations, home guides..."
                className="w-full px-3 py-2 text-xs sm:text-sm text-slate-800 placeholder-slate-400 focus:outline-none"
              />
              <button
                type="button"
                className="px-5 py-2.5 rounded-xl bg-[#00BFA6] hover:bg-[#00D6BA] text-[#0F172A] font-bold text-xs shrink-0 transition-colors"
              >
                Search
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Categories Grid (Matches Reference 1 & 2 screen 6) */}
      <section className="py-8 bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-bold text-slate-900">Resource Categories</h2>
            <div className="text-xs text-slate-500">Filter by coaching topic</div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
            {categories.map((cat) => {
              const Icon = cat.icon;
              const isSelected = categoryParam === cat.name;
              return (
                <button
                  key={cat.name}
                  onClick={() => {
                    if (cat.name === 'All') {
                      searchParams.delete('category');
                    } else {
                      searchParams.set('category', cat.name);
                    }
                    setSearchParams(searchParams);
                  }}
                  className={`p-3.5 rounded-2xl border text-center transition-all flex flex-col items-center justify-center gap-1.5 ${
                    isSelected
                      ? 'border-[#00BFA6] bg-[#00BFA6]/10 text-[#0F172A] shadow-sm ring-1 ring-[#00BFA6]'
                      : 'border-slate-200 bg-slate-50/70 hover:bg-slate-100 text-slate-700'
                  }`}
                >
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                      isSelected ? 'bg-[#00BFA6] text-[#0F172A]' : 'bg-white text-slate-600 shadow-xs'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="font-bold text-xs truncate w-full">{cat.label}</div>
                  <div className="text-[10px] text-slate-500 font-medium">({cat.count})</div>
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* Main Catalog View */}
      <section className="py-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full flex-1">
        {/* Filters and counts */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
          <div>
            <h2 className="text-xl font-bold text-slate-900">
              {categoryParam === 'All' ? 'Featured Training Guides & E-books' : `${categoryParam} Guides`}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Showing {filteredResources.length} curated resources
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 font-medium">Experience Level:</span>
            <select
              value={selectedLevel}
              onChange={(e) => setSelectedLevel(e.target.value)}
              className="px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-xs font-semibold text-slate-700 focus:outline-none focus:border-[#00BFA6]"
            >
              <option value="All">All Levels</option>
              <option value="Beginner">Beginner</option>
              <option value="Intermediate">Intermediate</option>
              <option value="Advanced">Advanced</option>
            </select>
          </div>
        </div>

        {/* Resources Grid */}
        {filteredResources.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredResources.map((res) => {
              const isPurchased = purchasedResourceIds.includes(res.id);

              return (
                <div
                  key={res.id}
                  className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs hover:shadow-lg transition-all flex flex-col group"
                >
                  <div className="relative h-48 overflow-hidden bg-slate-100">
                    <img
                      src={res.coverImage}
                      alt={res.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <div className="absolute top-3 left-3 flex gap-2">
                      <span className="px-2.5 py-1 rounded-md text-[11px] font-bold bg-slate-900/80 backdrop-blur-xs text-white">
                        {res.category}
                      </span>
                      <span className="px-2.5 py-1 rounded-md text-[11px] font-bold bg-white/90 text-slate-800">
                        {res.level}
                      </span>
                    </div>

                    <div className="absolute top-3 right-3">
                      {isPurchased ? (
                        <span className="px-2.5 py-1 rounded-md text-[11px] font-bold bg-emerald-600 text-white flex items-center gap-1 shadow-sm">
                          <CheckCircle className="w-3.5 h-3.5" />
                          <span>In Library</span>
                        </span>
                      ) : (
                        <span
                          className={`px-3 py-1 rounded-md text-xs font-bold shadow-sm ${
                            res.isFree
                              ? 'bg-emerald-500 text-white'
                              : 'bg-[#00BFA6] text-[#0F172A]'
                          }`}
                        >
                          {res.isFree ? 'Free' : `₹${res.price}`}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="p-5 flex-1 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center gap-1.5 text-xs text-amber-500 mb-1.5">
                        <Star className="w-4 h-4 fill-current" />
                        <span className="font-bold text-slate-800">{res.rating}</span>
                        <span className="text-slate-400 text-[11px]">({res.reviewsCount} reviews)</span>
                      </div>

                      <h3 className="font-bold text-base text-slate-900 group-hover:text-[#00BFA6] transition-colors leading-snug">
                        {res.title}
                      </h3>
                      <p className="text-xs text-slate-600 mt-1.5 line-clamp-2 leading-relaxed">
                        {res.description}
                      </p>
                      <div className="text-[11px] text-slate-400 mt-2">
                        Authored by: <strong className="text-slate-600">{res.author}</strong>
                      </div>
                    </div>

                    <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between">
                      <span className="text-xs font-semibold text-slate-500">
                        {res.whatInside.length} Core Modules
                      </span>
                      <Link
                        to={`/resources/${res.id}`}
                        className="px-4 py-2 rounded-xl bg-[#0F172A] hover:bg-[#00BFA6] text-white hover:text-[#0F172A] font-bold text-xs transition-colors"
                      >
                        {isPurchased ? 'Open Guide' : res.isFree ? 'Read Free' : 'View & Buy'}
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-16 bg-white rounded-2xl border border-slate-200 p-8">
            <BookOpen className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h3 className="text-base font-bold text-slate-800">No resources found</h3>
            <p className="text-xs text-slate-500 mt-1">
              Try adjusting your search query or selecting a different category.
            </p>
            <button
              onClick={() => {
                setSearchQuery('');
                searchParams.delete('category');
                setSearchParams(searchParams);
              }}
              className="mt-4 px-4 py-2 rounded-lg bg-[#00BFA6] text-[#0F172A] text-xs font-bold"
            >
              Reset Filters
            </button>
          </div>
        )}
      </section>

      <Footer />
    </div>
  );
};
