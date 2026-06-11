import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Topbar from './Topbar';

export default function DashboardLayout() {
  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto flex min-h-screen max-w-[1600px] gap-6 px-4 py-5 xl:px-8">
        <div className="hidden w-80 shrink-0 xl:block">
          <Sidebar />
        </div>
        <main className="flex-1 space-y-6">
          <Topbar />
          <div className="space-y-6">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
