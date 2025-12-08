import SignupForm from "@/components/auth/SignupForm";
import { Metadata } from "next";
import type { ReactElement } from "react";

export const metadata: Metadata = {
  title: "Sign Up",
  description: "Create a new CertPrep.ai account",
};

export default function SignupPage(): ReactElement {
  return (
    <div className="container flex h-screen w-screen flex-col items-center justify-center">
      <div className="mx-auto flex w-full flex-col justify-center space-y-6 sm:w-[350px]">
        <SignupForm />
      </div>
    </div>
  );
}
