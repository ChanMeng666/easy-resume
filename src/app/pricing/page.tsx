'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Navbar } from '@/components/shared/Navbar';
import { Footer } from '@/components/shared/Footer';
import { Button } from '@/components/ui/button';
import { CheckCircle, Sparkles, Zap, Crown } from 'lucide-react';

const plans = [
  {
    name: 'Free',
    price: '$0',
    period: 'forever',
    description: 'Basic resume building with AI chat',
    icon: Sparkles,
    color: 'bg-gray-100',
    features: [
      'AI-powered resume editor',
      '14 professional LaTeX templates',
      'Overleaf export',
      'Manual editor',
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
 * Pricing page with Neobrutalism design.
 * Shows subscription tiers and credit pack purchases.
 */
export default function PricingPage() {
  const [isLoading, setIsLoading] = useState<string | null>(null);

  const handlePurchase = async (priceType: string) => {
    setIsLoading(priceType);
    try {
      const res = await fetch('/api/credits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ priceType }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      }
    } catch (error) {
      console.error('Purchase error:', error);
    } finally {
      setIsLoading(null);
    }
  };

  return (
    <div className="min-h-screen bg-[#f0f0f0]">
      <Navbar currentPath="/pricing" />

      <main className="pt-20 pb-12 container mx-auto px-4">
        {/* Hero */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center max-w-2xl mx-auto mb-16"
        >
          <h1 className="text-4xl md:text-5xl font-brand mb-4">
            Simple, Transparent Pricing
          </h1>
          <p className="text-lg text-muted-foreground font-medium">
            Free to build. Pay per result when you need AI-powered career tools.
          </p>
        </motion.div>

        {/* Plans Grid */}
        <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto mb-16">
          {plans.map((plan, idx) => (
            <motion.div
              key={plan.name}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1 }}
              className={`relative bg-white rounded-xl p-6 border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,0.9)] ${
                plan.popular ? 'ring-2 ring-purple-500 ring-offset-2' : ''
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 bg-purple-600 text-white text-xs font-black rounded-full border-2 border-black">
                  Most Popular
                </div>
              )}

              <div className={`inline-flex p-3 ${plan.color} rounded-xl mb-4`}>
                <plan.icon className="h-6 w-6" />
              </div>

              <h2 className="text-2xl font-black">{plan.name}</h2>
              <div className="flex items-baseline gap-1 mt-2 mb-2">
                <span className="text-4xl font-black">{plan.price}</span>
                <span className="text-muted-foreground font-medium">{plan.period}</span>
              </div>
              <p className="text-sm text-muted-foreground font-medium mb-6">{plan.description}</p>

              <Button
                variant={plan.ctaVariant}
                className="w-full mb-6"
                disabled={isLoading !== null}
                onClick={() => plan.priceType && handlePurchase(plan.priceType)}
              >
                {isLoading === plan.priceType ? 'Redirecting...' : plan.cta}
              </Button>

              <ul className="space-y-3">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2 text-sm">
                    <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0 mt-0.5" />
                    <span className="font-medium">{feature}</span>
                  </li>
                ))}
              </ul>
            </motion.div>
          ))}
        </div>

        {/* Credit Packs */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="max-w-2xl mx-auto"
        >
          <h2 className="text-2xl font-black text-center mb-6">Need Just a Few Credits?</h2>
          <div className="flex justify-center gap-4">
            {creditPacks.map((pack) => (
              <div
                key={pack.credits}
                className="bg-white rounded-xl p-6 border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,0.9)] text-center"
              >
                <p className="text-3xl font-black mb-1">{pack.credits} Credits</p>
                <p className="text-xl font-black text-purple-600 mb-4">{pack.price}</p>
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
        </motion.div>

        {/* Credit Usage Table */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="max-w-2xl mx-auto mt-16"
        >
          <h2 className="text-2xl font-black text-center mb-6">What Credits Get You</h2>
          <div className="bg-white rounded-xl border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,0.9)] overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b-2 border-black bg-gray-50">
                  <th className="text-left p-4 font-black text-sm">Action</th>
                  <th className="text-center p-4 font-black text-sm">Credits</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { action: 'Resume tailoring to job description', credits: '1' },
                  { action: 'Cover letter generation', credits: '1' },
                  { action: 'ATS optimization report', credits: '1' },
                  { action: 'Basic resume editing (AI chat)', credits: 'Free' },
                ].map((row) => (
                  <tr key={row.action} className="border-b border-gray-100">
                    <td className="p-4 text-sm font-medium">{row.action}</td>
                    <td className="p-4 text-sm font-black text-center">{row.credits}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>
      </main>

      <Footer />
    </div>
  );
}
