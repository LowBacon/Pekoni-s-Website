import type { Metadata } from "next";
import AuthForm from "@/components/auth/AuthForm";
import { Eyebrow } from "@/components/ui/primitives";

export const metadata: Metadata = {
  title: "Kirjaudu | Pekoni",
  description: "Kirjaudu Pekoni-yhteisöön ja jatka matkaasi.",
  robots: { index: false, follow: false },
};

export default function LoginPage() {
  return (
    <div className="panel-raised rise w-full max-w-[420px] p-7 sm:p-9">
      <Eyebrow>Tervetuloa takaisin</Eyebrow>
      <h1 className="font-serif-display mt-3 text-3xl leading-tight">Kirjaudu sisään</h1>
      <p className="mt-2 text-sm text-[var(--text-muted)]">
        Metsä muistaa sinut. Jatka siitä mihin jäit.
      </p>
      <div className="mt-7">
        <AuthForm mode="login" />
      </div>
    </div>
  );
}
