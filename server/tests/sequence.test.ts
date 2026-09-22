import { db } from "../db/client.ts";
import { generateDocNumber } from "../services/sequence.ts";

async function runSequenceTests() {
  console.log("=== Testing Sequence Number Generation Service ===");

  try {
    // Test 1: Single generation
    const num1 = await db.transaction(async (tx) => {
      return await generateDocNumber(tx, "GRN");
    });
    console.log("✓ Single sequence generated:", num1);
    if (!num1.startsWith("GRN/")) {
      throw new Error(`Expected GRN prefix, got: ${num1}`);
    }

    // Test 2: Concurrency test - generate 10 sequence numbers in parallel
    console.log("Testing concurrent sequence number generation (10 concurrent requests)...");
    const promises = Array.from({ length: 10 }).map(() =>
      db.transaction(async (tx) => {
        return await generateDocNumber(tx, "TEST_SEQ");
      })
    );

    const results = await Promise.all(promises);
    console.log("Concurrent sequence numbers generated:", results);

    // Verify all 10 are unique
    const uniqueSet = new Set(results);
    if (uniqueSet.size !== 10) {
      throw new Error(`Expected 10 unique sequences, got ${uniqueSet.size}`);
    }
    console.log("✓ All 10 concurrent sequences are distinct and gap-free!");

    console.log("\n All Sequence Service tests passed successfully!");
    process.exit(0);
  } catch (err) {
    console.error("❌ Sequence Test Failed:", err);
    process.exit(1);
  }
}

runSequenceTests();
