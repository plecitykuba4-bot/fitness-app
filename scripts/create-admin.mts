import "dotenv/config";
import bcrypt from "bcryptjs";
import { db } from "../src/server/db";

const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
const name = process.env.ADMIN_NAME?.trim();
const password = process.env.ADMIN_PASSWORD;

if (!email || !name || !password) {
  console.error("Chybí ADMIN_EMAIL, ADMIN_NAME nebo ADMIN_PASSWORD. Heslo neposílejte v chatu ani nepište do historie příkazů.");
  process.exit(1);
}
if (!/^\S+@\S+\.\S+$/.test(email) || name.length < 2 || password.length < 12) {
  console.error("Admin musí mít platný e-mail, jméno alespoň 2 znaky a heslo alespoň 12 znaků.");
  process.exit(1);
}

const existing = await db.user.findUnique({ where: { email }, select: { id: true, role: true } });
if (existing && existing.role !== "ADMIN") {
  console.error("Tento e-mail už patří jinému typu účtu. Zvolte jiný e-mail pro administraci.");
  process.exit(1);
}

const passwordHash = await bcrypt.hash(password, 12);
await db.user.upsert({
  where: { email },
  create: { email, name, passwordHash, role: "ADMIN" },
  update: { name, passwordHash, role: "ADMIN" },
});
await db.$disconnect();
console.log(`Admin účet ${email} je připraven. Přihlaste se standardně přes /prihlaseni.`);
