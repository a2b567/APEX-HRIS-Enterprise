import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Navbar from './Navbar';
import { Code, ShieldCheck } from 'lucide-react';

export const AppLayout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col antialiased relative">
      {/* Sidebar */}
      <Sidebar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />

      {/* Main Content Area */}
      <div className="lg:pl-64 flex flex-col flex-1 min-h-screen justify-between">
        <Navbar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto pb-12">
          <Outlet />
        </main>

        {/* Global Footer & Developer Watermark */}
        <footer className="border-t border-slate-200/80 bg-white px-4 py-3 text-center sm:text-left sm:px-8 text-xs text-slate-500 flex flex-col sm:flex-row items-center justify-between gap-2 mt-auto">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-700">APEX HRIS Enterprise</span>
            <span className="text-slate-300">•</span>
            <span>© 2026 APEX HRIS Enterprise</span>
          </div>

          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 border border-slate-200 text-[11px] font-mono font-bold text-slate-700 shadow-2xs">
            <Code className="w-3.5 h-3.5 text-blue-600" />
            <span>Devs: LAWRENCE, TAZPER And Group of KOPS</span>
          </div>
        </footer>
      </div>
    </div>
  );
};

export default AppLayout;
