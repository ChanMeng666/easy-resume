'use client';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { Navbar } from '@/components/shared/Navbar';
import { Footer } from '@/components/shared/Footer';
import { Button } from '@/components/ui/button';
import { CropFrame } from '@/components/shared/CropFrame';
import { CheckCircle, Sparkles, Zap, Crown, Info } from 'lucide-react';

const plans = [
  {
    name: 'Free',
    price: '$0',
    period: 'forever',
    description: 'AI resume generation to get you started',
    icon: Sparkles,
    color: 'bg-gray-100',
    features: [
      'AI resume generation from a job description',
      '7 professional Typst templates',
      'ATS compatibility scoring',
      'PDF + cover letter download',
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
    description: '20 credits/month for active job seekers',
    icon: Zap,
    color: 'bg-purple-100',
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
    icon: Crown,
    color: 'bg-cyan-100',
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
    ctaVariant: 'default' as const,
    priceType: 'unlimited_monthly',
  },
];

const creditPacks = [
  { credits: 5, price: '$15', priceType: 'credits_5' },
];

/**
 * Pricing page content with Neobrutalism design.
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
    <div className="min-h-screen baseline-grid bg-[#f0f0f0]">
      <Navbar currentPath="/pricing" />

      <main className="page-shell page-pad-b container mx-auto px-4">
        {/* Hero */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center max-w-2xl mx-auto mb-16"
        >
          <p className="proof-label mb-3">§ Pricing — Pay per result</p>
          <h1 className="text-4xl md:text-5xl font-brand mb-4">
            Sell results, not tools.
          </h1>
          <p className="text-lg text-muted-foreground font-medium">
            Free to build. You&apos;re only charged when a real PDF is composed.
          </p>
        </motion.div>

        {cancelled && (
          <div className="max-w-2xl mx-auto mb-8 flex items-start gap-3 bg-yellow-100 border-2 border-black rounded-xl p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.9)]">
            <Info className="h-5 w-5 flex-shrink-0 text-yellow-800 mt-0.5" />
            <p className="flex-1 text-sm font-bold text-yellow-900">
              Checkout cancelled — no charge was made. You can pick a plan whenever
              you&apos;re ready.
            </p>
            <button
              onClick={() => setCancelled(false)}
              className="text-yellow-900 font-black px-2"
              aria-label="Dismiss"
            >
              ✕
            </button>
          </div>
        )}

        {error && (
          <div className="max-w-2xl mx-auto mb-8 bg-red-100 border-2 border-black rounded-xl p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.9)] text-sm font-bold text-red-900">
            {error}
          </div>
        )}

        {/* Plans Grid */}
        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto mb-20">
          {plans.map((plan, idx) => (
            <motion.div
              key={plan.name}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1 }}
            >
              <CropFrame
                className={`relative h-full bg-white rounded-xl p-6 border-2 border-black ${
                  plan.popular
                    ? 'shadow-[8px_8px_0px_0px_rgba(108,60,233,0.9)]'
                    : 'shadow-[4px_4px_0px_0px_rgba(0,0,0,0.9)]'
                }`}
              >
                {plan.popular && (
                  <div className="absolute -top-3 right-4 px-3 py-1 bg-primary text-white font-mono text-[10px] font-bold uppercase tracking-[0.18em] rounded border-2 border-black">
                    Most Popular
                  </div>
                )}

                <div className="inline-flex p-3 rounded-xl border-2 border-black bg-white mb-4">
                  <plan.icon className="h-6 w-6 text-primary" />
                </div>

                <p className="proof-label mb-1">{`PLAN·${String(idx + 1).padStart(2, '0')}`}</p>
                <h2 className="text-2xl font-black">{plan.name}</h2>
                <div className="flex items-baseline gap-1 mt-2 mb-2">
                  <span className="font-brand text-4xl">{plan.price}</span>
                  <span className="font-mono text-sm text-muted-foreground">{plan.period}</span>
                </div>
                <p className="text-sm text-muted-foreground font-medium mb-6">{plan.description}</p>

                <Button
                  variant={plan.ctaVariant}
                  className="w-full mb-6"
                  disabled={isLoading !== null}
                  onClick={() => (plan.priceType ? handlePurchase(plan.priceType) : router.push('/'))}
                >
                  {plan.priceType && isLoading === plan.priceType ? 'Redirecting...' : plan.cta}
                </Button>

                <ul className="space-y-3">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2 text-sm">
                      <CheckCircle className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
                      <span className="font-medium">{feature}</span>
                    </li>
                  ))}
                </ul>
              </CropFrame>
            </motion.div>
          ))}
        </div>

        {/* Credit Packs */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.2 }}
          className="motion-reveal max-w-2xl mx-auto"
        >
          <p className="proof-label text-center mb-2">§ Top-up</p>
          <h2 className="text-2xl font-black text-center mb-6">Need just a few credits?</h2>
          <div className="flex justify-center gap-4">
            {creditPacks.map((pack) => (
              <CropFrame
                key={pack.credits}
                className="bg-white rounded-xl p-6 border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,0.9)] text-center"
              >
                <p className="proof-label mb-1">{`CR·${String(pack.credits).padStart(3, '0')}`}</p>
                <p className="text-3xl font-black mb-1">{pack.credits} Credits</p>
                <p className="font-brand text-xl text-purple-600 mb-4">{pack.price}</p>
                <Button
                  variant="outline"
                  onClick={() => handlePurchase(pack.priceType)}
                  disabled={isLoading !== null}
                >
                  {isLoading === pack.priceType ? 'Redirecting...' : 'Buy Now'}
                </Button>
              </CropFrame>
            ))}
          </div>
        </motion.div>

        {/* Credit Usage Table */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.2 }}
          className="motion-reveal max-w-2xl mx-auto mt-12 sm:mt-16"
        >
          <p className="proof-label text-center mb-2">§ Ledger</p>
          <h2 className="text-xl sm:text-2xl font-black text-center mb-4 sm:mb-6">
            What credits get you
          </h2>

          {(() => {
            const rows = [
              { action: 'Resume tailoring to job description', credits: '1' },
              { action: 'Cover letter generation', credits: '1' },
              { action: 'ATS optimization report', credits: '1' },
              { action: 'Basic resume editing (AI chat)', credits: 'Free' },
            ];

            return (
              <>
                {/* sm+ : table */}
                <div className="hidden sm:block bg-white rounded-xl border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,0.9)] overflow-hidden">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b-2 border-black bg-gray-50">
                        <th className="text-left p-4 font-black text-sm">Action</th>
                        <th className="text-center p-4 font-black text-sm">Credits</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((row) => (
                        <tr key={row.action} className="border-b border-gray-100">
                          <td className="p-4 text-sm font-medium">{row.action}</td>
                          <td className="p-4 font-mono text-sm font-bold text-center">{row.credits}</td>
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
                      className="bg-white rounded-xl border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,0.9)] p-4 flex items-center justify-between gap-3"
                    >
                      <span className="text-sm font-medium leading-snug">
                        {row.action}
                      </span>
                      <span className="font-mono text-sm font-bold flex-shrink-0">
                        {row.credits}
                      </span>
                    </div>
                  ))}
                </div>
              </>
            );
          })()}
        </motion.div>
      </main>

      <Footer />
    </div>
  );
}

/**
 * Pricing page with Neobrutalism design.
 * Shows subscription tiers and credit pack purchases.
 */
export default function PricingPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen baseline-grid bg-[#f0f0f0]">
          <Navbar currentPath="/pricing" />
        </div>
      }
    >
      <PricingContent />
    </Suspense>
  );
}
