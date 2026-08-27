import '@/styles/globals.css';
import type { AppProps } from 'next/app';
import { Toaster } from '@/components/ui/toaster';
import { SetupGate } from '@/components/setup-gate';

export default function App({ Component, pageProps }: AppProps) {
  return (
    <SetupGate>
      <Component {...pageProps} />
      <Toaster />
    </SetupGate>
  );
}
