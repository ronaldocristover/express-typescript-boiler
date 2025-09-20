import { PrismaClient } from "@prisma/client";
import { createUserSeed } from "./seeds/user.seed";

const prisma = new PrismaClient();

async function main() {
  await createUserSeed();
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
