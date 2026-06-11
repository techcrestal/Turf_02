import { Outlet } from 'react-router-dom';
import BottomNav from './BottomNav';
import Sidebar from './Sidebar';

export default function AppLayout() {
  return (
    <div className="min-h-screen flex">
      {/* Sidebar — desktop only */}
      <div className="hidden lg:flex lg:w-64 lg:flex-shrink-0 lg:flex-col lg:fixed lg:inset-y-0 lg:z-40 lg:border-r lg:border-slate-100">
        <Sidebar />
      </div>

      {/* Page content */}
      <div className="flex-1 flex flex-col min-h-screen lg:pl-64">
        {/* Mobile: centred card; Desktop: full-width */}
        <main className="flex-1 w-full
                         max-w-md mx-auto pb-20 bg-white shadow-sm
                         lg:max-w-full lg:mx-0 lg:pb-0 lg:bg-slate-50 lg:shadow-none">
          <Outlet />
        </main>
      </div>

      {/* Bottom nav — mobile only */}
      <div className="lg:hidden">
        <BottomNav />
      </div>
    </div>
  );
}
