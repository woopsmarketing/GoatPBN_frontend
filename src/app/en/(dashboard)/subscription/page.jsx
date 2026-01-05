'use client';

// v1.0 - Subscription overview (English)
// Displays Supabase subscription data with English copy

import { useEffect, useMemo, useState } from 'react';

import MainCard from '@/components/MainCard';
import TailwindButton from '@/components/ui/TailwindButton';
import { authAPI, supabase } from '@/lib/supabase';
import { formatToUserTimeZone } from '@/lib/utils/userTimeZone';

const PLAN_LABELS = {
  free: 'Free plan',
  starter: 'Starter',
  growth: 'Growth',
  pro: 'Pro',
  enterprise: 'Enterprise',
  custom: 'Custom plan'
};

export default function SubscriptionPageEn() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [subscription, setSubscription] = useState(null);

  useEffect(() => {
    let active = true;

    const loadSubscription = async () => {
      try {
        const { data: authData, error: authError } = await authAPI.getCurrentUser();
        if (authError) throw authError;
        const user = authData?.user;
        if (!user) {
          setError('Unable to locate login information.');
          return;
        }

        const { data, error: subError } = await supabase.from('subscriptions').select('*').eq('user_id', user.id).maybeSingle();

        if (subError) throw subError;
        if (active) {
          setSubscription(data);
        }
      } catch (err) {
        console.error('Failed to load subscription:', err);
        if (active) {
          setError('Unable to fetch subscription data. Please try again shortly.');
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    loadSubscription();
    return () => {
      active = false;
    };
  }, []);

  const planLabel = useMemo(() => {
    if (!subscription?.plan) return 'No plan selected';
    return PLAN_LABELS[subscription.plan] || subscription.plan;
  }, [subscription]);

  const expiryLabel = useMemo(() => {
    if (!subscription?.expiry_date) return 'Unlimited';
    return formatToUserTimeZone(subscription.expiry_date, { year: 'numeric', month: 'long', day: 'numeric' });
  }, [subscription]);

  const daysRemaining = useMemo(() => {
    if (!subscription?.expiry_date) return null;
    const end = new Date(subscription.expiry_date).getTime();
    const now = Date.now();
    return Math.max(0, Math.ceil((end - now) / (1000 * 60 * 60 * 24)));
  }, [subscription]);

  const credits = {
    total: subscription?.credits_total ?? 0,
    used: subscription?.credits_used ?? 0,
    remaining: subscription?.credits_remaining ?? 0
  };

  return (
    <div className="space-y-6">
      <MainCard title="Subscription overview">
        {loading ? (
          <p className="text-sm text-gray-600">Loading subscription details...</p>
        ) : error ? (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>
        ) : subscription ? (
          <div className="grid gap-6 lg:grid-cols-2">
            <div className="space-y-4">
              <h3 className="text-xl font-semibold text-gray-900">{planLabel}</h3>
              <p className="text-sm text-gray-600">
                {subscription.description || 'No description yet. Contact support for a tailored plan or onboarding guidance.'}
              </p>
              <div className="rounded-lg border border-dashed border-gray-200 bg-gray-50 p-4 text-sm text-gray-700">
                <p>
                  Status: <span className="font-medium text-gray-900">{subscription.status}</span>
                </p>
                <p className="mt-2">
                  Renewal/expiry: <span className="font-medium text-gray-900">{expiryLabel}</span>
                </p>
                {daysRemaining !== null && (
                  <p className="mt-1 text-xs text-gray-500">
                    Days remaining: <span className="font-semibold text-gray-700">{daysRemaining} days</span>
                  </p>
                )}
              </div>
              <TailwindButton size="lg" variant="secondary" onClick={() => window.open('https://totoggong.com/contact', '_blank')}>
                Request plan upgrade
              </TailwindButton>
            </div>
            <div className="grid gap-4 rounded-lg border border-gray-200 bg-white p-5 shadow-sm md:grid-cols-3">
              <div className="space-y-1 rounded-lg bg-blue-50 p-4 text-center">
                <p className="text-xs font-medium text-blue-700 uppercase tracking-wide">Total credits</p>
                <p className="text-2xl font-bold text-blue-600">{credits.total.toLocaleString()}</p>
              </div>
              <div className="space-y-1 rounded-lg bg-purple-50 p-4 text-center">
                <p className="text-xs font-medium text-purple-700 uppercase tracking-wide">Used</p>
                <p className="text-2xl font-bold text-purple-600">{credits.used.toLocaleString()}</p>
              </div>
              <div className="space-y-1 rounded-lg bg-emerald-50 p-4 text-center">
                <p className="text-xs font-medium text-emerald-700 uppercase tracking-wide">Remaining</p>
                <p className={`text-2xl font-bold ${credits.remaining <= 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                  {credits.remaining.toLocaleString()}
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-6 text-sm text-gray-600">
            <p className="font-medium text-gray-900">No subscription record yet.</p>
            <p className="mt-2">You are starting on the free tier. Upgrade anytime when you need more credits or automation volume.</p>
            <TailwindButton className="mt-4" onClick={() => window.open('https://totoggong.com/contact', '_blank')}>
              Request consultation
            </TailwindButton>
          </div>
        )}
      </MainCard>
      <MainCard title="Plan overview">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {[
            { title: 'Starter', description: 'Small-scale automation for testing, covering 5-10 campaigns monthly.' },
            { title: 'Growth', description: 'Traffic expansion plan with auto reports and backlinking.' },
            { title: 'Pro', description: 'Agency-tier with team collaboration, API access, and workflow automation.' },
            { title: 'Enterprise', description: 'Custom SLA, dedicated support, and integrations for enterprise teams.' }
          ].map((plan) => (
            <div key={plan.title} className="rounded-xl border border-gray-200 p-5 shadow-sm">
              <h4 className="text-lg font-semibold text-gray-900">{plan.title}</h4>
              <p className="mt-2 text-sm text-gray-600">{plan.description}</p>
            </div>
          ))}
        </div>
      </MainCard>
    </div>
  );
}
