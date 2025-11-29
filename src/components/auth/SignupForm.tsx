'use client';

import { useState, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import Link from 'next/link';
import { useToast } from '@/components/ui/Toast';
import { getAuthErrorMessage } from '@/lib/auth-utils';
import HCaptcha from '@hcaptcha/react-hcaptcha';

export default function SignupForm(): React.ReactElement {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const captchaRef = useRef<HCaptcha>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const supabase = createClient();
  const { addToast } = useToast();

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    if (password !== confirmPassword) {
      setError("Passwords don't match");
      setIsLoading(false);
      return;
    }

    if (!captchaToken) {
      setError('Please complete the captcha');
      setIsLoading(false);
      return;
    }

    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName.trim(),
          },
          captchaToken,
        },
      });

      if (error) {
        setError(getAuthErrorMessage(error));
        captchaRef.current?.resetCaptcha();
        setCaptchaToken(null);
        return;
      }

      addToast('success', 'Account created! Please check your email to confirm.');
      router.push('/login');
    } catch (err) {
      console.error('Unexpected signup error:', err);
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2 text-center">
        <h1 className="text-3xl font-bold">Create an Account</h1>
        <p className="text-gray-500 dark:text-gray-400">
          Enter your email below to create your account
        </p>
      </div>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <label
            htmlFor="fullName"
            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
          >
            Full Name
          </label>
          <Input
            id="fullName"
            placeholder="John Doe"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            disabled={isLoading}
            required
          />
        </div>
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
            minLength={6}
          />
        </div>
        <div className="space-y-2">
          <label
            htmlFor="confirmPassword"
            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
          >
            Confirm Password
          </label>
          <Input
            id="confirmPassword"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            disabled={isLoading}
            required
            minLength={6}
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
            <div className="p-4 border border-red-200 bg-red-50 text-red-700 text-sm rounded-md">
              Configuration Error: Missing HCaptcha Site Key.
              <br />
              Please add <code>NEXT_PUBLIC_HCAPTCHA_SITE_KEY</code> to your .env file.
            </div>
          )}
        </div>

        {error && (
          <div className="text-sm text-red-500 font-medium">
            {error}
          </div>
        )}

        <Button type="submit" className="w-full" disabled={isLoading}>
          {isLoading ? 'Creating account...' : 'Create Account'}
        </Button>
      </form>
      <div className="text-center text-sm">
        Already have an account?{' '}
        <Link href="/login" className="underline underline-offset-4 hover:text-primary">
          Sign in
        </Link>
      </div>
    </div>
  );
}
