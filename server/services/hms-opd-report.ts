import { chromium } from "playwright";

const reportUrl = "http://10.10.9.10:81/HMS/GS_Reports/GS_OPD/GS_Collection_Detail.aspx#";

function firstVisible(page: import("playwright").Page, selectors: string[]) {
  return selectors.map((selector) => page.locator(selector).filter({ visible: true }).first()).find(Boolean)!;
}

export async function generateHmsOpdCollectionReport() {
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
    await page.goto(reportUrl, { waitUntil: "domcontentloaded", timeout: 30_000 });

    const userCode = process.env.HMS_USER_CODE || "subhash";
    const password = process.env.HMS_PASSWORD || "1234";
    const userInput = firstVisible(page, [
      'input[name*="user" i]', 'input[id*="user" i]', 'input[name*="code" i]', 'input[id*="code" i]',
    ]);
    const passwordInput = firstVisible(page, ['input[type="password"]']);

    if (await userInput.count() && await passwordInput.count()) {
      await userInput.fill(userCode);
      await passwordInput.fill(password);
      await page.locator('#ImageButton1, input[type="submit"][value*="Login" i], button').first().click();
      await page.waitForLoadState("domcontentloaded").catch(() => undefined);
      await page.goto(reportUrl, { waitUntil: "domcontentloaded", timeout: 30_000 });
    }

    const filter = page.locator('select[id$="ddl_subgroup"]');
    if (!(await filter.count())) throw new Error("HMS report Filter By control was not found");
    await filter.selectOption({ label: "User Name" });
    await page.waitForLoadState("domcontentloaded").catch(() => undefined);

    await page.waitForTimeout(5_000);

    const selectAllUsers = page.locator('input[name$="chk_type"]');
    if (!(await selectAllUsers.count())) throw new Error("HMS report user select-all control was not found");
    const userSelectAll = selectAllUsers.last();
    await userSelectAll.click({ force: true });
    await page.waitForTimeout(250);

    await page.locator('input[id$="btn_search"]').click();
    await page.waitForLoadState("networkidle", { timeout: 30_000 }).catch(() => undefined);
    await page.waitForTimeout(1_000);

    return { html: await page.locator("body").innerHTML(), generatedAt: new Date().toISOString() };
  } finally {
    await browser.close();
  }
}
