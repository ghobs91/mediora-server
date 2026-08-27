import React, { useEffect, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  KeyRound,
  Loader2,
  ShieldCheck,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

import { apiURL } from '../utils/api-url';
import { setToken } from '../utils/auth';

const steps = [
  { title: 'Secure your server', icon: ShieldCheck },
  { title: 'Connect your services', icon: KeyRound },
  { title: 'Choose preferences', icon: Check },
];

const regions = ['US', 'GB', 'CA', 'AU', 'FR', 'DE', 'ES', 'IT'];
const languages = [
  ['en', 'English'],
  ['fr', 'French'],
  ['de', 'German'],
  ['es', 'Spanish'],
  ['it', 'Italian'],
  ['pt', 'Portuguese'],
  ['ja', 'Japanese'],
];

interface SetupForm {
  password: string;
  confirmPassword: string;
  tmdbApiKey: string;
  jackettApiKey: string;
  region: string;
  language: string;
  organizeLibraryStrategy: 'link' | 'copy' | 'move';
}

const initialForm: SetupForm = {
  password: '',
  confirmPassword: '',
  tmdbApiKey: '',
  jackettApiKey: '',
  region: 'US',
  language: 'en',
  organizeLibraryStrategy: 'link',
};

export default function SetupPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState(initialForm);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [jackettUrl, setJackettUrl] = useState('http://localhost:9117');

  useEffect(() => {
    setJackettUrl(`http://${window.location.hostname}:9117`);
  }, []);

  const update = (values: Partial<SetupForm>) =>
    setForm((current) => ({ ...current, ...values }));

  const validateStep = () => {
    if (step === 0) {
      if (form.password.length < 8) {
        return 'Use a password with at least 8 characters.';
      }
      if (form.password !== form.confirmPassword) {
        return 'The passwords do not match.';
      }
    }

    if (step === 1) {
      if (!form.tmdbApiKey.trim()) return 'Enter your TMDB API key.';
      if (!form.jackettApiKey.trim()) return 'Enter your Jackett API key.';
    }

    return null;
  };

  const next = () => {
    const validationError = validateStep();
    if (validationError) {
      setError(validationError);
      return;
    }
    setError(null);
    setStep((current) => current + 1);
  };

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const validationError = validateStep();
    if (validationError) {
      setError(validationError);
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const response = await fetch(`${apiURL}/setup/complete`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          password: form.password,
          tmdbApiKey: form.tmdbApiKey.trim(),
          jackettApiKey: form.jackettApiKey.trim(),
          region: form.region,
          language: form.language,
          organizeLibraryStrategy: form.organizeLibraryStrategy,
        }),
      });
      const payload = (await response.json()) as {
        token?: string;
        message?: string | string[];
      };

      if (!response.ok || !payload.token) {
        const message = Array.isArray(payload.message)
          ? payload.message.join(', ')
          : payload.message;
        throw new Error(message || 'Setup could not be completed.');
      }

      setToken(payload.token);
      await router.replace('/search');
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : 'Setup could not be completed.'
      );
    } finally {
      setSaving(false);
    }
  };

  const StepIcon = steps[step].icon;

  return (
    <>
      <Head>
        <title>Bobarr - Setup</title>
      </Head>
      <main className="min-h-screen px-6 py-12 sm:py-20">
        <div className="mx-auto flex w-full max-w-3xl flex-col gap-8">
          <header className="flex items-start justify-between gap-6">
            <div>
              <p className="mb-2 font-mono text-sm font-semibold uppercase tracking-[0.3em] text-primary">
                First launch
              </p>
              <h1 className="font-mono text-4xl font-bold tracking-tight sm:text-5xl">
                Set up bobarr
              </h1>
              <p className="mt-3 max-w-xl text-muted-foreground">
                A few essentials now, then your library dashboard is ready.
              </p>
            </div>
            <span className="hidden rounded-full border border-border bg-card px-3 py-1 text-xs text-muted-foreground sm:block">
              Step {step + 1} of {steps.length}
            </span>
          </header>

          <div className="grid gap-2 sm:grid-cols-3">
            {steps.map((item, index) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.title}
                  className={`flex items-center gap-3 rounded-lg border px-4 py-3 text-sm ${
                    index === step
                      ? 'border-primary/60 bg-primary/10 text-foreground'
                      : index < step
                      ? 'border-border bg-card text-foreground'
                      : 'border-border/60 text-muted-foreground'
                  }`}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span>{item.title}</span>
                </div>
              );
            })}
          </div>

          <Card className="border-border/80 bg-card/80 shadow-2xl shadow-black/20">
            <CardHeader>
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/15 text-primary">
                <StepIcon className="h-5 w-5" />
              </div>
              <CardTitle>{steps[step].title}</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={submit} className="flex flex-col gap-6">
                {step === 0 && (
                  <section className="space-y-5">
                    <p className="text-sm leading-6 text-muted-foreground">
                      This password protects the API, download controls, and job
                      dashboard. Store it in your password manager.
                    </p>
                    <div className="grid gap-5 sm:grid-cols-2">
                      <Field label="Admin password" htmlFor="password">
                        <Input
                          id="password"
                          type="password"
                          value={form.password}
                          onChange={({ target }) =>
                            update({ password: target.value })
                          }
                          autoFocus
                        />
                      </Field>
                      <Field label="Confirm password" htmlFor="confirm-password">
                        <Input
                          id="confirm-password"
                          type="password"
                          value={form.confirmPassword}
                          onChange={({ target }) =>
                            update({ confirmPassword: target.value })
                          }
                        />
                      </Field>
                    </div>
                  </section>
                )}

                {step === 1 && (
                  <section className="space-y-5">
                    <p className="text-sm leading-6 text-muted-foreground">
                      Bobarr uses TMDB for metadata and Jackett for indexer
                      searches. Jackett is available at{' '}
                      <a
                        href={jackettUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-primary underline underline-offset-4"
                      >
                        {jackettUrl}
                      </a>
                      . Add your indexers there first, then paste its API key.
                    </p>
                    <Field label="TMDB API key" htmlFor="tmdb-api-key">
                      <Input
                        id="tmdb-api-key"
                        value={form.tmdbApiKey}
                        onChange={({ target }) =>
                          update({ tmdbApiKey: target.value })
                        }
                        autoFocus
                      />
                    </Field>
                    <Field label="Jackett API key" htmlFor="jackett-api-key">
                      <Input
                        id="jackett-api-key"
                        value={form.jackettApiKey}
                        onChange={({ target }) =>
                          update({ jackettApiKey: target.value })
                        }
                      />
                    </Field>
                  </section>
                )}

                {step === 2 && (
                  <section className="space-y-5">
                    <p className="text-sm leading-6 text-muted-foreground">
                      These preferences control metadata search and how completed
                      downloads are placed in your library.
                    </p>
                    <div className="grid gap-5 sm:grid-cols-2">
                      <Field label="Region" htmlFor="region">
                        <select
                          id="region"
                          value={form.region}
                          onChange={({ target }) => update({ region: target.value })}
                          className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm outline-none focus:ring-1 focus:ring-ring"
                        >
                          {regions.map((region) => (
                            <option key={region} value={region} className="bg-card">
                              {region}
                            </option>
                          ))}
                        </select>
                      </Field>
                      <Field label="Language" htmlFor="language">
                        <select
                          id="language"
                          value={form.language}
                          onChange={({ target }) =>
                            update({ language: target.value })
                          }
                          className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm outline-none focus:ring-1 focus:ring-ring"
                        >
                          {languages.map(([value, label]) => (
                            <option key={value} value={value} className="bg-card">
                              {label}
                            </option>
                          ))}
                        </select>
                      </Field>
                    </div>
                    <Field label="Organize completed downloads" htmlFor="strategy">
                      <select
                        id="strategy"
                        value={form.organizeLibraryStrategy}
                        onChange={({ target }) =>
                          update({
                            organizeLibraryStrategy: target.value as SetupForm['organizeLibraryStrategy'],
                          })
                        }
                        className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm outline-none focus:ring-1 focus:ring-ring"
                      >
                        <option value="link" className="bg-card">
                          Link - keep seeding without duplicating files
                        </option>
                        <option value="copy" className="bg-card">
                          Copy - keep seeding with a second copy
                        </option>
                        <option value="move" className="bg-card">
                          Move - use the downloaded file directly
                        </option>
                      </select>
                    </Field>
                    <div className="rounded-lg border border-border bg-secondary/40 p-4 text-sm text-muted-foreground">
                      <strong className="text-foreground">Before searching:</strong>{' '}
                      confirm that your Docker volume contains `library/movies` and
                      `library/tvshows`. VPN configuration remains in
                      `packages/vpn` and is selected when starting the stack.
                    </div>
                  </section>
                )}

                {error && <p className="text-sm text-destructive">{error}</p>}

                <div className="flex items-center justify-between border-t border-border pt-5">
                  {step > 0 ? (
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => {
                        setError(null);
                        setStep((current) => current - 1);
                      }}
                    >
                      <ArrowLeft />
                      Back
                    </Button>
                  ) : (
                    <Link
                      href="/login"
                      className="text-sm text-muted-foreground hover:text-foreground"
                    >
                      Already configured?
                    </Link>
                  )}
                  {step < steps.length - 1 ? (
                    <Button type="button" onClick={next}>
                      Continue
                      <ArrowRight />
                    </Button>
                  ) : (
                    <Button type="submit" disabled={saving}>
                      {saving && <Loader2 className="animate-spin" />}
                      Finish setup
                      {!saving && <Check />}
                    </Button>
                  )}
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </main>
    </>
  );
}

function Field({
  label,
  htmlFor,
  children,
}: {
  label: string;
  htmlFor: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
    </div>
  );
}
