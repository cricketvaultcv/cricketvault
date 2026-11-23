import React, { useState } from 'react';
import { DashboardLayout } from '../../components/layout/DashboardLayout';
import { useApp } from '../../context/AppContext';
import { BookOpen, Plus, Trash2, CheckCircle2, Star } from 'lucide-react';
import { CricketResource } from '../../types';
import { notify } from '../../services/toast';

export const AdminResourcesPage: React.FC = () => {
  const { resources, addResource, deleteResource, currentUser } = useApp();
  const [showAddModal, setShowAddModal] = useState(false);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<CricketResource['category']>('Batting');
  const [price, setPrice] = useState(99);
  const [isFree, setIsFree] = useState(false);
  const [author, setAuthor] = useState('');
  const [description, setDescription] = useState('');

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    try {
      await addResource({
      title,
      category,
      price: isFree ? 0 : price,
      isFree,
      level: 'All Levels',
      rating: 0,
      reviewsCount: 0,
      description,
      coverImage: '',
      author: author.trim() || currentUser?.name || '',
      whatInside: [],
      });

      setShowAddModal(false);
      setTitle('');
      setDescription('');
    } catch (error) {
      notify.error(error instanceof Error ? error.message : 'Unable to publish resource.');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteResource(id);
    } catch (error) {
      notify.error(error instanceof Error ? error.message : 'Unable to delete resource.');
    }
  };

  return (
    <DashboardLayout role="admin">
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-extrabold text-slate-900">Training Resources Manager</h1>
            <p className="text-xs text-slate-500 mt-1">
              Publish and maintain official e-books, drill guides, and downloadable resources.
            </p>
          </div>

          <button
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2.5 rounded-xl bg-[#00BFA6] hover:bg-[#00D6BA] text-[#0F172A] font-extrabold text-xs flex items-center gap-2 self-start sm:self-auto shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>Publish New Resource</span>
          </button>
        </div>

        {/* Resources Table */}
        <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider">
                <tr>
                  <th className="p-4">Resource</th>
                  <th className="p-4">Category</th>
                  <th className="p-4">Author</th>
                  <th className="p-4">Price</th>
                  <th className="p-4">Rating</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {resources.map((res) => (
                  <tr key={res.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="p-4 flex items-center gap-3">
                      <img src={res.coverImage} alt={res.title} className="w-12 h-10 rounded-lg object-cover" />
                      <div className="font-bold text-slate-900 max-w-xs truncate">{res.title}</div>
                    </td>
                    <td className="p-4">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700">
                        {res.category}
                      </span>
                    </td>
                    <td className="p-4 text-slate-600">{res.author}</td>
                    <td className="p-4 font-bold text-slate-900">
                      {res.isFree ? 'Free' : `₹${res.price}`}
                    </td>
                    <td className="p-4 text-amber-500 font-bold">★ {res.rating}</td>
                    <td className="p-4 text-right">
                      <button
                        onClick={() => handleDelete(res.id)}
                        className="p-1 text-slate-400 hover:text-rose-600"
                        title="Delete Resource"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Add Resource Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/60 backdrop-blur-xs" onClick={() => setShowAddModal(false)} />
          <div className="relative w-full max-w-lg bg-white rounded-3xl p-6 shadow-2xl z-50 border border-slate-200">
            <h3 className="text-base font-extrabold text-slate-900 mb-4">Publish New Cricket Resource</h3>
            <form onSubmit={handleCreate} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Resource Title</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Masterclass on Playing Spin"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Category</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300"
                  >
                    <option value="Batting">Batting</option>
                    <option value="Bowling">Bowling</option>
                    <option value="Fielding">Fielding</option>
                    <option value="Wicketkeeping">Wicketkeeping</option>
                    <option value="Fitness">Fitness</option>
                    <option value="Home Practice">Home Practice</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Price (₹ INR)</label>
                  <input
                    type="number"
                    disabled={isFree}
                    value={price}
                    onChange={(e) => setPrice(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 disabled:opacity-50"
                  />
                  <label className="inline-flex items-center gap-1.5 mt-1 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isFree}
                      onChange={(e) => setIsFree(e.target.checked)}
                      className="accent-[#00BFA6]"
                    />
                    <span>Offer as Free Resource</span>
                  </label>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Author Coach</label>
                <input
                  type="text"
                  value={author}
                  onChange={(e) => setAuthor(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Description</label>
                <textarea
                  rows={3}
                  required
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Summary of drills, techniques, and practice tips..."
                  className="w-full p-2.5 rounded-xl border border-slate-300"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-[#00BFA6] text-[#0F172A] font-bold"
                >
                  Publish Resource
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2.5 rounded-xl bg-slate-100 text-slate-700 font-semibold"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
};
