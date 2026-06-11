import { ReactNode } from 'react';

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <div className="mx-auto flex min-h-screen max-w-5xl items-center justify-center px-4 py-12">
        <div className="w-full rounded-[32px] bg-slate-900/95 p-10 shadow-2xl shadow-slate-950/20 backdrop-blur-xl sm:p-12">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-white">Turf Community</h1>
            <p className="mt-2 text-slate-400">Log in with your phone and join games across turfs.</p>
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}
