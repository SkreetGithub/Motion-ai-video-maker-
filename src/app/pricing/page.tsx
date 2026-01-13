"use client";

import Link from "next/link";

export default function PricingPage() {
  const plans = [
    {
      name: "Free",
      price: "$0",
      period: "forever",
      features: [
        "Max Duration: 10 min",
        "Resolution: 1080p",
        "Characters: 2",
        "Gallery Storage: 5 videos",
        "Priority Queue: ❌",
        "Commercial Use: ❌",
        "API Access: ❌",
        "Support: Community",
      ],
      cta: "Start Free",
      popular: false,
    },
    {
      name: "Pro",
      price: "$29",
      period: "per month",
      features: [
        "Max Duration: 60 min",
        "Resolution: 4K",
        "Characters: 10",
        "Gallery Storage: 500 videos",
        "Priority Queue: ✅",
        "Commercial Use: ✅",
        "API Access: Limited",
        "Support: Priority",
      ],
      cta: "Try 7 Days Free",
      popular: true,
    },
    {
      name: "Enterprise",
      price: "Custom",
      period: "contact us",
      features: [
        "Max Duration: Unlimited",
        "Resolution: 8K",
        "Characters: 50",
        "Gallery Storage: Unlimited",
        "Priority Queue: ✅",
        "Commercial Use: ✅",
        "API Access: Full",
        "Support: Dedicated",
      ],
      cta: "Contact Sales",
      popular: false,
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-500 via-purple-600 to-pink-500 py-12 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
            Choose Your Plan
          </h1>
          <p className="text-xl text-white/80">
            Upgrade to Pro for advanced features and unlimited creativity
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 mb-12">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={`bg-white/10 backdrop-blur-lg rounded-2xl p-8 border-2 ${
                plan.popular
                  ? "border-white scale-105 shadow-2xl"
                  : "border-white/20"
              } relative`}
            >
              {plan.popular && (
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 bg-white text-purple-600 px-4 py-1 rounded-full text-sm font-bold">
                  Most Popular
                </div>
              )}
              <h3 className="text-2xl font-bold text-white mb-2">{plan.name}</h3>
              <div className="mb-6">
                <span className="text-4xl font-bold text-white">{plan.price}</span>
                {plan.period !== "forever" && (
                  <span className="text-white/60 ml-2">/{plan.period}</span>
                )}
              </div>
              <ul className="space-y-3 mb-8">
                {plan.features.map((feature, index) => (
                  <li key={index} className="text-white/80 flex items-start">
                    <span className="mr-2">
                      {feature.includes("❌") ? "❌" : feature.includes("✅") ? "✅" : "•"}
                    </span>
                    <span>{feature.replace(/[❌✅]/g, "").trim()}</span>
                  </li>
                ))}
              </ul>
              <Link
                href={plan.name === "Enterprise" ? "/contact" : "/create"}
                className={`block w-full text-center py-3 px-6 rounded-lg font-bold transition-all ${
                  plan.popular
                    ? "bg-white text-purple-600 hover:bg-white/90"
                    : "bg-white/20 text-white hover:bg-white/30 border border-white/30"
                }`}
              >
                {plan.cta}
              </Link>
            </div>
          ))}
        </div>

        {/* Pro Features Highlight */}
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 border border-white/20">
          <h2 className="text-3xl font-bold text-white mb-6 text-center">
            ✨ Upgrade to Pro for:
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="text-center">
              <div className="text-4xl mb-2">🎥</div>
              <div className="text-white font-semibold">4K Ultra HD Resolution</div>
            </div>
            <div className="text-center">
              <div className="text-4xl mb-2">⏱️</div>
              <div className="text-white font-semibold">Extended 60+ minute videos</div>
            </div>
            <div className="text-center">
              <div className="text-4xl mb-2">⚡</div>
              <div className="text-white font-semibold">Priority Queue Access</div>
            </div>
            <div className="text-center">
              <div className="text-4xl mb-2">👤</div>
              <div className="text-white font-semibold">Advanced Character Customization</div>
            </div>
            <div className="text-center">
              <div className="text-4xl mb-2">💼</div>
              <div className="text-white font-semibold">Commercial License</div>
            </div>
            <div className="text-center">
              <div className="text-4xl mb-2">🚫</div>
              <div className="text-white font-semibold">No Watermark</div>
            </div>
            <div className="text-center">
              <div className="text-4xl mb-2">👥</div>
              <div className="text-white font-semibold">Team Collaboration</div>
            </div>
            <div className="text-center">
              <div className="text-4xl mb-2">🔌</div>
              <div className="text-white font-semibold">API Access</div>
            </div>
          </div>
          <div className="text-center mt-8">
            <p className="text-white/80 mb-4">
              Starting at $29/month | Try 7 Days Free
            </p>
            <Link
              href="/create"
              className="bg-white text-purple-600 px-8 py-4 rounded-lg font-bold text-lg hover:bg-white/90 transition-all inline-block"
            >
              Start Free Trial
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

