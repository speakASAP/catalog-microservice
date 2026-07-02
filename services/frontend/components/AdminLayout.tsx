'use client';

/**
 * Dashboard Layout Component
 * Provides sidebar navigation and layout for authenticated catalog users
 */

import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { hasCatalogAdminAccess } from './AdminGuard';
import { useState } from 'react';

interface AdminLayoutProps {
  children: React.ReactNode;
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const canAccessAdminSection = hasCatalogAdminAccess(user?.email);

  const handleLogout = () => {
    logout();
    router.push('/');
  };

  const menuItems = [
    {
      title: 'Dashboard',
      href: '/dashboard',
      icon: '📊',
    },
    {
      title: 'Products',
      href: '/dashboard/products',
      icon: '📦',
    },
    {
      title: 'Categories',
      href: '/dashboard/categories',
      icon: '📁',
    },
    {
      title: 'Attributes',
      href: '/dashboard/attributes',
      icon: '🏷️',
    },
    ...(canAccessAdminSection
      ? [
          {
            title: 'Admin',
            href: '/dashboard/admin',
            icon: '⚙️',
          },
        ]
      : []),
  ];

  const isActive = (href: string) => {
    if (href === '/dashboard') {
      return pathname === '/dashboard';
    }
    return pathname.startsWith(href);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-indigo-50/30">
      {/* Mobile sidebar toggle */}
      <div className="lg:hidden bg-white/95 backdrop-blur-md shadow-lg border-b border-gray-200 px-3 py-3 flex items-center justify-between sticky top-0 z-40">
        <Link href="/dashboard" className="text-base font-extrabold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
          Catalog Dashboard
        </Link>
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="p-1.5 rounded-lg text-gray-600 hover:bg-blue-50 transition-all"
        >
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 6h16M4 12h16M4 18h16"
            />
          </svg>
        </button>
      </div>

      <div className="flex">
        {/* Sidebar */}
        <aside
          className={`${
            sidebarOpen ? 'translate-x-0' : '-translate-x-full'
          } lg:translate-x-0 fixed lg:static inset-y-0 left-0 z-50 w-44 bg-white/95 backdrop-blur-md border-r border-gray-200 shadow-xl transition-transform duration-300 ease-in-out`}
        >
          <div className="h-full flex flex-col">
            {/* Logo/Header */}
            <div className="p-3 border-b border-gray-200 bg-gradient-to-r from-blue-600 to-indigo-600">
              <Link href="/dashboard" className="flex items-center gap-2">
                <span className="text-base font-extrabold leading-tight text-white">
                  📦 Catalog Dashboard
                </span>
              </Link>
              <p className="text-xs text-blue-100 mt-1 truncate">
                catalog.alfares.cz
              </p>
            </div>

            {/* Navigation */}
            <nav className="flex-1 overflow-y-auto p-2">
              <ul className="space-y-1.5">
                {menuItems.map((item) => (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      onClick={() => setSidebarOpen(false)}
                      className={`flex items-center gap-2 px-2.5 py-2 rounded-lg text-sm transition-all ${
                        isActive(item.href)
                          ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold shadow-md'
                          : 'text-gray-700 hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50 hover:shadow-md'
                      }`}
                    >
                      <span className="text-base">{item.icon}</span>
                      <span>{item.title}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>

            {/* User info and logout */}
            <div className="p-2 border-t border-gray-200 bg-gradient-to-br from-gray-50 to-blue-50/50">
              <button
                type="button"
                onClick={() => canAccessAdminSection ? router.push('/dashboard/admin') : undefined}
                className={`mb-2 w-full p-2 bg-white rounded-lg shadow-sm border border-gray-200 text-left transition-all ${canAccessAdminSection ? 'hover:border-blue-300 hover:shadow-md cursor-pointer' : 'cursor-default'}`}
              >
                <p className="text-xs font-bold text-gray-900 truncate">
                  {user?.firstName || user?.email}
                </p>
                <p className="text-[11px] text-gray-500 mt-1 truncate">{user?.email}</p>
              {canAccessAdminSection && (
                  <span className="mt-2 inline-flex text-[11px] font-semibold text-blue-700">Open admin section</span>
                )}
              </button>
              <button
                onClick={handleLogout}
                className="w-full px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 rounded-lg transition-all border border-red-200 hover:border-red-300"
              >
                🚪 Logout
              </button>
            </div>
          </div>
        </aside>

        {/* Overlay for mobile */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Main content */}
        <main className="flex-1 lg:ml-0 min-h-screen">
          <div className="p-4 lg:p-5">{children}</div>
        </main>
      </div>
    </div>
  );
}

