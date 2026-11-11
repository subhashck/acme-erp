import { and, asc, desc, eq } from "drizzle-orm";
import { Hono } from "hono";
import { z } from "zod";
import type { AuthEnv } from "../auth.ts";
import { db } from "../db/client.ts";
import { bankAccounts } from "../db/schema.ts";
import { hasHrOrAccountsViewAccess } from "./shared.ts";

const LEGAL_ENTITIES = ["ACME_HOSPITAL", "ACME_NURSING", "HUMANKIND", "PERSONAL"] as const;

const bankAccountInput = z.object({
  accountName: z.string().min(1),
  bankName: z.string().min(1),
  accountNumber: z.string().min(1),
  ifscCode: z.string().nullable().optional(),
  branchName: z.string().nullable().optional(),
  accountType: z.string().default("Current"),
  legalEntity: z.enum(LEGAL_ENTITIES).default("ACME_HOSPITAL"),
  openingBalance: z.number().default(0),
  active: z.boolean().default(true),
  notes: z.string().nullable().optional(),
});

export const bankAccountsRoutes = new Hono<AuthEnv>()
  .get("/accounts/bank-accounts", async (c) => {
    if (!(await hasHrOrAccountsViewAccess(c))) {
      return c.json({ error: "Forbidden" }, 403);
    }
    const entity = c.req.query("entity");

    const conditions = [];
    if (entity && LEGAL_ENTITIES.includes(entity as any)) {
      conditions.push(eq(bankAccounts.legalEntity, entity));
    }

    const rows = await db
      .select()
      .from(bankAccounts)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(asc(bankAccounts.legalEntity), asc(bankAccounts.accountName))
      .execute();

    return c.json(rows);
  })

  .post("/accounts/bank-accounts", async (c) => {
    if (!(await hasHrOrAccountsViewAccess(c))) {
      return c.json({ error: "Forbidden" }, 403);
    }
    const body = await c.req.json();
    const input = bankAccountInput.parse(body);

    const [row] = await db
      .insert(bankAccounts)
      .values({
        accountName: input.accountName,
        bankName: input.bankName,
        accountNumber: input.accountNumber,
        ifscCode: input.ifscCode ?? null,
        branchName: input.branchName ?? null,
        accountType: input.accountType,
        legalEntity: input.legalEntity,
        openingBalance: input.openingBalance.toFixed(2),
        active: input.active,
        notes: input.notes ?? null,
      })
      .returning();

    return c.json(row, 201);
  })

  .put("/accounts/bank-accounts/:id", async (c) => {
    if (!(await hasHrOrAccountsViewAccess(c))) {
      return c.json({ error: "Forbidden" }, 403);
    }
    const id = parseInt(c.req.param("id"), 10);
    const body = await c.req.json();
    const input = bankAccountInput.partial().parse(body);

    const updateData: Record<string, any> = { updatedAt: new Date() };
    if (input.accountName !== undefined) updateData.accountName = input.accountName;
    if (input.bankName !== undefined) updateData.bankName = input.bankName;
    if (input.accountNumber !== undefined) updateData.accountNumber = input.accountNumber;
    if (input.ifscCode !== undefined) updateData.ifscCode = input.ifscCode ?? null;
    if (input.branchName !== undefined) updateData.branchName = input.branchName ?? null;
    if (input.accountType !== undefined) updateData.accountType = input.accountType;
    if (input.legalEntity !== undefined) updateData.legalEntity = input.legalEntity;
    if (input.openingBalance !== undefined) updateData.openingBalance = input.openingBalance.toFixed(2);
    if (input.active !== undefined) updateData.active = input.active;
    if (input.notes !== undefined) updateData.notes = input.notes ?? null;

    const [updated] = await db
      .update(bankAccounts)
      .set(updateData)
      .where(eq(bankAccounts.id, id))
      .returning();

    if (!updated) return c.json({ error: "Bank account not found" }, 404);
    return c.json(updated);
  })

  .delete("/accounts/bank-accounts/:id", async (c) => {
    if (!(await hasHrOrAccountsViewAccess(c))) {
      return c.json({ error: "Forbidden" }, 403);
    }
    const id = parseInt(c.req.param("id"), 10);

    const [updated] = await db
      .update(bankAccounts)
      .set({ active: false, updatedAt: new Date() })
      .where(eq(bankAccounts.id, id))
      .returning();

    if (!updated) return c.json({ error: "Bank account not found" }, 404);
    return c.json({ success: true });
  });
