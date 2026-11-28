import React, { useEffect, useState } from 'react';
import { DashboardLayout } from '../../components/layout/DashboardLayout';
import { apiClient, apiErrorMessage } from '../../services/api';
import { notify } from '../../services/toast';
import { Check, Edit2, Plus, Tag, Trash2, X } from 'lucide-react';

interface PlanRecord {
  _id: string;
  name: string;
  description: string;
  pricePaise: number;
  durationDays: number;
  maxVideos: number;
  includedReviews: number;
  feedbackFrequency: string;
  features: string[];
  published: boolean;
}

interface CouponRecord {
  _id: string;
  code: string;
  discountType: 'PERCENTAGE' | 'FIXED';
  discountValue: number;
  active: boolean;
  expiresAt?: string | null;
}

type PlanForm = Omit<PlanRecord, '_id' | 'pricePaise'> & { id?: string; price: string };
type CouponForm = {
  id?: string;
  code: string;
  discountType: CouponRecord['discountType'];
  value: string;
  active: boolean;
  expiresOn: string;
};

const blankPlan: PlanForm = {
  name: '',
  description: '',
  price: '',
  durationDays: 30,
  maxVideos: 1,
  includedReviews: 1,
  feedbackFrequency: 'Coach feedback',
  features: [],
  published: true,
};

const blankCoupon: CouponForm = {
  code: '',
  discountType: 'PERCENTAGE',
  value: '',
  active: true,
  expiresOn: '',
};

export const AdminPlansPage: React.FC = () => {
  const [plans, setPlans] = useState<PlanRecord[]>([]);
  const [coupons, setCoupons] = useState<CouponRecord[]>([]);
  const [tab, setTab] = useState<'plans' | 'coupons'>('plans');
  const [planForm, setPlanForm] = useState<PlanForm | null>(null);
  const [couponForm, setCouponForm] = useState<CouponForm | null>(null);
  const [busy, setBusy] = useState(false);

  const loadData = async () => {
    const [planResponse, couponResponse] = await Promise.all([
      apiClient.get('/admin/plans'),
      apiClient.get('/admin/coupons'),
    ]);
    setPlans(planResponse.data.plans);
    setCoupons(couponResponse.data.coupons);
  };

  useEffect(() => {
    loadData().catch((error) => notify.error(apiErrorMessage(error)));
  }, []);

  const editPlan = (plan?: PlanRecord) => {
    setPlanForm(plan ? {
      id: plan._id,
      name: plan.name,
      description: plan.description || '',
      price: (plan.pricePaise / 100).toString(),
      durationDays: plan.durationDays,
      maxVideos: plan.maxVideos,
      includedReviews: plan.includedReviews,
      feedbackFrequency: plan.feedbackFrequency || '',
      features: plan.features || [],
      published: plan.published,
    } : { ...blankPlan });
  };

  const savePlan = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!planForm) return;
    const payload = {
      name: planForm.name.trim(),
      description: planForm.description.trim(),
      pricePaise: Math.round(Number(planForm.price) * 100),
      durationDays: Number(planForm.durationDays),
      maxVideos: Number(planForm.maxVideos),
      includedReviews: Number(planForm.includedReviews),
      feedbackFrequency: planForm.feedbackFrequency.trim(),
      features: planForm.features,
      published: planForm.published,
    };
    if (!payload.name || !Number.isSafeInteger(payload.pricePaise) || payload.pricePaise < 1) {
      notify.error('Enter a plan name and a valid price.');
      return;
    }
    setBusy(true);
    try {
      if (planForm.id) await apiClient.patch(`/admin/plans/${planForm.id}`, payload);
      else await apiClient.post('/admin/plans', payload);
      await loadData();
      setPlanForm(null);
      notify.success(planForm.id ? 'Plan updated.' : 'Plan created.');
    } catch (error) {
      notify.error(apiErrorMessage(error));
    } finally {
      setBusy(false);
    }
  };

  const deletePlan = async (plan: PlanRecord) => {
    if (!window.confirm(`Delete "${plan.name}"? Plans with subscription history must be unpublished instead.`)) return;
    try {
      await apiClient.delete(`/admin/plans/${plan._id}`);
      await loadData();
      notify.success('Plan deleted.');
    } catch (error) {
      notify.error(apiErrorMessage(error));
    }
  };

  const editCoupon = (coupon?: CouponRecord) => {
    setCouponForm(coupon ? {
      id: coupon._id,
      code: coupon.code,
      discountType: coupon.discountType,
      value: coupon.discountType === 'FIXED'
        ? (coupon.discountValue / 100).toString()
        : coupon.discountValue.toString(),
      active: coupon.active,
      expiresOn: coupon.expiresAt ? coupon.expiresAt.slice(0, 10) : '',
    } : { ...blankCoupon });
  };

  const saveCoupon = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!couponForm) return;
    const value = Number(couponForm.value);
    const discountValue = couponForm.discountType === 'FIXED'
      ? Math.round(value * 100)
      : value;
    if (!couponForm.code.trim() || !Number.isSafeInteger(discountValue) || discountValue < 1 ||
      (couponForm.discountType === 'PERCENTAGE' && discountValue >= 100)) {
      notify.error('Enter a valid coupon code and discount (percentage must be below 100%).');
      return;
    }
    const payload = {
      code: couponForm.code.trim().toUpperCase(),
      discountType: couponForm.discountType,
      discountValue,
      active: couponForm.active,
      expiresAt: couponForm.expiresOn
        ? new Date(`${couponForm.expiresOn}T23:59:59.999Z`).toISOString()
        : null,
    };
    setBusy(true);
    try {
      if (couponForm.id) await apiClient.patch(`/admin/coupons/${couponForm.id}`, payload);
      else await apiClient.post('/admin/coupons', payload);
      await loadData();
      setCouponForm(null);
      notify.success(couponForm.id ? 'Coupon updated.' : 'Coupon created.');
    } catch (error) {
      notify.error(apiErrorMessage(error));
    } finally {
      setBusy(false);
    }
  };

  const toggleCoupon = async (coupon: CouponRecord) => {
    try {
      await apiClient.patch(`/admin/coupons/${coupon._id}`, { active: !coupon.active });
      await loadData();
      notify.success(coupon.active ? 'Coupon disabled.' : 'Coupon enabled.');
    } catch (error) {
      notify.error(apiErrorMessage(error));
    }
  };

  const deleteCoupon = async (coupon: CouponRecord) => {
    if (!window.confirm(`Delete coupon ${coupon.code}?`)) return;
    try {
      await apiClient.delete(`/admin/coupons/${coupon._id}`);
      await loadData();
      notify.success('Coupon deleted.');
    } catch (error) {
      notify.error(apiErrorMessage(error));
    }
  };

  return (
    <DashboardLayout role="admin">
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-extrabold text-slate-900">Plans & Coupons</h1>
            <p className="mt-1 text-xs text-slate-500">Manage published coaching plans and player discount codes.</p>
          </div>
          <button
            type="button"
            onClick={() => tab === 'plans' ? editPlan() : editCoupon()}
            className="flex items-center justify-center gap-2 self-start rounded-xl bg-[#00BFA6] px-4 py-2.5 text-xs font-extrabold text-[#0F172A] shadow-sm hover:bg-[#00D6BA]"
          >
            <Plus className="h-4 w-4" />
            {tab === 'plans' ? 'Create Plan' : 'Create Coupon'}
          </button>
        </div>

        <div className="inline-flex rounded-xl border border-slate-200 bg-white p-1 text-xs font-bold shadow-sm">
          <button
            type="button"
            onClick={() => setTab('plans')}
            className={`rounded-lg px-4 py-2 ${tab === 'plans' ? 'bg-[#0F172A] text-white' : 'text-slate-600'}`}
          >
            Subscription Plans ({plans.length})
          </button>
          <button
            type="button"
            onClick={() => setTab('coupons')}
            className={`rounded-lg px-4 py-2 ${tab === 'coupons' ? 'bg-[#0F172A] text-white' : 'text-slate-600'}`}
          >
            Discount Coupons ({coupons.length})
          </button>
        </div>

        {tab === 'plans' ? (
          <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-left text-xs">
                <thead className="border-b border-slate-200 bg-slate-50 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  <tr>
                    <th className="p-4">Plan</th>
                    <th className="p-4">Price</th>
                    <th className="p-4">Duration</th>
                    <th className="p-4">Video-review limits</th>
                    <th className="p-4">Visibility</th>
                    <th className="p-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {plans.map((plan) => (
                    <tr key={plan._id}>
                      <td className="p-4">
                        <div className="font-bold text-slate-900">{plan.name}</div>
                        <div className="mt-1 max-w-xs truncate text-slate-500">{plan.description}</div>
                      </td>
                      <td className="p-4 font-bold text-slate-900">₹{(plan.pricePaise / 100).toFixed(2)}</td>
                      <td className="p-4 text-slate-600">{plan.durationDays} days</td>
                      <td className="p-4 text-slate-600">{plan.maxVideos} submissions / {plan.includedReviews} coach reviews</td>
                      <td className="p-4">
                        <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${plan.published ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
                          {plan.published ? 'Published' : 'Unpublished'}
                        </span>
                      </td>
                      <td className="p-4 text-right">
                        <button type="button" onClick={() => editPlan(plan)} className="mr-3 text-slate-500 hover:text-[#008f7e]" aria-label={`Edit ${plan.name}`}>
                          <Edit2 className="inline h-4 w-4" />
                        </button>
                        <button type="button" onClick={() => deletePlan(plan)} className="text-slate-400 hover:text-rose-600" aria-label={`Delete ${plan.name}`}>
                          <Trash2 className="inline h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {!plans.length && <tr><td colSpan={6} className="p-8 text-center text-slate-500">No subscription plans yet.</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[620px] text-left text-xs">
                <thead className="border-b border-slate-200 bg-slate-50 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  <tr>
                    <th className="p-4">Coupon Code</th>
                    <th className="p-4">Discount</th>
                    <th className="p-4">Expires</th>
                    <th className="p-4">Status</th>
                    <th className="p-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {coupons.map((coupon) => (
                    <tr key={coupon._id}>
                      <td className="p-4">
                        <span className="inline-flex items-center gap-2 rounded-lg bg-slate-100 px-3 py-1.5 font-extrabold tracking-wider text-slate-800">
                          <Tag className="h-3.5 w-3.5 text-[#00a88f]" />{coupon.code}
                        </span>
                      </td>
                      <td className="p-4 font-bold text-slate-900">
                        {coupon.discountType === 'PERCENTAGE' ? `${coupon.discountValue}% off` : `₹${(coupon.discountValue / 100).toFixed(2)} off`}
                      </td>
                      <td className="p-4 text-slate-600">
                        {coupon.expiresAt ? new Date(coupon.expiresAt).toLocaleDateString() : 'No expiry'}
                      </td>
                      <td className="p-4">
                        <button type="button" onClick={() => toggleCoupon(coupon)} className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${!coupon.active ? 'bg-slate-100 text-slate-600' : coupon.expiresAt && new Date(coupon.expiresAt).getTime() < Date.now() ? 'bg-rose-50 text-rose-700' : 'bg-emerald-50 text-emerald-700'}`}>
                          {!coupon.active ? 'Disabled' : coupon.expiresAt && new Date(coupon.expiresAt).getTime() < Date.now() ? 'Expired' : 'Active'}
                        </button>
                      </td>
                      <td className="p-4 text-right">
                        <button type="button" onClick={() => editCoupon(coupon)} className="mr-3 text-slate-500 hover:text-[#008f7e]" aria-label={`Edit ${coupon.code}`}>
                          <Edit2 className="inline h-4 w-4" />
                        </button>
                        <button type="button" onClick={() => deleteCoupon(coupon)} className="text-slate-400 hover:text-rose-600" aria-label={`Delete ${coupon.code}`}>
                          <Trash2 className="inline h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {!coupons.length && <tr><td colSpan={5} className="p-8 text-center text-slate-500">No discount coupons yet.</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {planForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <button type="button" className="fixed inset-0 bg-black/60" onClick={() => setPlanForm(null)} aria-label="Close plan form" />
          <form onSubmit={savePlan} className="relative z-10 max-h-[90vh] w-full max-w-2xl space-y-4 overflow-y-auto rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-extrabold text-slate-900">{planForm.id ? 'Update Plan' : 'Create Plan'}</h2>
              <button type="button" onClick={() => setPlanForm(null)} aria-label="Close"><X className="h-5 w-5 text-slate-500" /></button>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="text-xs font-bold text-slate-700">Plan Name
                <input required value={planForm.name} onChange={(e) => setPlanForm({ ...planForm, name: e.target.value })} className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 font-normal" />
              </label>
              <label className="text-xs font-bold text-slate-700">Price (₹)
                <input required type="number" min="0.01" step="0.01" value={planForm.price} onChange={(e) => setPlanForm({ ...planForm, price: e.target.value })} className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 font-normal" />
              </label>
              <label className="text-xs font-bold text-slate-700">Duration (days)
                <input required type="number" min="1" step="1" value={planForm.durationDays} onChange={(e) => setPlanForm({ ...planForm, durationDays: Number(e.target.value) })} className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 font-normal" />
              </label>
              <label className="text-xs font-bold text-slate-700">Maximum Video-review Submissions
                <input required type="number" min="1" step="1" value={planForm.maxVideos} onChange={(e) => setPlanForm({ ...planForm, maxVideos: Number(e.target.value) })} className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 font-normal" />
              </label>
              <label className="text-xs font-bold text-slate-700">Included Reviews
                <input required type="number" min="1" step="1" value={planForm.includedReviews} onChange={(e) => setPlanForm({ ...planForm, includedReviews: Number(e.target.value) })} className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 font-normal" />
              </label>
              <label className="text-xs font-bold text-slate-700">Feedback Frequency
                <input value={planForm.feedbackFrequency} onChange={(e) => setPlanForm({ ...planForm, feedbackFrequency: e.target.value })} className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 font-normal" />
              </label>
            </div>
            <label className="block text-xs font-bold text-slate-700">Description
              <textarea rows={2} value={planForm.description} onChange={(e) => setPlanForm({ ...planForm, description: e.target.value })} className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 font-normal" />
            </label>
            <label className="block text-xs font-bold text-slate-700">Features (one per line)
              <textarea rows={4} value={planForm.features.join('\n')} onChange={(e) => setPlanForm({ ...planForm, features: e.target.value.split('\n').map((feature) => feature.trim()).filter(Boolean) })} className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 font-normal" />
            </label>
            <label className="flex items-center gap-2 text-xs font-semibold text-slate-700">
              <input type="checkbox" checked={planForm.published} onChange={(e) => setPlanForm({ ...planForm, published: e.target.checked })} className="accent-[#00BFA6]" />
              Publish this plan for players
            </label>
            <button disabled={busy} className="w-full rounded-xl bg-[#00BFA6] py-3 text-xs font-extrabold text-[#0F172A] disabled:opacity-50">{busy ? 'Saving…' : 'Save Plan'}</button>
          </form>
        </div>
      )}

      {couponForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <button type="button" className="fixed inset-0 bg-black/60" onClick={() => setCouponForm(null)} aria-label="Close coupon form" />
          <form onSubmit={saveCoupon} className="relative z-10 w-full max-w-md space-y-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-extrabold text-slate-900">{couponForm.id ? 'Update Coupon' : 'Create Coupon'}</h2>
              <button type="button" onClick={() => setCouponForm(null)} aria-label="Close"><X className="h-5 w-5 text-slate-500" /></button>
            </div>
            <label className="block text-xs font-bold text-slate-700">Coupon Code
              <input required minLength={3} maxLength={30} pattern="[A-Za-z0-9_-]+" value={couponForm.code} onChange={(e) => setCouponForm({ ...couponForm, code: e.target.value.toUpperCase() })} placeholder="e.g. WELCOME20" className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 font-semibold uppercase" />
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className="text-xs font-bold text-slate-700">Discount Type
                <select value={couponForm.discountType} onChange={(e) => setCouponForm({ ...couponForm, discountType: e.target.value as CouponForm['discountType'] })} className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2">
                  <option value="PERCENTAGE">Percentage</option>
                  <option value="FIXED">Fixed amount</option>
                </select>
              </label>
              <label className="text-xs font-bold text-slate-700">Discount {couponForm.discountType === 'FIXED' ? '(₹)' : '(%)'}
                <input required type="number" min={couponForm.discountType === 'FIXED' ? '0.01' : '1'} max={couponForm.discountType === 'PERCENTAGE' ? '99' : undefined} step={couponForm.discountType === 'FIXED' ? '0.01' : '1'} value={couponForm.value} onChange={(e) => setCouponForm({ ...couponForm, value: e.target.value })} className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2" />
              </label>
            </div>
            <label className="block text-xs font-bold text-slate-700">Valid Until (optional)
              <input
                type="date"
                value={couponForm.expiresOn}
                onChange={(e) => setCouponForm({ ...couponForm, expiresOn: e.target.value })}
                className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 font-normal"
              />
              <span className="mt-1 block font-normal text-slate-500">The coupon remains valid through the selected date.</span>
            </label>
            <label className="flex items-center gap-2 text-xs font-semibold text-slate-700">
              <input type="checkbox" checked={couponForm.active} onChange={(e) => setCouponForm({ ...couponForm, active: e.target.checked })} className="accent-[#00BFA6]" />
              Coupon is active
            </label>
            <p className="text-[11px] leading-relaxed text-slate-500">Coupons apply to all published plans. Fixed discounts cannot reduce the payable price to zero.</p>
            <button disabled={busy} className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#00BFA6] py-3 text-xs font-extrabold text-[#0F172A] disabled:opacity-50">
              <Check className="h-4 w-4" />{busy ? 'Saving…' : 'Save Coupon'}
            </button>
          </form>
        </div>
      )}
    </DashboardLayout>
  );
};
