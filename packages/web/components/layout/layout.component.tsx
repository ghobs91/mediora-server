import React from 'react';

import { NavbarComponent } from '../navbar/navbar.component';

export function LayoutComponent({ children }: { children?: React.ReactNode }) {
  return (
    <div className="min-h-screen pt-16">
      <NavbarComponent />
      {children}
    </div>
  );
}
