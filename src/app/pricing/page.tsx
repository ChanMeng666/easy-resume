'use client';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Navbar } from '@/components/shared/Navbar';
import { Footer } from '@/components/shared/Footer';
import { PageShell } from '@/components/shared/PageShell';
import { PageHeader } from '@/components/shared/PageHeader';
import { FadeIn } from '@/components/shared/FadeIn';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

const plans = [
  {
    name: 'Free',
    price: '$0',
    period: 'forever',
    description: 'AI resume generation to get you started',
    features: [
      'AI resume generation from a job description',
      '7 professional Typst templates',
      'ATS compatibility scoring',
      'PDF + cover letter download',
      'API + CLI + MCP access — drive Vitex from your AI assistant',
      '3 free credits on signup',
    ],
    cta: 'Get Started',
    ctaVariant: 'outline' as const,
    priceType: null,
  },
  {
    name: 'Pro',
    price: '$29',
    period: '/month',
    description: '20 builds a month for an active search',
    popular: true,
    features: [
      'Everything in Free',
      '20 credits per month',
      'Resume tailoring to job descriptions',
      'ATS optimization reports',
      'Cover letter generation',
      'Application tracking',
      'Priority AI responses',
    ],
    cta: 'Start Pro',
    ctaVariant: 'default' as const,
    priceType: 'pro_monthly',
  },
  {
    name: 'Unlimited',
    price: '$49',
    period: '/month',
    description: 'Unlimited everything for power users',
    features: [
      'Everything in Pro',
      'Unlimited credits',
      'Unlimited tailoring',
      'Unlimited cover letters',
      'Unlimited ATS reports',
      'Bulk application support',
      'Priority support',
    ],
    cta: 'Go Unlimited',
    ctaVariant: 'secondary' as const,
    priceType: 'unlimited_monthly',
  },
];

const creditPacks = [
  { credits: 5, price: '$15', priceType: 'credits_5' },
];

// Features that are on the roadmap but NOT yet shipped. We keep them listed (the
// direction is real) but label them honestly so the pricing page never
// over-promises a capability the product doesn't have today.
const COMING_SOON_FEATURES = new Set<string>([
  'Priority AI responses',
  'Bulk application support',
  'Priority support',
]);

/**
 * Pricing page content with the Phantom design system.
 * Shows subscription tiers and credit pack purchases. Reads the
 * `?cancelled=true` query param Stripe appends when a user abandons checkout,
 * so it is wrapped in <Suspense> by the page export.
 */
function PricingContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isLoading, setIsLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cancelled, setCancelled] = useState(
    searchParams.get('cancelled') === 'true'
  );

  const handlePurchase = async (priceType: string) => {
    setIsLoading(priceType);
    setError(null);
    try {
      const res = await fetch('/api/credits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ priceType }),
      });

      // Not signed in — send to sign-in, then return to pricing.
      if (res.status === 401) {
        router.push('/handler/sign-in?after_auth_return_to=/pricing');
        return;
      }

      const data = await res.json().catch(() => ({}));
      if (data.url) {
        window.location.href = data.url;
      } else {
        setError(data.error || 'Could not start checkout. Please try again.');
      }
    } catch (err) {
      console.error('Purchase error:', err);
      setError('Network error — please check your connection and try again.');
    } finally {
      setIsLoading(null);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar currentPath="/pricing" />

      <PageShell as="main">
        {/* Hero */}
        <PageHeader
          eyebrow="Pricing — Pay per result"
          title="Sell results, not tools."
          lede="Free to build. You're only charged when a real PDF is composed — failed builds are free, and every resume downloads as editable .typ source, so there's zero lock-in."
        />

        {cancelled && (
          <div className="max-w-2xl mx-auto mb-8 flex items-start gap-3 bg-buttercream text-buttercream-ink rounded-2xl p-4">
            <p className="flex-1 text-sm">
              Checkout cancelled — no charge was made. You can pick a plan whenever
              you&apos;re ready.
            </p>
            <button
              onClick={() => setCancelled(false)}
              className="px-2"
              aria-label="Dismiss"
            >
              ✕
            </button>
          </div>
        )}

        {error && (
          <div className="max-w-2xl mx-auto mb-8 bg-blush text-rose-ink rounded-2xl p-4 text-sm">
            {error}
          </div>
        )}

        {/* Plans Grid */}
        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto mb-24">
          {plans.map((plan, idx) => (
            <FadeIn key={plan.name} delay={idx * 0.06} className="h-full">
              <div
                className={`relative h-full bg-white rounded-3xl p-8 md:p-12 border ${
                  plan.popular ? 'border-periwinkle' : 'border-ash'
                }`}
              >
                {plan.popular && (
                  <div className="absolute -top-3 right-6">
                    <Badge variant="accent">Popular</Badge>
                  </div>
                )}

                <h2 className="text-2xl">{plan.name}</h2>
                <div className="flex items-baseline gap-1 mt-2 mb-2">
                  <span className="text-4xl font-light">{plan.price}</span>
                  <span className="text-sm text-muted-foreground">{plan.period}</span>
                </div>
                <p className="text-sm text-muted-foreground mb-6">{plan.description}</p>

                <Button
                  variant={plan.ctaVariant}
                  className="w-full mb-6"
                  disabled={isLoading !== null}
                  onClick={() => (plan.priceType ? handlePurchase(plan.priceType) : router.push('/#start'))}
                >
                  {plan.priceType && isLoading === plan.priceType ? 'Redirecting...' : plan.cta}
                </Button>

                <ul className="space-y-3 list-disc pl-5">
                  {plan.features.map((feature) => {
                    const soon = COMING_SOON_FEATURES.has(feature);
                    return (
                      <li
                        key={feature}
                        className={`text-sm ${
                          soon
                            ? 'marker:text-fog text-muted-foreground'
                            : 'marker:text-periwinkle'
                        }`}
                      >
                        {feature}
                        {soon && (
                          <Badge variant="default" className="ml-2 align-middle">
                            Coming soon
                          </Badge>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </div>
            </FadeIn>
          ))}
        </div>

        {/* Credit Packs */}
        <FadeIn className="max-w-2xl mx-auto mb-24">
          <p className="text-caption uppercase tracking-wider text-fog-deep text-center mb-2">
            Top-up
          </p>
          <h2 className="text-2xl text-center mb-6">Need just a few credits?</h2>
          <div className="flex justify-center gap-4">
            {creditPacks.map((pack) => (
              <div
                key={pack.credits}
                className="bg-white rounded-3xl p-8 border border-ash text-center"
              >
                <p className="text-3xl font-light mb-1">{pack.credits} Credits</p>
                <p className="text-xl text-aubergine mb-4">{pack.price}</p>
                <Button
                  variant="outline"
                  onClick={() => handlePurchase(pack.priceType)}
                  disabled={isLoading !== null}
                >
                  {isLoading === pack.priceType ? 'Redirecting...' : 'Buy Now'}
                </Button>
              </div>
            ))}
          </div>
        </FadeIn>

        {/* Credit Usage Table */}
        <FadeIn className="max-w-2xl mx-auto">
          <p className="text-caption uppercase tracking-wider text-fog-deep text-center mb-2">
            Ledger
          </p>
          <h2 className="text-xl sm:text-2xl text-center mb-4 sm:mb-6">
            What credits get you
          </h2>

          {(() => {
            const rows = [
              {
                action: 'Compile a tailored resume PDF (includes cover letter + ATS score)',
                credits: '1',
              },
              { action: 'Refine an existing resume', credits: 'Free' },
              { action: 'AI chat editing', credits: 'Free' },
              { action: 'Failed build', credits: 'Free' },
            ];

            return (
              <>
                {/* sm+ : table */}
                <div className="hidden sm:block bg-white rounded-3xl border border-ash overflow-hidden">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-ash bg-bone">
                        <th className="text-left p-4 font-medium text-sm">Action</th>
                        <th className="text-center p-4 font-medium text-sm">Credits</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((row) => (
                        <tr key={row.action} className="border-b border-ash last:border-b-0">
                          <td className="p-4 text-sm">{row.action}</td>
                          <td className="p-4 text-sm font-medium text-center">{row.credits}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* mobile : card list */}
                <div className="sm:hidden space-y-3">
                  {rows.map((row) => (
                    <div
                      key={row.action}
                      className="bg-white rounded-3xl border border-ash p-4 flex items-center justify-between gap-3"
                    >
                      <span className="text-sm leading-snug">
                        {row.action}
                      </span>
                      <span className="text-sm font-medium flex-shrink-0">
                        {row.credits}
                      </span>
                    </div>
                  ))}
                </div>
              </>
            );
          })()}
        </FadeIn>
      </PageShell>

      <Footer />
    </div>
  );
}

/**
 * Pricing page with the Phantom design system.
 * Shows subscription tiers and credit pack purchases.
 */
export default function PricingPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-background">
          <Navbar currentPath="/pricing" />
        </div>
      }
    >
      <PricingContent />
    </Suspense>
  );
}
