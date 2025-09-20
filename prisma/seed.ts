import { PrismaClient } from "@prisma/client";
import { createUserSeed } from "./seeds/user.seed";
import { createGroupSeed } from "./seeds/group.seed";
import { createGroupMemberSeed } from "./seeds/group-member.seed";

const prisma = new PrismaClient();

async function main() {
  await createUserSeed();
  await createGroupSeed();
  await createGroupMemberSeed();
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
