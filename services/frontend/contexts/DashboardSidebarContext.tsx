'use client';

import { createContext, ReactNode, useContext } from 'react';

interface DashboardSidebarContextValue {
  setSidebarControls: (controls: ReactNode | null) => void;
}

const DashboardSidebarContext = createContext<DashboardSidebarContextValue | null>(null);

export function DashboardSidebarProvider({
  children,
  setSidebarControls,
}: {
  children: ReactNode;
  setSidebarControls: (controls: ReactNode | null) => void;
}) {
  return (
    <DashboardSidebarContext.Provider value={{ setSidebarControls }}>
      {children}
    </DashboardSidebarContext.Provider>
  );
}

export function useDashboardSidebarControls() {
  const context = useContext(DashboardSidebarContext);

  if (!context) {
    return { setSidebarControls: () => undefined };
  }

  return context;
}
