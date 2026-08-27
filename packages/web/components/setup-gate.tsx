import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { Loader2, RefreshCw } from 'lucide-react';

import { Button } from '@/components/ui/button';

import { apiURL } from '../utils/api-url';
import { getToken } from '../utils/auth';

interface SetupStatus {
  setupRequired: boolean;
}

export function SetupGate({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [status, setStatus] = useState<SetupStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;

    setStatus(null);
    setError(null);

    fetch(`${apiURL}/setup/status`, { credentials: 'include' })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error(`API returned HTTP ${response.status}`);
        }
        return (await response.json()) as SetupStatus;
      })
      .then((nextStatus) => {
        if (!cancelled) setStatus(nextStatus);
      })
      .catch((nextError: unknown) => {
        if (!cancelled) {
          setError(
            nextError instanceof Error
              ? nextError.message
              : 'Unable to reach the API'
          );
        }
      });

    return () => {
      cancelled = true;
    };
  }, [attempt, router.pathname]);

  const destination =
    status?.setupRequired && router.pathname !== '/setup'
      ? '/setup'
      : status && !status.setupRequired && router.pathname === '/setup'
      ? getToken()
        ? '/search'
        : '/login'
      : null;

  useEffect(() => {
    if (destination) void router.replace(destination);
  }, [destination, router]);

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center px-6">
        <div className="flex max-w-sm flex-col items-center gap-4 text-center">
          <p className="text-sm text-muted-foreground">
            Bobarr could not connect to its API. Make sure the stack is running,
            then try again.
          </p>
          <p className="text-xs text-destructive">{error}</p>
          <Button variant="outline" onClick={() => setAttempt((value) => value + 1)}>
            <RefreshCw />
            Retry
          </Button>
        </div>
      </div>
    );
  }

  if (!status || destination) {
    return (
      <div className="flex min-h-screen items-center justify-center text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" />
        <span className="sr-only">Loading setup status</span>
      </div>
    );
  }

  return <>{children}</>;
}
