import { ReactNode } from 'react';

interface DashboardPageShellProps {
  title: string;
  subtitle: string;
  icon?: string;
  action?: ReactNode;
  children: ReactNode;
}

export default function DashboardPageShell({
  title,
  subtitle,
  icon,
  action,
  children,
}: DashboardPageShellProps) {
  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 rounded-2xl shadow-xl p-8 text-white">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-4xl md:text-5xl font-extrabold mb-2">
              {icon ? `${icon} ` : ''}
              {title}
            </h1>
            <p className="text-xl text-blue-50">{subtitle}</p>
          </div>
          {action}
        </div>
      </div>

      {children}
    </div>
  );
}
