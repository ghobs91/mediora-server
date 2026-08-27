import React, { ReactNode } from 'react';

interface DiscoverFilterSectionComponentProps {
  title?: string;
  children: ReactNode;
}

export function DiscoverFilterSectionComponent(
  props: DiscoverFilterSectionComponentProps
) {
  const { title, children } = props;

  return (
    <div className="mb-4">
      {title && (
        <div className="mb-2 text-sm font-normal text-muted-foreground">
          {title}
        </div>
      )}
      {children}
    </div>
  );
}
