import "dotenv/config";
import { db } from "../src/server/db";

const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
if (!email) {
  console.error("Chybí ADMIN_EMAIL.");
  process.exit(1);
}

const admin = await db.user.findUnique({ where: { email } });
if (!admin || admin.role !== "ADMIN") {
  console.error("Admin účet nebyl nalezen.");
  process.exit(1);
}

const trainer = await db.trainer.upsert({
  where: { userId: admin.id },
  create: { userId: admin.id },
  update: {},
});
await db.client.upsert({
  where: { userId: admin.id },
  create: { userId: admin.id, trainerId: trainer.id },
  update: {},
});
await db.$disconnect();
console.log("Adminovi bylo aktivováno klientské rozhraní.");
