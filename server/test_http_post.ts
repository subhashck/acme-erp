async function testHttp() {
  console.log("Testing POST to http://localhost:5173/api/hr/weekly-off-days...");
  try {
    const res5173 = await fetch("http://localhost:5173/api/hr/weekly-off-days", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ staffId: 1, daysOfWeek: [0], effectiveFrom: "2026-07-22" }),
    });
    console.log("Status from 5173:", res5173.status);
    console.log("Content-Type 5173:", res5173.headers.get("content-type"));
    const text5173 = await res5173.text();
    console.log("Body snippet 5173:", text5173.slice(0, 200));
  } catch (e: any) {
    console.error("Error 5173:", e.message);
  }

  console.log("\nTesting POST to http://localhost:8787/api/hr/weekly-off-days...");
  try {
    const res8787 = await fetch("http://localhost:8787/api/hr/weekly-off-days", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ staffId: 1, daysOfWeek: [0], effectiveFrom: "2026-07-22" }),
    });
    console.log("Status from 8787:", res8787.status);
    console.log("Content-Type 8787:", res8787.headers.get("content-type"));
    const text8787 = await res8787.text();
    console.log("Body snippet 8787:", text8787.slice(0, 200));
  } catch (e: any) {
    console.error("Error 8787:", e.message);
  }
}

testHttp().then(() => process.exit(0)).catch(console.error);
