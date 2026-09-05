import Link from "next/link";
import { KeyRound } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { ForgotPasswordForm } from "./form";

export const metadata = { title: "Obnova hesla — Fitness trenér" };

export default function ForgotPasswordPage() {
  return <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center px-5 py-10">
    <div className="mb-8 text-center"><KeyRound aria-hidden="true" className="mx-auto mb-4 size-10 text-primary-strong" /><h1 className="text-3xl font-bold">Zapomenuté heslo</h1><p className="mt-2 text-muted-foreground">Pošleme vám jednorázový odkaz pro nastavení nového hesla.</p></div>
    <Card><CardContent className="pt-5"><ForgotPasswordForm /></CardContent></Card>
    <Link href="/prihlaseni" className="mt-5 text-center font-semibold text-primary-strong">Zpět k přihlášení</Link>
  </main>;
}
