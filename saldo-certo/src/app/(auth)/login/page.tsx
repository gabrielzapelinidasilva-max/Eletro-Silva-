import type { Metadata } from "next";
import { Suspense } from "react";
import { LinkErrorNotice } from "./link-error-notice";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Entrar" };

export default function LoginPage() {
  return (
    <>
      <Suspense fallback={null}>
        <LinkErrorNotice />
      </Suspense>
      <LoginForm />
    </>
  );
}
