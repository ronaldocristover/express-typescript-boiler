import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();
import { faker } from "@faker-js/faker";

export const randomUsers = async () => {
  const user = await prisma.user.findMany({
    select: {
      id: true,
    },
    take: 10, // Adjust the number of users you want to fetch
  });
  // Shuffle the users and pick one at random
  if (user.length === 0) return null;
  const randomIndex = Math.floor(Math.random() * user.length);
  return user[randomIndex].id;
};
const users = Array.from({ length: 500 }).map(() => ({
  name: faker.person.fullName(),
  phone: faker.phone.number(), // Add phone property
  email: faker.internet.email(),
  password: faker.internet.password(),
  is_active: faker.datatype.boolean(),
}));

export const createUserSeed = async () => {
  const createdUser = await prisma.user.createMany({
    data: users,
    skipDuplicates: true, // Skip if already exists
  });

  return createdUser;
};
