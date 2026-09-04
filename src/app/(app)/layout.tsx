import { redirect } from "next/navigation";
import { getCurrentUser } from "@/server/auth";
import { getDailyStatus } from "@/server/daily";
import { prisma } from "@/server/db";
import Sidebar from "@/components/nav/Sidebar";
import TopBar from "@/components/nav/TopBar";
import MobileNav from "@/components/nav/MobileNav";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const daily = await getDailyStatus(user.id);

  // Cheap presence tracking — powers the admin DAU/WAU figures.
  await prisma.user
    .update({ where: { id: user.id }, data: { lastSeenAt: new Date() } })
    .catch(() => undefined);

  if (user.status === "SUSPENDED") {
    return (
      <div className="flex min-h-dvh items-center justify-center px-6">
        <div className="panel-raised max-w-md px-8 py-10 text-center">
          <h1 className="font-serif-display text-2xl">Tili on jäädytetty</h1>
          <p className="mt-3 text-sm leading-relaxed text-[var(--text-muted)]">
            Tilisi käyttö on toistaiseksi estetty. Ota yhteyttä Pekoni-yhteisön ylläpitoon, jos
            uskot tämän olevan virhe.
          </p>
          <form action="/api/auth/logout" method="post" className="mt-6">
            <button type="submit" className="btn btn-ghost w-full">
              Kirjaudu ulos
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <>
      <a href="#main" className="skip-link">
        Siirry sisältöön
      </a>
      <Sidebar role={user.role} dailyAvailable={daily.available} />
      <div className="app-main">
        <TopBar role={user.role} />
        <main id="main" className="app-content relative">
          {children}
        </main>
      </div>
      <MobileNav />
    </>
  );
}
