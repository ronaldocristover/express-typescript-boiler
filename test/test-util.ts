import prisma from "../src/application/database";
import bcrypt from "bcrypt";
import {User} from "@prisma/client";

export class UserTest {

    static async delete() {
        // Delete all test users with various test emails
        await prisma.user.deleteMany({
            where: {
                OR: [
                    { email: "test@example.com" },
                    { email: "john@example.com" },
                    { email: "integration@example.com" },
                    { email: "duplicate@example.com" },
                    { email: { contains: "@example.com" } }
                ]
            }
        })
    }

    static async create() {
        await prisma.user.create({
            data: {
                name: "Test User",
                email: "test@example.com",
                phone: "1234567890",
                password: await bcrypt.hash("test", 10)
            }
        })
    }

    static async get(): Promise<User> {
        const user = await prisma.user.findFirst({
            where: {
                email: "test@example.com"
            }
        })

        if (!user) {
            throw new Error("User is not found");
        }

        return user;
    }
}