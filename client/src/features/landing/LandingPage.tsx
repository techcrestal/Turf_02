import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

// SHA-256 of "TechCrestal" — plaintext never stored in source
const ADMIN_HASH = 'fb8dc3ec625a5a8e4f361ee16344d4470dbcc86dcd0cd8a7c582d07d62e79604';

async function sha256(text: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

const sports = [
  {
    name: 'Football',
    emoji: '⚽',
    image: 'https://images.unsplash.com/photo-1575361204480-aadea25e6e68?w=600&q=80',
    gradient: 'from-green-600 to-emerald-800',
  },
  {
    name: 'Cricket',
    emoji: '🏏',
    image: 'https://images.unsplash.com/photo-1531415074968-036ba1b575da?w=600&q=80',
    gradient: 'from-yellow-600 to-orange-700',
  },
  {
    name: 'Basketball',
    emoji: '🏀',
    image: 'https://images.unsplash.com/photo-1546519638-68e109498ffc?w=600&q=80',
    gradient: 'from-orange-500 to-red-700',
  },
  {
    name: 'Badminton',
    emoji: '🏸',
    image: 'https://images.unsplash.com/photo-1626224583764-f87db24ac4ea?w=600&q=80',
    gradient: 'from-blue-500 to-indigo-700',
  },
  {
    name: 'Tennis',
    emoji: '🎾',
    image: 'https://images.unsplash.com/photo-1554068865-24cecd4e34b8?w=600&q=80',
    gradient: 'from-lime-500 to-green-700',
  },
  {
    name: 'Swimming',
    emoji: '🏊',
    image: 'https://images.unsplash.com/photo-1530549387789-4c1017266635?w=600&q=80',
    gradient: 'from-cyan-500 to-blue-700',
  },
];

function useCountdown(target: Date) {
  const [time, setTime] = useState({ d: 0, h: 0, m: 0, s: 0 });
  useEffect(() => {
    const tick = () => {
      const diff = Math.max(0, target.getTime() - Date.now());
      setTime({
        d: Math.floor(diff / 86400000),
        h: Math.floor((diff % 86400000) / 3600000),
        m: Math.floor((diff % 3600000) / 60000),
        s: Math.floor((diff % 60000) / 1000),
      });
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [target]);
  return time;
}

function AdminModal({ onClose }: { onClose: () => void }) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [shake, setShake] = useState(false);
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 100);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password) return;
    setLoading(true);
    setError('');
    try {
      const hash = await sha256(password);
      if (hash === ADMIN_HASH) {
        onClose();
        navigate('/login');
      } else {
        setShake(true);
        setError('Incorrect password.');
        setPassword('');
        setTimeout(() => setShake(false), 500);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className={`bg-white rounded-2xl shadow-2xl w-full max-w-sm p-7 ${shake ? 'animate-shake' : ''}`}>
        <div className="text-center mb-6">
          <div className="w-14 h-14 bg-slate-900 rounded-2xl flex items-center justify-center text-2xl mx-auto mb-3">
            🔐
          </div>
          <h2 className="text-xl font-bold text-slate-800">Admin Access</h2>
          <p className="text-slate-400 text-sm mt-1">Enter your admin password to continue</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            ref={inputRef}
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••••••"
            autoComplete="off"
            className="w-full border border-slate-200 rounded-xl px-4 py-3 text-slate-800 text-sm outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition"
          />
          {error && (
            <p className="text-red-500 text-sm text-center bg-red-50 rounded-lg py-2">{error}</p>
          )}
          <button
            type="submit"
            disabled={loading || !password}
            className="w-full bg-slate-900 hover:bg-slate-700 disabled:opacity-40 text-white font-semibold py-3 rounded-xl transition-colors text-sm"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Verifying...
              </span>
            ) : 'Enter'}
          </button>
        </form>

        <button onClick={onClose} className="w-full mt-3 text-slate-400 text-xs hover:text-slate-600 transition">
          Cancel
        </button>
      </div>

      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          20% { transform: translateX(-8px); }
          40% { transform: translateX(8px); }
          60% { transform: translateX(-6px); }
          80% { transform: translateX(6px); }
        }
        .animate-shake { animation: shake 0.4s ease-in-out; }
      `}</style>
    </div>
  );
}

function CountdownBox({ value, label }: { value: number; label: string }) {
  return (
    <div className="flex flex-col items-center">
      <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl w-16 h-16 md:w-20 md:h-20 flex items-center justify-center">
        <span className="text-2xl md:text-3xl font-extrabold text-white tabular-nums">
          {String(value).padStart(2, '0')}
        </span>
      </div>
      <span className="text-white/50 text-xs mt-2 uppercase tracking-widest">{label}</span>
    </div>
  );
}

export default function LandingPage() {
  const [showAdmin, setShowAdmin] = useState(false);
  const [adminClickCount, setAdminClickCount] = useState(0);
  const [activeSport, setActiveSport] = useState(0);

  // Launch date: 30 days from now
  const launchDate = useRef(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000));
  const countdown = useCountdown(launchDate.current);

  // Auto-rotate sport cards
  useEffect(() => {
    const id = setInterval(() => setActiveSport(s => (s + 1) % sports.length), 3000);
    return () => clearInterval(id);
  }, []);

  // Secret admin trigger: logo clicked 3 times
  const handleLogoClick = () => {
    setAdminClickCount(c => {
      const next = c + 1;
      if (next >= 3) { setShowAdmin(true); return 0; }
      return next;
    });
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white overflow-x-hidden">
      {showAdmin && <AdminModal onClose={() => setShowAdmin(false)} />}

      {/* ── Hero Section ── */}
      <div className="relative min-h-screen flex flex-col">
        {/* Background image with overlay */}
        <div className="absolute inset-0">
          <img
            src={sports[activeSport].image}
            alt={sports[activeSport].name}
            className="w-full h-full object-cover transition-opacity duration-1000"
            style={{ opacity: 0.25 }}
          />
          <div className="absolute inset-0 bg-gradient-to-b from-slate-950/80 via-slate-950/60 to-slate-950" />
        </div>

        {/* Navbar */}
        <nav className="relative z-10 flex items-center justify-between px-6 md:px-12 py-6">
          <button onClick={handleLogoClick} className="flex items-center gap-3 select-none">
            <div className="w-10 h-10 bg-emerald-500 rounded-xl flex items-center justify-center text-xl">
              🏟️
            </div>
            <span className="text-xl font-extrabold tracking-tight">SquadEazy</span>
          </button>
          <button
            onClick={() => setShowAdmin(true)}
            className="text-sm text-slate-400 hover:text-white border border-slate-700 hover:border-slate-400 px-4 py-2 rounded-xl transition-all"
          >
            Admin →
          </button>
        </nav>

        {/* Hero content */}
        <div className="relative z-10 flex-1 flex flex-col items-center justify-center text-center px-6 pb-24">
          {/* Sport badge */}
          <div className={`inline-flex items-center gap-2 bg-gradient-to-r ${sports[activeSport].gradient} px-4 py-1.5 rounded-full text-sm font-semibold mb-6 transition-all duration-500`}>
            <span>{sports[activeSport].emoji}</span>
            <span>{sports[activeSport].name}</span>
          </div>

          <h1 className="text-5xl md:text-7xl lg:text-8xl font-extrabold tracking-tighter leading-none mb-4">
            <span className="text-white">Turf</span>
            <span className="text-emerald-400">Book</span>
          </h1>

          <p className="text-2xl md:text-3xl font-light text-white/80 mb-3">
            Book. Play. <span className="text-emerald-400 font-semibold">Win.</span>
          </p>

          <p className="text-lg md:text-xl font-bold text-white/60 mb-10 tracking-widest uppercase">
            ✦ We are coming live soon ✦
          </p>

          {/* Countdown */}
          <div className="flex items-end gap-4 md:gap-6 mb-12">
            <CountdownBox value={countdown.d} label="Days" />
            <span className="text-white/30 text-2xl font-bold mb-4">:</span>
            <CountdownBox value={countdown.h} label="Hours" />
            <span className="text-white/30 text-2xl font-bold mb-4">:</span>
            <CountdownBox value={countdown.m} label="Mins" />
            <span className="text-white/30 text-2xl font-bold mb-4">:</span>
            <CountdownBox value={countdown.s} label="Secs" />
          </div>

          {/* Email notify */}
          <div className="flex flex-col sm:flex-row gap-3 w-full max-w-md">
            <input
              type="email"
              placeholder="Enter your email to get notified"
              className="flex-1 bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-white/40 text-sm outline-none focus:border-emerald-400 transition"
            />
            <button className="bg-emerald-500 hover:bg-emerald-400 text-white font-semibold px-6 py-3 rounded-xl transition-colors text-sm whitespace-nowrap">
              Notify Me
            </button>
          </div>
        </div>

        {/* Scroll indicator */}
        <div className="relative z-10 flex justify-center pb-8 animate-bounce">
          <span className="text-white/30 text-2xl">↓</span>
        </div>
      </div>

      {/* ── Sports Grid ── */}
      <section className="px-6 md:px-12 py-20">
        <div className="text-center mb-12">
          <p className="text-emerald-400 text-sm font-semibold uppercase tracking-widest mb-3">What We Offer</p>
          <h2 className="text-4xl md:text-5xl font-extrabold tracking-tight">
            Every Sport. <span className="text-emerald-400">One Platform.</span>
          </h2>
          <p className="text-slate-400 mt-4 max-w-xl mx-auto">
            Find and book the best sports venues in your city. From football turfs to badminton courts — we've got you covered.
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 max-w-5xl mx-auto">
          {sports.map((sport, i) => (
            <div
              key={sport.name}
              className={`relative group rounded-2xl overflow-hidden cursor-pointer transition-transform hover:scale-105 ${i === activeSport ? 'ring-2 ring-emerald-400' : ''}`}
              onClick={() => setActiveSport(i)}
            >
              <img
                src={sport.image}
                alt={sport.name}
                className="w-full h-40 md:h-52 object-cover group-hover:scale-110 transition-transform duration-500"
              />
              <div className={`absolute inset-0 bg-gradient-to-t ${sport.gradient} opacity-60`} />
              <div className="absolute inset-0 flex flex-col items-center justify-end pb-4">
                <span className="text-3xl mb-1">{sport.emoji}</span>
                <span className="text-white font-bold text-sm md:text-base">{sport.name}</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Features ── */}
      <section className="px-6 md:px-12 py-20 bg-slate-900/50">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <p className="text-emerald-400 text-sm font-semibold uppercase tracking-widest mb-3">Why SquadEazy</p>
            <h2 className="text-4xl md:text-5xl font-extrabold tracking-tight">
              Built for <span className="text-emerald-400">Players</span>
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { icon: '⚡', title: 'Instant Booking', desc: 'Book your favourite turf in seconds. No calls, no waiting. Just pick a slot and play.' },
              { icon: '🌍', title: 'Public Games', desc: 'Join open games in your area or create your own public match and find players to fill your team.' },
              { icon: '🔒', title: 'Private Sessions', desc: 'Invite only your friends for a private game. Full control over who plays.' },
              { icon: '💳', title: 'Seamless Payments', desc: 'Pay your entry fee or booking fee in one tap. Secure and instant.' },
              { icon: '🏆', title: 'All Sports', desc: 'Football, cricket, badminton, basketball, tennis and more — find courts for every sport.' },
              { icon: '📱', title: 'Mobile First', desc: 'Designed from the ground up for your phone. Fast, smooth and beautiful.' },
            ].map((f) => (
              <div key={f.title} className="bg-white/5 border border-white/10 rounded-2xl p-6 hover:bg-white/10 transition-colors">
                <div className="text-3xl mb-4">{f.icon}</div>
                <h3 className="text-white font-bold text-lg mb-2">{f.title}</h3>
                <p className="text-slate-400 text-sm leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Coming Soon Banner ── */}
      <section className="relative py-24 px-6 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-900/40 to-slate-950" />
        <div className="relative z-10 text-center max-w-3xl mx-auto">
          <div className="text-6xl mb-6">🚀</div>
          <h2 className="text-4xl md:text-6xl font-extrabold tracking-tight mb-4">
            We are coming <span className="text-emerald-400">live soon</span>
          </h2>
          <p className="text-slate-300 text-lg md:text-xl mb-8 leading-relaxed">
            We're putting the finishing touches on something amazing. SquadEazy will transform how India books and plays sports. Stay tuned.
          </p>
          <div className="flex flex-wrap justify-center gap-4 text-sm text-slate-400">
            <span className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />Real-time availability</span>
            <span className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />Instant confirmation</span>
            <span className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />Find nearby players</span>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-white/10 px-6 md:px-12 py-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 max-w-5xl mx-auto">
          <div className="flex items-center gap-2">
            <span className="text-xl">🏟️</span>
            <span className="font-bold">SquadEazy</span>
            <span className="text-slate-500 text-sm ml-2">© 2026</span>
          </div>
          <p className="text-slate-500 text-sm">Book your turf. Play your game.</p>
          <button
            onClick={() => setShowAdmin(true)}
            className="text-slate-600 hover:text-slate-400 text-xs transition-colors"
          >
            Admin Portal
          </button>
        </div>
      </footer>
    </div>
  );
}
