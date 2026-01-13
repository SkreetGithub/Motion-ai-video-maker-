"use client";

import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-500 via-purple-600 to-pink-500">
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-32">
          <div className="text-center">
            <h1 className="text-5xl md:text-7xl font-bold text-white mb-6 leading-tight">
              Transform Your Imagination
              <br />
              Into Cinematic Reality
            </h1>
            <p className="text-xl md:text-2xl text-white/90 mb-8 max-w-3xl mx-auto">
              Create professional, long-form AI videos with consistent characters, 
              Hollywood-style cinematography, and seamless storytelling—no technical expertise required.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Link
                href="/create"
                className="bg-white text-purple-600 px-8 py-4 rounded-lg font-bold text-lg hover:bg-white/90 transition-all transform hover:scale-105 shadow-2xl"
              >
                🎬 Start Creating Your Movie (Free Trial)
              </Link>
              <Link
                href="#demo"
                className="bg-white/20 backdrop-blur-lg text-white px-8 py-4 rounded-lg font-bold text-lg hover:bg-white/30 transition-all border border-white/30"
              >
                📽️ Watch Demo Video →
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <h2 className="text-4xl font-bold text-white text-center mb-12">
          Powerful Features for Professional Results
        </h2>
        
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {/* Feature 1 */}
          <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
            <div className="text-4xl mb-4">🎥</div>
            <h3 className="text-2xl font-bold text-white mb-3">
              Professional Cinematic Quality
            </h3>
            <p className="text-white/80 mb-4">
              Hollywood-Grade Video Production
            </p>
            <ul className="space-y-2 text-white/70 text-sm">
              <li>• Roger Deakins-inspired cinematography</li>
              <li>• ARRI Alexa camera simulation</li>
              <li>• Christopher Nolan film style</li>
              <li>• 4K resolution with temporal consistency</li>
              <li>• Professional color grading & lighting</li>
            </ul>
          </div>

          {/* Feature 2 */}
          <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
            <div className="text-4xl mb-4">👤</div>
            <h3 className="text-2xl font-bold text-white mb-3">
              Character Consistency System
            </h3>
            <p className="text-white/80 mb-4">
              Your Characters, Never Forgetting Who They Are
            </p>
            <ul className="space-y-2 text-white/70 text-sm">
              <li>• Lock character appearances across scenes</li>
              <li>• Maintain personality and visual details</li>
              <li>• Reference image support</li>
              <li>• Multi-character interaction handling</li>
            </ul>
          </div>

          {/* Feature 3 */}
          <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
            <div className="text-4xl mb-4">🧠</div>
            <h3 className="text-2xl font-bold text-white mb-3">
              Smart Multi-Model Engine
            </h3>
            <p className="text-white/80 mb-4">
              Intelligent Model Selection & Fallback
            </p>
            <ul className="space-y-2 text-white/70 text-sm">
              <li>• Automatic model fallback system</li>
              <li>• Cost-optimized selection</li>
              <li>• 4 AI models available</li>
              <li>• Circuit breaker for reliability</li>
            </ul>
          </div>

          {/* Feature 4 */}
          <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
            <div className="text-4xl mb-4">⏱️</div>
            <h3 className="text-2xl font-bold text-white mb-3">
              Long-Form Video Creation
            </h3>
            <p className="text-white/80 mb-4">
              Create Movies Up To 60 Minutes
            </p>
            <ul className="space-y-2 text-white/70 text-sm">
              <li>• Scene-by-scene generation</li>
              <li>• Automatic story continuity</li>
              <li>• Smooth transitions between scenes</li>
              <li>• Parallel processing for speed</li>
            </ul>
          </div>

          {/* Feature 5 */}
          <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
            <div className="text-4xl mb-4">🎨</div>
            <h3 className="text-2xl font-bold text-white mb-3">
              Content Type Selection
            </h3>
            <p className="text-white/80 mb-4">
              What Are You Creating Today?
            </p>
            <ul className="space-y-2 text-white/70 text-sm">
              <li>• Short Film / Narrative</li>
              <li>• Educational / Explainer</li>
              <li>• Game Cinematic / Trailer</li>
              <li>• Social Media Content</li>
              <li>• Corporate / Training</li>
            </ul>
          </div>

          {/* Feature 6 */}
          <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
            <div className="text-4xl mb-4">⚡</div>
            <h3 className="text-2xl font-bold text-white mb-3">
              Production Ready
            </h3>
            <p className="text-white/80 mb-4">
              Built for Scale & Reliability
            </p>
            <ul className="space-y-2 text-white/70 text-sm">
              <li>• Real-time progress tracking</li>
              <li>• Error handling & recovery</li>
              <li>• Cloud storage integration</li>
              <li>• Team collaboration tools</li>
            </ul>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center">
        <div className="bg-white/10 backdrop-blur-lg rounded-3xl p-12 border border-white/20">
          <h2 className="text-4xl font-bold text-white mb-6">
            Ready to Create Something Amazing?
          </h2>
          <p className="text-xl text-white/80 mb-8">
            Join 10,000+ creators, filmmakers, and businesses worldwide
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/create"
              className="bg-white text-purple-600 px-8 py-4 rounded-lg font-bold text-lg hover:bg-white/90 transition-all"
            >
              🎬 Start Free Trial (No credit card)
            </Link>
            <Link
              href="/gallery"
              className="bg-white/20 backdrop-blur-lg text-white px-8 py-4 rounded-lg font-bold text-lg hover:bg-white/30 transition-all border border-white/30"
            >
              📚 View Gallery
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
