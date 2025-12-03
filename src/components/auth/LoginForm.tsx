'use client';

import { useState, useRef, useMemo } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { getAuthErrorMessage } from '@/lib/auth-utils';
import Link from 'next/link';
import { useToast } from '@/components/ui/Toast';
import HCaptcha from '@hcaptcha/react-hcaptcha';

export default function LoginForm(): React.ReactElement {
  console.error('LoginForm rendered (debug)');
  const supabase = useMemo(() => createClient(), []);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const captchaRef = useRef<HCaptcha>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const { addToast } = useToast();

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    console.error('LoginForm: handleSubmit called');
    setIsLoading(true);
    setError(null);

    console.log('LoginForm: Checking captcha.');
    // Only validate captcha if the key is present
    if (process.env.NEXT_PUBLIC_HCAPTCHA_SITE_KEY && !captchaToken) {
      console.log('LoginForm: Captcha missing');
      setError('Please complete the captcha');
      setIsLoading(false);
      return;
    }

    if (!supabase) {
      console.log('LoginForm: Supabase client missing');
      setError('Authentication service unavailable. Please contact support.');
      setIsLoading(false);
      return;
    }

    try {
      console.log('LoginForm: Calling signInWithPassword', { email });
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
        options: {
          captchaToken: captchaToken || undefined,
        },
      });
      console.log('LoginForm: signInWithPassword returned', { error });

      if (error) {
        setError(getAuthErrorMessage(error));
        captchaRef.current?.resetCaptcha();
        setCaptchaToken(null);
        return;
      }

      addToast('success', 'Successfully logged in!');
      router.push('/');
    } catch (err) {
      console.error('LoginForm: Unexpected error', err);
      // Handle unexpected errors that aren't Supabase AuthErrors
      // Do not log full error to avoid PII leaks
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2 text-center">
        <h1 className="text-3xl font-bold">Welcome Back</h1>
        <p className="text-gray-500 dark:text-gray-400">
          Enter your credentials to access your account
        </p>
      </div>
      <form 
        onSubmit={handleSubmit} 
        onInvalid={(e) => console.error('Form invalid:', e)}
        className="space-y-4"
      >
        <div className="space-y-2">
          <label
            htmlFor="email"
            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
          >
            Email
          </label>
          <Input
            id="email"
            type="email"
            placeholder="m@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={isLoading}
            required
          />
        </div>
        <div className="space-y-2">
          <label
            htmlFor="password"
            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
          >
            Password
          </label>
          <Input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={isLoading}
            required
          />
        </div>

        <div className="flex justify-center">
          {process.env.NEXT_PUBLIC_HCAPTCHA_SITE_KEY ? (
            <HCaptcha
              ref={captchaRef}
              sitekey={process.env.NEXT_PUBLIC_HCAPTCHA_SITE_KEY}
              onVerify={(token) => setCaptchaToken(token)}
              onExpire={() => setCaptchaToken(null)}
            />
          ) : (
            <div className="text-sm text-gray-500 italic dark:text-gray-400">
              (Captcha disabled in development)
            </div>
          )}
        </div>

        {error && (
          <div className="text-sm text-red-500 font-medium">
            {error}
          </div>
        )}
        <Button
          type="submit"
          className="w-full"
          disabled={isLoading}
        >
          {isLoading ? 'Signing in...' : 'Sign In'}
        </Button>
      </form>
      <div className="text-center text-sm">
        Don&apos;t have an account?{' '}
        <Link href="/signup" className="underline underline-offset-4 hover:text-primary">
          Sign up
        </Link>
      </div>
    </div>
  );
}
