import { app } from "../server/index.ts";

async function main() {
  const res = await app.request("http://localhost/api/hr/attendance/my-punch-status");
  console.log("Status:", res.status);
  const text = await res.text();
  console.log("Response:", text);
}

main().catch(console.error);
