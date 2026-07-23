import Dexie from "dexie";
import { afterEach, describe, expect, it } from "vitest";
import { CertPrepDatabase } from "@/db/dbInstance";

const databaseNames: string[] = [];

afterEach(async () => {
  await Promise.all(databaseNames.splice(0).map((name) => Dexie.delete(name)));
});

describe("Dexie v17 Zen draft migration", () => {
  it("adds an empty local-only table without changing v16 records", async () => {
    const name = `CertPrepMigration-${crypto.randomUUID()}`;
    databaseNames.push(name);
    const legacy = new Dexie(name);
    legacy.version(16).stores({
      quizzes:
        "id, user_id, created_at, deleted_at, *tags, quiz_hash, updated_at, [user_id+created_at], category, subcategory",
      results:
        "id, quiz_id, timestamp, synced, user_id, deleted_at, [user_id+synced], [user_id+quiz_id], [user_id+timestamp]",
      syncState: "table, lastSyncedAt, synced, lastId",
      srs: "&[question_id+user_id], user_id, next_review, [user_id+synced], [user_id+next_review]",
      hashCache: "&answer, created_at",
    });
    await legacy.open();
    await legacy.table("quizzes").add({
      id: "quiz-existing",
      user_id: "user-1",
      created_at: 1,
      tags: [],
      quiz_hash: "hash",
      updated_at: 1,
    });
    await legacy.table("hashCache").add({
      answer: "a",
      hash: "hash-a",
      created_at: 1,
    });
    legacy.close();

    const upgraded = new CertPrepDatabase(name);
    await upgraded.open();
    expect(upgraded.verno).toBe(17);
    expect(upgraded.tables.map((table) => table.name)).toContain("zenDrafts");
    expect(await upgraded.zenDrafts.count()).toBe(0);
    expect(await upgraded.quizzes.get("quiz-existing")).toMatchObject({
      id: "quiz-existing",
      quiz_hash: "hash",
    });
    expect(await upgraded.hashCache.get("a")).toEqual({
      answer: "a",
      hash: "hash-a",
      created_at: 1,
    });
    upgraded.close();
  });
});
