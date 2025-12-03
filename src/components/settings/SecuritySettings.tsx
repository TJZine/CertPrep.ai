'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { useToast } from '@/components/ui/Toast';
import { Shield } from 'lucide-react';
import { getAuthErrorMessage } from '@/lib/auth-utils';
import { resetPasswordSchema } from '@/validators/authSchema';
import { ZodError } from 'zod';

export function SecuritySettings(): React.ReactElement {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const supabase = createClient();
  const { addToast } = useToast();

  const handleUpdatePassword = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

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

      if (error) throw error;

      addToast('success', 'Password updated successfully');
      setPassword('');
      setConfirmPassword('');
    } catch (error) {
        const errMsg = getAuthErrorMessage(error);
        console.error('Error updating password:', error);
        setError(errMsg);
        addToast('error', 'Failed to update password');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="mb-8">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5" />
          Security
        </CardTitle>
        <CardDescription>Manage your account security</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleUpdatePassword} className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="newPassword" className="text-sm font-medium leading-none">
              New Password
            </label>
            <Input
              id="newPassword"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength={8}
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="confirmNewPassword" className="text-sm font-medium leading-none">
              Confirm New Password
            </label>
            <Input
              id="confirmNewPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              minLength={8}
            />
          </div>
          
          {error && (
            <div className="text-sm text-red-500 font-medium">
                {error}
            </div>
          )}

          <div className="flex justify-end">
            <Button type="submit" isLoading={isLoading}>
              Update Password
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
