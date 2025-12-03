'use client';

import { useEffect, useMemo, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { getAuthErrorMessage } from '@/lib/auth-utils';
import { useToast } from '@/components/ui/Toast';
import { resetPasswordSchema } from '@/validators/authSchema';
import { ZodError } from 'zod';

type RecoveryParams = {
  type: string | null;
  code: string | null;
  accessToken: string | null;
  refreshToken: string | null;
};

export async function exchangeRecoverySession(
  supabase: ReturnType<typeof createClient>,
  params: RecoveryParams
): Promise<{ success: boolean; error?: string }> {
  if (params.type !== 'recovery') {
    return { success: true };
  }

  if (!supabase) {
    return { success: false, error: 'Authentication service unavailable.' };
  }

  if (!params.code && !params.accessToken) {
    return { success: false, error: 'This recovery link is invalid or has expired. Please request a new password reset email.' };
  }

  try {
    if (params.code) {
      const { error } = await supabase.auth.exchangeCodeForSession(params.code);
      if (error) throw error;
    } else if (params.accessToken && params.refreshToken) {
      const { error } = await supabase.auth.setSession({
        access_token: params.accessToken,
        refresh_token: params.refreshToken,
      });
      if (error) throw error;
    } else {
      throw new Error('Missing recovery tokens');
    }

    return { success: true };
  } catch (err) {
    console.error('Failed to exchange recovery token:', err);
    return { success: false, error: 'This recovery link is invalid or has expired. Please request a new password reset email.' };
  }
}

export default function ResetPasswordForm(): React.ReactElement {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isExchanging, setIsExchanging] = useState(false);
  const [exchangeError, setExchangeError] = useState<string | null>(null);
  const router = useRouter();
  const supabase = createClient();
  const { addToast } = useToast();
  const searchParams = useSearchParams();

  const recoveryParams = useMemo<RecoveryParams>(
    (): RecoveryParams => ({
      type: searchParams?.get('type'),
      code: searchParams?.get('code'),
      accessToken: searchParams?.get('access_token'),
      refreshToken: searchParams?.get('refresh_token'),
    }),
    [searchParams]
  );

  useEffect(() => {
    if (recoveryParams.type !== 'recovery' && !recoveryParams.code && !recoveryParams.accessToken) {
      return;
    }

    let cancelled = false;
    const exchange = async (): Promise<void> => {
      setIsExchanging(true);
      setExchangeError(null);

      try {
        const result = await exchangeRecoverySession(supabase, recoveryParams);
        if (!result.success && !cancelled) {
          setExchangeError(result.error ?? 'This recovery link is invalid or has expired. Please request a new password reset email.');
        }
      } finally {
        if (!cancelled) {
          setIsExchanging(false);
        }
      }
    };

    void exchange();

    return (): void => {
      cancelled = true;
    };
  }, [recoveryParams, supabase]);

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    if (isExchanging) {
      setError('Validating your recovery link. Please wait.');
      setIsLoading(false);
      return;
    }

    if (exchangeError) {
      setIsLoading(false);
      setError(exchangeError);
      return;
    }

    // Validate input
    try {
      resetPasswordSchema.parse({ password, confirmPassword });
    } catch (err) {
      if (err instanceof ZodError) {
        setError((err as ZodError).issues[0]?.message ?? 'Invalid input');
      } else {
        setError('Invalid input');
      }
      setIsLoading(false);
      return;
    }

    if (!supabase) {
      setError('Authentication service unavailable.');
      setIsLoading(false);
      return;
    }

    try {
      const { error } = await supabase.auth.updateUser({
        password: password,
      });

      if (error) {
        setError(getAuthErrorMessage(error));
        return;
      }

      addToast('success', 'Password updated successfully!');
      router.push('/'); // Redirect to dashboard
      router.refresh();
    } catch (err) {
      console.error('Unexpected error:', err);
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2 text-center">
        <h1 className="text-3xl font-bold">Reset Password</h1>
        <p className="text-gray-500 dark:text-gray-400">
          Enter your new password below
        </p>
      </div>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <label
            htmlFor="password"
            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
          >
            New Password
          </label>
          <Input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={isLoading}
            required
            minLength={8}
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
            minLength={8}
          />
        </div>

        {error && (
          <div className="text-sm text-red-500 font-medium">
            {error}
          </div>
        )}
        {isExchanging && (
          <div className="text-sm text-slate-500 font-medium">
            Validating your recovery link...
          </div>
        )}
        {exchangeError && !error && (
          <div className="text-sm text-red-500 font-medium">
            {exchangeError}
          </div>
        )}
        <Button type="submit" className="w-full" disabled={isLoading || isExchanging}>
          {isLoading ? 'Updating...' : 'Update Password'}
        </Button>
      </form>
    </div>
  );
}
