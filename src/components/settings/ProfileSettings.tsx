"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useAuth } from "@/components/providers/AuthProvider";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/Card";
import { useToast } from "@/components/ui/Toast";
import { User, Mail, AlertCircle } from "lucide-react";
import { getAuthErrorMessage } from "@/lib/auth/authUtils";

export function ProfileSettings(): React.ReactElement {
  const { user } = useAuth();
  const supabase = createClient();
  const { addToast } = useToast();

  return (
    <Card className="mb-8">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <User className="h-5 w-5" />
          Profile
        </CardTitle>
        <CardDescription>Manage your personal information</CardDescription>
      </CardHeader>
      <CardContent>
        <ProfileSettingsForm
          key={user?.id ?? "anonymous"}
          user={user}
          supabase={supabase}
          addToast={addToast}
        />
      </CardContent>
    </Card>
  );
}

function ProfileSettingsForm({
  user,
  supabase,
  addToast,
}: {
  user: { id?: string; email?: string; user_metadata?: { full_name?: string } } | null;
  supabase: ReturnType<typeof createClient> | null;
  addToast: ReturnType<typeof useToast>["addToast"];
}): React.ReactElement {
  const [fullName, setFullName] = useState(user?.user_metadata?.full_name || "");
  const [email, setEmail] = useState(user?.email || "");
  const [isEditingEmail, setIsEditingEmail] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const existingFullName = (user?.user_metadata?.full_name ?? "").trim();
  const nextFullName = fullName.trim();
  const existingEmail = user?.email ?? "";
  const nextEmail = email.trim();

  const hasNameChange =
    nextFullName.length > 0 && nextFullName !== existingFullName;
  const hasEmailChange = isEditingEmail && nextEmail !== existingEmail;
  const hasChanges = hasNameChange || hasEmailChange;
  const isDisabled = !user || isLoading || !hasChanges;

  const handleUpdateProfile = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();

    if (!user) {
      addToast("error", "You must be signed in to update your profile.");
      return;
    }

    const updates: { data?: { full_name: string }; email?: string } = {};
    let message = "Profile updated successfully";

    if (hasNameChange) {
      updates.data = { full_name: nextFullName };
    }

    if (hasEmailChange) {
      updates.email = nextEmail;
      message =
        "Profile updated. Please check both your old and new emails to confirm the change.";
    }

    if (Object.keys(updates).length === 0) {
      setIsEditingEmail(false);
      return;
    }

    setIsLoading(true);

    try {
      if (!supabase) {
        addToast("error", "Authentication service unavailable.");
        throw new Error("Authentication service unavailable.");
      }

      const { error } = await supabase.auth.updateUser(updates);

      if (error) throw error;

      addToast("success", message);
      setIsEditingEmail(false);
    } catch (error) {
      console.error("Error updating profile:", error);
      addToast("error", getAuthErrorMessage(error, "profile"));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleUpdateProfile} className="space-y-4">
      <div className="space-y-2">
        <label
          htmlFor="email"
          className="text-sm font-medium leading-none flex justify-between"
        >
          <span>Email</span>
          {!isEditingEmail && (
            <button
              type="button"
              onClick={() => setIsEditingEmail(true)}
              className="text-xs text-primary hover:underline"
            >
              Change Email
            </button>
          )}
        </label>
        <div className="relative">
          <Input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={!isEditingEmail || isLoading}
            className={!isEditingEmail ? "bg-muted text-muted-foreground" : ""}
          />
          {!isEditingEmail && (
            <Mail className="absolute right-3 top-2.5 h-4 w-4 text-muted-foreground" />
          )}
        </div>
        {isEditingEmail && (
          <div className="rounded-md bg-warning/10 p-3 text-sm text-warning">
            <div className="flex gap-2">
              <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
              <p>
                Changing your email requires re-verification. Confirm the change
                via links sent to <strong>both</strong> your old and new
                addresses; you may be signed out after confirmation.
              </p>
            </div>
          </div>
        )}
      </div>

      <div className="space-y-2">
        <label
          htmlFor="fullName"
          className="text-sm font-medium leading-none"
        >
          Full Name
        </label>
        <Input
          id="fullName"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          placeholder="Your Name"
          disabled={isLoading}
        />
      </div>

      <div className="flex justify-end gap-2">
        {isEditingEmail && (
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              setIsEditingEmail(false);
              setEmail(user?.email || "");
            }}
            disabled={isLoading}
          >
            Cancel
          </Button>
        )}
        <Button type="submit" isLoading={isLoading} disabled={isDisabled}>
          Save Changes
        </Button>
      </div>
    </form>
  );
}
