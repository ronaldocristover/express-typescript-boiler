# New Module Scaffold Guide

This guide explains how to duplicate the existing **user** module pattern to create a new resource module (example: `participant`). Adjust naming and schema fields to fit your domain.

---

## 1. Existing User Module Components

| Layer                        | File                                                                                                       |
| ---------------------------- | ---------------------------------------------------------------------------------------------------------- |
| Controller                   | `src/controllers/user.controller.ts`                                                                       |
| Service                      | `src/services/user.service.ts`                                                                             |
| Repository                   | `src/repositories/user.repository.ts`                                                                      |
| Routes                       | `src/routes/user.route.ts`                                                                                 |
| Validation                   | `src/validations/user-validation.ts`                                                                       |
| Shared Validation Helper     | `src/validations/validation.ts`                                                                            |
| Types (request augmentation) | `src/types/user-request.ts`, `src/types/user.types.ts`                                                     |
| Tests (integration)          | `test/user.test.ts`                                                                                        |
| Tests (unit)                 | `test/unit/user.controller.test.ts`, `test/unit/user.service.test.ts`, `test/unit/user.repository.test.ts` |
| Seed                         | `prisma/seeds/user.seed.ts`                                                                                |
| Prisma Schema                | `prisma/schema.prisma`                                                                                     |

Support utilities:

- Logger: `src/application/logging.ts`
- Prisma client: `src/application/database.ts`
- Error types/middleware: `src/errors/response-error.ts`, `src/middlewares/error.middleware.ts`
- App bootstrap: `src/app.ts`

---

## 2. Standard Responsibilities per Layer

- Repository: Direct Prisma access (CRUD, simple queries) — no business logic.
- Service: Business rules, orchestration, transactions (currently thin wrapper; future logic goes here).
- Controller: HTTP translation layer (req/res formatting, status codes, logging).
- Validation: Zod schemas + centralized `Validation.validate` helper.
- Routes: REST mapping → controller methods (optionally attach auth, caching, rate limiting).
- Tests: Unit = isolate layer; Integration = end-to-end HTTP via Supertest.

---

## 3. Naming Convention for New Module (Example: Participant)

| Concept        | Example Name                                                                                                                            |
| -------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| Model          | `Participant`                                                                                                                           |
| Table (Prisma) | `Participant`                                                                                                                           |
| Route Base     | `/api/participants`                                                                                                                     |
| Files          | `participant.repository.ts`, `participant.service.ts`, `participant.controller.ts`, `participant.route.ts`, `participant-validation.ts` |
| Test Files     | `participant.test.ts`, `participant.controller.test.ts`, etc.                                                                           |

---

## 4. Prisma Model (Add to `prisma/schema.prisma`)

```prisma
model Participant {
  id        Int      @id @default(autoincrement())
  name      String
  email     String?  @unique
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
```

Run migration:

```bash
npx prisma migrate dev --name create_participant
```

---

## 5. Repository Template (`src/repositories/participant.repository.ts`)

```ts
import prisma from "../application/database";

class ParticipantRepository {
  private model;
  constructor() {
    this.model = prisma.participant;
  }

  async findAll() {
    return this.model.findMany({});
  }
  async findById(id: number) {
    return this.model.findUnique({ where: { id } });
  }
  async create(data: any) {
    return this.model.create({ data });
  }
  async update(id: number, data: any) {
    return this.model.update({ where: { id }, data });
  }
  async delete(id: number) {
    return this.model.delete({ where: { id } });
  }
}

export default new ParticipantRepository();
```

---

## 6. Service Template (`src/services/participant.service.ts`)

```ts
import participantRepository from "../repositories/participant.repository";

class ParticipantService {
  async findAll() {
    return participantRepository.findAll();
  }
  async findOne(id: number) {
    return participantRepository.findById(id);
  }
  async create(data: any) {
    return participantRepository.create(data);
  }
  async update(id: number, data: any) {
    return participantRepository.update(id, data);
  }
  async remove(id: number) {
    return participantRepository.delete(id);
  }
}

export const participantService = new ParticipantService();
```

---

## 7. Validation Schema (`src/validations/participant-validation.ts`)

```ts
import { z, ZodType } from "zod";

export class ParticipantValidation {
  static readonly CREATE: ZodType = z.object({
    name: z.string().min(1).max(100),
    email: z.string().email().optional(),
  });

  static readonly UPDATE: ZodType = z.object({
    id: z.number().positive(),
    name: z.string().min(1).max(100),
    email: z.string().email().optional(),
  });
}
```

Use with helper:

```ts
// const payload = Validation.validate(ParticipantValidation.CREATE, req.body);
```

---

## 8. Controller (`src/controllers/participant.controller.ts`)

```ts
import { Request, Response, NextFunction } from "express";
import { participantService } from "../services/participant.service";
import { logger } from "../application/logging";
// import { Validation } from "../validations/validation";
// import { ParticipantValidation } from "../validations/participant-validation";

class ParticipantController {
  async findAll(req: Request, res: Response) {
    try {
      const data = await participantService.findAll();
      res
        .status(200)
        .json({ message: "Participants retrieved successfully", data });
    } catch (error: any) {
      logger.error("Error in getAllParticipants", error);
      res
        .status(500)
        .json({ message: "Internal server error", error: error.message });
    }
  }

  async find(req: Request, res: Response) {
    try {
      const data = await participantService.findOne(parseInt(req.params.id));
      if (!data)
        return res.status(404).json({ message: "Participant not found" });
      res
        .status(200)
        .json({ message: "Participant retrieved successfully", data });
    } catch (error: any) {
      logger.error("Error in getParticipantById", error);
      res
        .status(500)
        .json({ message: "Internal server error", error: error.message });
    }
  }

  async create(req: Request, res: Response) {
    try {
      // const payload = Validation.validate(ParticipantValidation.CREATE, req.body);
      const created = await participantService.create(req.body);
      logger.info("Participant created", { participantId: created.id });
      res
        .status(201)
        .json({ message: "Participant created successfully", data: created });
    } catch (error: any) {
      logger.error("Error in createParticipant", error);
      res
        .status(500)
        .json({ message: "Internal server error", error: error.message });
    }
  }

  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const id = parseInt(req.params.id);
      // const payload = Validation.validate(ParticipantValidation.UPDATE, { ...req.body, id });
      const updated = await participantService.update(id, req.body);
      res.status(200).json({ data: updated });
    } catch (e) {
      next(e);
    }
  }

  async remove(req: Request, res: Response, next: NextFunction) {
    try {
      const id = parseInt(req.params.id);
      await participantService.remove(id);
      res.status(200).json({ data: "OK" });
    } catch (e) {
      next(e);
    }
  }
}

export default new ParticipantController();
```

---

## 9. Route (`src/routes/participant.route.ts`)

```ts
import express from "express";
import participantController from "../controllers/participant.controller";
// import authMiddleware from "../middlewares/auth.middleware"; // if needed

const router = express.Router();
// router.use(authMiddleware);

router.get("/", participantController.findAll);
router.get("/:id", participantController.find);
router.post("/", participantController.create);
router.put("/:id", participantController.update);
router.delete("/:id", participantController.remove);

export default router;
```

Mount in `src/app.ts`:

```ts
import participantRoutes from "./routes/participant.route";
// ... after other app.use statements
app.use("/api/participants", participantRoutes);
```

---

## 10. Integration Test (`test/participant.test.ts`)

```ts
import supertest from "supertest";
import app from "../src/app";

describe("Participant CRUD", () => {
  let createdId: number;

  it("creates", async () => {
    const res = await supertest(app)
      .post("/api/participants")
      .send({ name: "Alpha Tester", email: "alpha@example.com" });
    expect(res.status).toBe(201);
    createdId = res.body.data.id;
  });

  it("lists", async () => {
    const res = await supertest(app).get("/api/participants");
    expect(res.status).toBe(200);
  });

  it("finds", async () => {
    const res = await supertest(app).get(`/api/participants/${createdId}`);
    expect(res.status).toBe(200);
  });

  it("updates", async () => {
    const res = await supertest(app)
      .put(`/api/participants/${createdId}`)
      .send({ name: "Beta Tester" });
    expect(res.status).toBe(200);
  });

  it("removes", async () => {
    const res = await supertest(app).delete(`/api/participants/${createdId}`);
    expect(res.status).toBe(200);
    expect(res.body.data).toBe("OK");
  });
});
```

---

## 11. Seed (Optional) (`prisma/seeds/participant.seed.ts`)

```ts
import { PrismaClient } from "@prisma/client";
import { faker } from "@faker-js/faker";
const prisma = new PrismaClient();

export const createParticipantSeed = async () => {
  await prisma.participant.createMany({
    data: Array.from({ length: 10 }).map(() => ({
      name: faker.person.fullName(),
      email: faker.internet.email(),
    })),
    skipDuplicates: true,
  });
};
```

Add to `prisma/seed.ts` after user seed invocation.

---

## 12. Checklist

- [ ] Add Prisma model
- [ ] Run migration `npx prisma migrate dev`
- [ ] Create repository/service/controller/route files
- [ ] Add validation schemas (if required)
- [ ] Mount route in `src/app.ts`
- [ ] Add tests (integration + unit as desired)
- [ ] (Optional) Seed data
- [ ] Run tests & lint

---

## 13. Common Enhancements (Optional)

| Feature                          | Where to Add                                         |
| -------------------------------- | ---------------------------------------------------- |
| Auth Guard                       | Wrap routes with `auth.middleware.ts`                |
| Rate Limiting                    | Apply `rate-limit.middleware.ts` per route group     |
| Caching (GET list / detail)      | Use `cache.middleware.ts` + `cache.service.ts`       |
| Request Context (correlation id) | Already applied globally if middleware is mounted    |
| Input Validation                 | `Validation.validate(SCHEMA, data)`                  |
| Domain Events / PubSub           | Add inside service layer                             |
| Pagination                       | Modify repository `findAll` to accept `skip`, `take` |

---

## 14. Pagination Pattern (Example)

```ts
async findAll({ page = 1, pageSize = 20 }) {
  const skip = (page - 1) * pageSize;
  const [items, total] = await prisma.$transaction([
    prisma.participant.findMany({ skip, take: pageSize }),
    prisma.participant.count(),
  ]);
  return { items, total, page, pageSize, pages: Math.ceil(total / pageSize) };
}
```

---

## 15. Error Handling Notes

- For predictable domain errors, throw custom `ResponseError` (extend existing pattern in `errors/response-error.ts`).
- Let unhandled errors propagate to `error.middleware.ts`.
- Consistent logging: `logger.error(message, meta?)`.

---

## 16. Fast Generation Script Idea (Optional)

You can automate scaffolding via a simple Node script or a plop generator; not implemented here but structure above is stable for template extraction.

---

## 17. Summary

Duplicate the user module by creating parallel files, wiring the route, adding a Prisma model + migration, and replicating tests. This file serves as a repeatable checklist and code template.

---

If you need an automated generator or to apply this to multiple modules at once, open an issue or request an automation script.
