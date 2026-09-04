import { requireAdmin } from "@/server/auth/guards";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin();
  return <main className="mx-auto min-h-dvh w-full max-w-3xl px-4 py-8 md:px-6">{children}</main>;
}
