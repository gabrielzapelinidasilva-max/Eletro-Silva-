import type { Metadata } from "next";
import { Logo } from "@/components/logo";
import { ResetForm } from "./reset-form";

export const metadata: Metadata = { title: "Nova senha" };

export default function ResetPage() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-4 py-10">
      <Logo showSlogan className="mb-6" />
      <div className="w-full max-w-sm">
        <ResetForm />
      </div>
    </div>
  );
}
