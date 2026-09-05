import { redirect } from "next/navigation";
import { getSessionUser } from "@/server/auth/session";

export default async function HomePage() {
  const user = await getSessionUser();
  if (!user) redirect("/prihlaseni");
  if (user.role === "ADMIN") redirect("/dnes");
  if (user.role === "TRAINER") redirect("/prehled");
  redirect("/dnes");
}
