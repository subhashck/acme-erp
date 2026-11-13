import { describe, it, expect } from "vitest";
import { app } from "../../server/index.ts";
import { renderHomeHtml, renderPolicyHtml, renderTermsHtml } from "../../server/routes/static-pages.ts";

describe("Public Static HTML Pages & Google Console Verification", () => {
  it("renders public homepage static HTML with system overview and compliance links", () => {
    const html = renderHomeHtml();
    expect(html).toContain("ACME ERP");
    expect(html).toContain("Acme College of Nursing");
    expect(html).toContain("https://acmecollegeofnursing.org/");
    expect(html).toContain("Acme Hospital");
    expect(html).toContain("https://acmefertilitycentre.com/");
    expect(html).toContain("my-acme.cloud");
    expect(html).toContain("/policy");
    expect(html).toContain("/terms");
    expect(html).toContain("/login");
  });

  it("renders Google-compliant Privacy Policy with mandatory Limited Use disclosures", () => {
    const html = renderPolicyHtml();
    expect(html).toContain("Privacy Policy");
    expect(html).toContain("https://my-acme.cloud/");
    expect(html).toContain("Acme College of Nursing");
    expect(html).toContain("https://acmecollegeofnursing.org/");
    expect(html).toContain("Acme Hospital");
    expect(html).toContain("https://acmefertilitycentre.com/");
    expect(html).toContain("Google API Services User Data Policy");
    expect(html).toContain("Limited Use requirements");
    expect(html).toContain("No Commercial Advertising");
    expect(html).toContain("No Sale of Data");
    expect(html).toContain("No Generalized AI Model Training");
    expect(html).toContain("privacy@my-acme.cloud");
  });

  it("renders Terms of Service with institutional governance", () => {
    const html = renderTermsHtml();
    expect(html).toContain("Terms of Service");
    expect(html).toContain("https://my-acme.cloud/");
    expect(html).toContain("Acme College of Nursing");
    expect(html).toContain("https://acmecollegeofnursing.org/");
    expect(html).toContain("Acme Hospital");
    expect(html).toContain("https://acmefertilitycentre.com/");
    expect(html).toContain("admin@my-acme.cloud");
  });

  it("serves GET /policy with 200 OK and text/html directly from Hono", async () => {
    const res = await app.request("/policy");
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("text/html");
    const text = await res.text();
    expect(text).toContain("Privacy Policy");
    expect(text).toContain("Limited Use requirements");
  });

  it("serves GET /privacy as an alias with 200 OK", async () => {
    const res = await app.request("/privacy");
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("text/html");
  });

  it("serves GET /terms with 200 OK and text/html directly from Hono", async () => {
    const res = await app.request("/terms");
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("text/html");
    const text = await res.text();
    expect(text).toContain("Terms of Service");
  });

  it("serves dynamic Google Search Console HTML verification file", async () => {
    const res = await app.request("/google1234567890abcdef.html");
    expect(res.status).toBe(200);
    const text = await res.text();
    expect(text).toBe("google-site-verification: google1234567890abcdef.html");
  });

  it("serves static HTML homepage when accessed by unauthenticated visitor or Google bot", async () => {
    const res = await app.request("/");
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("text/html");
    const text = await res.text();
    expect(text).toContain("ACME ERP");
    expect(text).toContain("Enterprise Hospital & Academic System");
    expect(text).toContain("/policy");
    expect(text).toContain("/terms");
  });

  it("protects /api/dashboard with authentication (401 without session)", async () => {
    const res = await app.request("/api/dashboard");
    expect(res.status).toBe(401);
  });

  it("returns auth config from /api/public/auth-config", async () => {
    const res = await app.request("/api/public/auth-config");
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data).toHaveProperty("googleEnabled");
  });
});
