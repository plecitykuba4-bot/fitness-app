import { KeyRound } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { NewPasswordForm } from "./form";

export const metadata = { title: "Nastavit nové heslo — Fitness trenér" };

export default async function NewPasswordPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams;
  return <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center px-5 py-10"><div className="mb-8 text-center"><KeyRound aria-hidden="true" className="mx-auto mb-4 size-10 text-primary-strong" /><h1 className="text-3xl font-bold">Nové heslo</h1><p className="mt-2 text-muted-foreground">Nastavte si silné nové heslo.</p></div><Card><CardContent className="pt-5"><NewPasswordForm token={token ?? ""} /></CardContent></Card></main>;
}
