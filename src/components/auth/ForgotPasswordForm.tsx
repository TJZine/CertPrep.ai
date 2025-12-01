'use client';

import { useState, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Button, buttonVariants } from '@/components/ui/Button';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/Input';
import { getAuthErrorMessage } from '@/lib/auth-utils';
import Link from 'next/link';
import { useToast } from '@/components/ui/Toast';
import HCaptcha from '@hcaptcha/react-hcaptcha';

export default function ForgotPasswordForm(): React.ReactElement {
  const [email, setEmail] = useState('');
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const captchaRef = useRef<HCaptcha>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);
  const supabase = createClient();
  const { addToast } = useToast();

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    if (!captchaToken) {
      setError('Please complete the captcha');
      setIsLoading(false);
      return;
    }

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/callback?next=/reset-password`,
        captchaToken,
      });

      if (error) {
        setError(getAuthErrorMessage(error));
        captchaRef.current?.resetCaptcha();
        setCaptchaToken(null);
        return;
      }

      setIsSuccess(true);
      addToast('success', 'Password reset link sent!');
    } catch (err) {
      console.error('Unexpected error:', err);
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="space-y-6 text-center">
        <h1 className="text-3xl font-bold">Check Your Email</h1>
        <p className="text-gray-500 dark:text-gray-400">
          We&apos;ve sent a password reset link to <span className="font-medium text-foreground">{email}</span>.
        </p>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Click the link in the email to set a new password.
        </p>
        <Link 
          href="/login" 
          className={cn(buttonVariants({ variant: 'outline' }), "w-full")}
        >
          Return to Login
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2 text-center">
        <h1 className="text-3xl font-bold">Forgot Password</h1>
        <p className="text-gray-500 dark:text-gray-400">
          Enter your email to receive a reset link
        </p>
      </div>
      <form onSubmit={handleSubmit} className="space-y-4">
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

        <div className="flex justify-center">
           {process.env.NEXT_PUBLIC_HCAPTCHA_SITE_KEY ? (
            <HCaptcha
              ref={captchaRef}
              sitekey={process.env.NEXT_PUBLIC_HCAPTCHA_SITE_KEY}
              onVerify={(token) => setCaptchaToken(token)}
              onExpire={() => setCaptchaToken(null)}
            />
          ) : (
            <div className="p-4 border border-red-200 bg-red-50 text-red-700 text-sm rounded-md dark:border-red-800/50 dark:bg-red-900/20 dark:text-red-200">
              Configuration Error: Missing HCaptcha Site Key.
            </div>
          )}
        </div>

        {error && (
          <div className="text-sm text-red-500 font-medium">
            {error}
          </div>
        )}
        <Button type="submit" className="w-full" disabled={isLoading}>
          {isLoading ? 'Sending Link...' : 'Send Reset Link'}
        </Button>
      </form>
      <div className="text-center text-sm">
        <Link href="/login" className="underline underline-offset-4 hover:text-primary">
          Back to Login
        </Link>
      </div>
    </div>
  );
}
