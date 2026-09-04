import type { Metadata } from "next";
import AuthForm from "@/components/auth/AuthForm";
import { Eyebrow, Pill } from "@/components/ui/primitives";

export const metadata: Metadata = {
  title: "Luo tili | Pekoni",
  description: "Luo Pekoni-tili ja astu Nordic-erämaahan. Uudet kulkijat saavat 1 000 Pekoni Coinsia.",
  robots: { index: false, follow: false },
};

export default function RegisterPage() {
  return (
    <div className="panel-raised rise w-full max-w-[420px] p-7 sm:p-9">
      <div className="flex items-start justify-between gap-4">
        <div>
          <Eyebrow>Uusi kulkija</Eyebrow>
          <h1 className="font-serif-display mt-3 text-3xl leading-tight">Astu maailmaan</h1>
        </div>
        <Pill tone="moss" className="mt-1 shrink-0">
          +1 000 coins
        </Pill>
      </div>
      <p className="mt-2 text-sm text-[var(--text-muted)]">
        Luo hahmosi. Saat matkaeväiksi 1 000 Pekoni Coinsia.
      </p>
      <div className="mt-7">
        <AuthForm mode="register" />
      </div>
    </div>
  );
}
