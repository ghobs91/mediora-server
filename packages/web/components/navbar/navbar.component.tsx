import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { Menu, X } from 'lucide-react';

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
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  useEffect(() => {
    setIsAuthenticated(Boolean(getToken()));
  }, []);

  useEffect(() => {
    setIsMenuOpen(false);
  }, [router.pathname]);

  const handleLogout = () => {
    clearToken();
    router.push('/login');
  };

  const authAction = isAuthenticated ? (
    <button
      onClick={handleLogout}
      className="rounded-md px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
    >
      Logout
    </button>
  ) : isAuthenticated === false ? (
    <Link
      href="/login"
      className="rounded-md px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
    >
      Login
    </Link>
  ) : null;

  return (
    <nav className="fixed inset-x-0 top-0 z-40 flex h-16 items-center gap-2 border-b border-border bg-card/80 px-4 backdrop-blur md:px-12">
      <Link
        href="/search"
        className="mr-2 shrink-0 font-mono text-lg font-bold tracking-tight sm:text-xl md:mr-10 md:text-2xl"
      >
        mediora-server
      </Link>
      <div className="hidden items-center gap-1 md:flex">
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
      <div className="ml-auto flex items-center gap-2 sm:gap-3">
        <div className="rounded-md border border-border px-2 py-1.5 text-xs text-muted-foreground sm:px-3">
          {data?.params?.region || 'US'}
        </div>
        {authAction}
        <button
          type="button"
          onClick={() => setIsMenuOpen((open) => !open)}
          aria-label={isMenuOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={isMenuOpen}
          className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground md:hidden"
        >
          {isMenuOpen ? (
            <X className="h-5 w-5" />
          ) : (
            <Menu className="h-5 w-5" />
          )}
        </button>
      </div>

      {isMenuOpen && (
        <div className="absolute inset-x-0 top-16 flex flex-col gap-1 border-b border-border bg-card/95 p-4 backdrop-blur md:hidden">
          {links.map(([name, url]) => (
            <Link
              key={url}
              href={url}
              className={cn(
                'rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground',
                router.pathname === url && 'bg-accent text-foreground'
              )}
            >
              {name}
            </Link>
          ))}
        </div>
      )}
    </nav>
  );
}
