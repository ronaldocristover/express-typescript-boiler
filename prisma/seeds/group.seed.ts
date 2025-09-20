import { GroupStatus, PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();
import { faker } from "@faker-js/faker";
import { randomUsers } from "./user.seed";

// Filter out any groups where admin_id is null

export const createGroupSeed = async () => {
  let createdIds: string[] = [];
  for (let i = 0; i < 10; i++) {
    const createdGroup = await prisma.group.create({
      data: {
        name: "Arisan Group " + faker.vehicle.type(),
        description: faker.lorem.sentence(),
        admin_id: (await randomUsers()) as string,
        amount: faker.number.int({ min: 10000, max: 100000 }),
        start_at: new Date(),
        status: i % 2 === 0 ? GroupStatus.ACTIVE : GroupStatus.INACTIVE,
      },
    });
    createdIds.push(createdGroup.id);
  }

  return createdIds;
};
