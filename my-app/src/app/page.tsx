export default function HomePage() {
  return (
    <main className="min-h-screen bg-black text-white">
      {/* Header */}
      <header className="fixed top-0 left-0 w-full border-b border-zinc-800 bg-black/80 backdrop-blur-md z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">

          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white text-black flex items-center justify-center font-bold text-lg">
              EE
            </div>

            <div>
              <h1 className="text-xl font-bold">
                EE Studio
              </h1>

              <p className="text-xs text-zinc-400">
                Premium Playmate Platform
              </p>
            </div>
          </div>

          {/* Navigation */}
          <nav className="hidden md:flex items-center gap-8">
            <a href="#">Home</a>
            <a href="#">Playmate</a>
            <a href="#">About Us</a>
            <a href="#">Appointment</a>
            <a href="#">Contact Us</a>
          </nav>

          {/* Login */}
          <button className="px-5 py-2 rounded-xl bg-white text-black font-semibold">
            Login
          </button>
        </div>
      </header>

      {/* Hero */}
      <section className="flex items-center justify-center min-h-screen text-center px-6">
        <div>
          <p className="uppercase tracking-[0.3em] text-zinc-400 mb-4">
            Welcome to EE Studio
          </p>

          <h1 className="text-6xl font-black mb-6">
            Find Your Perfect
            <span className="block text-zinc-400">
              Gaming Playmate
            </span>
          </h1>

          <p className="text-zinc-400 text-lg max-w-2xl mx-auto mb-10">
            Connect with professional playmates for Valorant,
            CS2, League of Legends, Apex and more.
          </p>

          <div className="flex gap-4 items-center justify-center">
            <button className="px-8 py-4 rounded-2xl bg-white text-black font-bold">
              Explore Playmates
            </button>

            <button className="px-8 py-4 rounded-2xl border border-zinc-700">
              Book Appointment
            </button>
          </div>
        </div>
      </section>
    </main>
  );
}