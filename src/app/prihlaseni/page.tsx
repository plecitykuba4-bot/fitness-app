import { redirect } from "next/navigation";
import { Dumbbell } from "lucide-react";
import { getSessionUser } from "@/server/auth/session";
import { Card, CardContent } from "@/components/ui/card";
import { LoginForm } from "./login-form";

export const metadata = { title: "Přihlášení — Fitness trenér" };

export default async function LoginPage() {
  const user = await getSessionUser();
  if (user) {
    redirect(user.role === "ADMIN" ? "/dnes" : user.role === "TRAINER" ? "/prehled" : "/");
  }

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center px-5 py-10">
      <div className="mb-8 flex flex-col items-center text-center">
        <div className="mb-4 flex size-16 items-center justify-center rounded-[var(--radius-card)] bg-primary">
          <Dumbbell aria-hidden="true" className="size-9 text-primary-foreground" />
        </div>
        <h1 className="text-3xl font-bold tracking-tight">Fitness trenér</h1>
        <p className="mt-2 text-lg text-muted-foreground">
          Přihlaste se ke svému účtu.
        </p>
      </div>

      <Card>
        <CardContent className="pt-5">
          <LoginForm />
        </CardContent>
      </Card>
    </main>
  );
}
