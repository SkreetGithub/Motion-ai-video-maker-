import Link from "next/link";

export default function Footer() {
  return (
    <footer className="bg-black/20 backdrop-blur-lg border-t border-white/20 mt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div>
            <div className="flex items-center space-x-2 mb-4">
              <span className="text-2xl">🎬</span>
              <span className="text-xl font-bold text-white">Motion AI</span>
            </div>
            <p className="text-white/60 text-sm">
              Create professional, cinematic AI videos with character consistency and Hollywood-quality visuals.
            </p>
          </div>
          
          <div>
            <h3 className="text-white font-semibold mb-4">Product</h3>
            <ul className="space-y-2">
              <li>
                <Link href="/create" className="text-white/60 hover:text-white text-sm">
                  Create Video
                </Link>
              </li>
              <li>
                <Link href="/gallery" className="text-white/60 hover:text-white text-sm">
                  Gallery
                </Link>
              </li>
              <li>
                <Link href="/pricing" className="text-white/60 hover:text-white text-sm">
                  Pricing
                </Link>
              </li>
            </ul>
          </div>
          
          <div>
            <h3 className="text-white font-semibold mb-4">Resources</h3>
            <ul className="space-y-2">
              <li>
                <Link href="/docs" className="text-white/60 hover:text-white text-sm">
                  Documentation
                </Link>
              </li>
              <li>
                <Link href="/tutorials" className="text-white/60 hover:text-white text-sm">
                  Tutorials
                </Link>
              </li>
              <li>
                <Link href="/community" className="text-white/60 hover:text-white text-sm">
                  Community
                </Link>
              </li>
            </ul>
          </div>
          
          <div>
            <h3 className="text-white font-semibold mb-4">Company</h3>
            <ul className="space-y-2">
              <li>
                <Link href="/contact" className="text-white/60 hover:text-white text-sm">
                  Contact Sales
                </Link>
              </li>
              <li>
                <Link href="/about" className="text-white/60 hover:text-white text-sm">
                  About
                </Link>
              </li>
              <li>
                <Link href="/blog" className="text-white/60 hover:text-white text-sm">
                  Blog
                </Link>
              </li>
            </ul>
          </div>
        </div>
        
        <div className="mt-8 pt-8 border-t border-white/20 text-center">
          <p className="text-white/60 text-sm">
            Trusted by 10,000+ creators, filmmakers, and businesses worldwide.
          </p>
          <p className="text-white/40 text-xs mt-2">
            © 2024 Motion AI. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}

