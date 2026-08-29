import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';

import { useGetParamsQuery } from '../../utils/graphql';
import { clearToken, getToken } from '../../utils/auth';
import { cn } from '@/lib/utils';

const links = [
  ['Movies', '/library/movies'],
  ['TV Shows', '/library/tvshows'],
  ['Search', '/search'],
  ['Downloads', '/downloads'],
  ['Discover', '/discover'],
  ['Suggestions', '/suggestions'],
  ['Calendar', '/calendar'],
  ['Settings', '/settings'],
];

export function NavbarComponent() {
  const router = useRouter();
  const { data } = useGetParamsQuery();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  useEffect(() => {
    setIsAuthenticated(Boolean(getToken()));
  }, []);

  const handleLogout = () => {
    clearToken();
    router.push('/login');
  };

  return (
    <nav className="fixed inset-x-0 top-0 z-40 flex h-16 items-center gap-2 border-b border-border bg-card/80 px-12 backdrop-blur">
      <Link
        href="/search"
        className="mr-10 font-mono text-2xl font-bold tracking-tight"
      >
        bobarr
      </Link>
      <div className="flex items-center gap-1">
        {links.map(([name, url]) => (
          <Link
            key={url}
            href={url}
            className={cn(
              'rounded-md px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground',
              router.pathname === url && 'bg-accent text-foreground'
            )}
          >
            {name}
          </Link>
        ))}
      </div>
      <div className="ml-auto flex items-center gap-3">
        <div className="rounded-md border border-border px-3 py-1.5 text-xs text-muted-foreground">
          {data?.params?.region || 'US'}
        </div>
        {isAuthenticated === false && (
          <Link
            href="/login"
            className="rounded-md px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            Login
          </Link>
        )}
        {isAuthenticated && (
          <button
            onClick={handleLogout}
            className="rounded-md px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            Logout
          </button>
        )}
      </div>
    </nav>
  );
}
