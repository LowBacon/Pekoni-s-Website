import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/server/auth";
import PekoniScene from "@/components/env/PekoniScene";
import Atmosphere from "@/components/env/Atmosphere";
import Wordmark from "@/components/nav/Wordmark";
import { Icon } from "@/components/ui/Icons";

export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (user) redirect("/home");

  return (
    <div className="relative flex min-h-dvh flex-col overflow-clip">
      <div className="env">
        <PekoniScene scene="clearing" variant="auth" className="h-full w-full" />
        <Atmosphere scene="clearing" density={0.8} />
        <div className="env-fog" />
        <div className="grain" />
      </div>

      <header className="relative z-10 flex items-center justify-between px-5 py-6 sm:px-10">
        <Wordmark size="sm" />
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-[13px] font-medium text-[var(--text-muted)] transition-colors hover:text-[var(--text-dim)]"
        >
          <Icon name="chevronLeft" size={15} />
          Etusivulle
        </Link>
      </header>

      <main className="relative z-10 flex flex-1 items-center justify-center px-5 py-10">
        {children}
      </main>

      <footer className="relative z-10 px-5 py-6 text-center sm:px-10">
        <p className="text-xs text-[var(--text-faint)]">
          Kaikki Pekoni Coins -valuutta on virtuaalista eikä sillä ole rahallista arvoa.
        </p>
      </footer>
    </div>
  );
}
