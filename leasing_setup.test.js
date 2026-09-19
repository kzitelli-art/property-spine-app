const fs = require("fs"),
  path = require("path"),
  check = require("./tests/assert_reporter");
const html = fs.readFileSync(path.join(__dirname, "index.html"), "utf8");
check.ok(
  html.includes("openLeasingSetup()"),
  "Leasing setup must be reachable in the app",
);
check.equal(
  (
    html.match(
      /if\(typeof closeLeasingSetup === "function"\) closeLeasingSetup\(\);/g,
    ) || []
  ).length,
  2,
  "sign-out and property switch close the overview",
);
const { chromium } = require("./tests/browser_runtime");
async function main() {
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage({
      viewport: { width: 390, height: 844 },
    });
    await page.setContent("<body></body>");
    await page.evaluate(() => {
      window.meta = { user_id: "u", property_id: "p" };
      window.responses = {
        leasingKnowledge: {
          property_id: "p",
          coverage: {
            counts: {
              current: 1,
              total: 10,
              missing: 7,
              expired: 1,
              retired: 1,
            },
          },
        },
        tourSlots: {
          property_id: "p",
          slots: [],
          eligible_hosts: [],
          schedule_policy: null,
          operating_timezone: null,
          from: "2026-09-12",
          to: "2026-10-12",
        },
        leaseConfiguration: {
          configuration: {
            ready_to_execute: false,
            ready_to_generate: false,
            can_configure: false,
          },
        },
      };
      window.__psLive = {
        sessionMeta: () => meta,
        hasSession: () => !!meta,
        loadResource: async (key) => {
          if (window.timezoneError && key === "tourSlots")
            throw {
              status: 422,
              body: {
                code: "property_operating_timezone_not_configured",
                error:
                  "This property needs an operating timezone before tour times can be published.",
              },
            };
          if (window.fail === key)
            throw { status: window.failureStatus || 403 };
          if (window.delay === key)
            await new Promise((r) => (window.finish = r));
          return { data: responses[key] };
        },
      };
      window.crumbPropertyName = () => "Test property";
      window.openLeasingKnowledge = () => {
        responses.leasingKnowledge.coverage.counts.current = 2;
      };
    });
    await page.addScriptTag({ path: path.join(__dirname, "leasing-setup.js") });
    await page.evaluate(() => openLeasingSetup());
    await page.getByText("1 of 10 topics have current answers").waitFor();
    check.match(
      await page.locator("#leasingSetupDialog").innerText(),
      /1 expired/,
    );
    check.match(
      await page.locator("#leasingSetupDialog").innerText(),
      /No weekly policy recorded/,
    );
    check.match(
      await page.locator("#leasingSetupDialog").innerText(),
      /Management access is needed/,
    );
    check.ok(
      await page
        .locator("#leasingSetupDialog")
        .evaluate((e) => e.scrollWidth <= e.clientWidth),
    );
    await page
      .getByRole("button", { name: "Property answers", exact: true })
      .click();
    await page.getByRole("button", { name: "Return to Leasing setup" }).click();
    await page.getByText("2 of 10 topics have current answers").waitFor();
    await page.evaluate(() => {
      window.psLiveApplicationsReview = async () => {
        window.leaseOpened = true;
      };
      window.psTourTimesPage = () =>
        new Promise((resolve) => {
          window.finishDoor = resolve;
        });
    });
    await page
      .getByRole("button", { name: "Lease document", exact: true })
      .click();
    await page
      .getByRole("button", { name: "Return to Leasing setup" })
      .waitFor();
    check.equal(await page.evaluate(() => window.leaseOpened), true);
    await page.getByRole("button", { name: "Return to Leasing setup" }).click();
    await page.getByRole("button", { name: "Tour times", exact: true }).click();
    await page.waitForFunction(() => !!window.finishDoor);
    check.equal(await page.locator("#leasingSetupReturn").count(), 0);
    await page.evaluate(() => finishDoor());
    await page.getByRole("button", { name: "Return to Leasing setup" }).click();
    await page.evaluate(() => {
      window.openLeasingKnowledge = async () => {
        throw Error("navigation refused");
      };
    });
    await page
      .getByRole("button", { name: "Property answers", exact: true })
      .click();
    await page.getByRole("alert").waitFor();
    check.match(
      await page.getByRole("alert").innerText(),
      /could not be opened/,
    );
    await page.evaluate(() => {
      responses.tourSlots.schedule_policy = { id: "policy" };
      responses.tourSlots.operating_timezone = "America/New_York";
      responses.leaseConfiguration.configuration.ready_to_execute = true;
      responses.leaseConfiguration.configuration.ready_to_generate = true;
      openLeasingSetup();
    });
    await page
      .getByText("Document and signer configuration established")
      .waitFor();
    await page.getByText("Weekly policy recorded", { exact: true }).waitFor();
    check.ok(
      await page
        .getByText("Document and signer configuration established", {
          exact: true,
        })
        .isVisible(),
    );
    check.ok(
      await page
        .getByText("Weekly policy recorded", { exact: true })
        .isVisible(),
    );
    await page.evaluate(() => {
      responses.leaseConfiguration.configuration.ready_to_execute = false;
      openLeasingSetup();
    });
    await page
      .getByText("Document configured; signer needed", { exact: true })
      .waitFor();
    check.ok(
      await page
        .getByText("Document configured; signer needed", { exact: true })
        .isVisible(),
    );
    await page.evaluate(() => {
      responses.leasingKnowledge.coverage.counts = {
        current: 0,
        total: 10,
        missing: 10,
        expired: 0,
        retired: 0,
      };
      openLeasingSetup();
    });
    await page.getByText("0 of 10 topics have current answers").waitFor();
    await page.evaluate(() => {
      fail = "leasingKnowledge";
      openLeasingSetup();
    });
    await page.getByText("Access required").waitFor();
    check.equal(
      await page.getByText("2 of 10 topics have current answers").count(),
      0,
    );
    check.ok(await page.getByText("Access required").isVisible());
    await page.evaluate(() => {
      failureStatus = 401;
      openLeasingSetup();
    });
    await page.getByText("Sign in required").waitFor();
    check.ok(await page.getByText("Sign in required").isVisible());
    await page.evaluate(() => {
      failureStatus = 503;
      openLeasingSetup();
    });
    await page.getByText("Unavailable — retry this read.").waitFor();
    check.ok(
      await page
        .getByRole("button", { name: "Retry Property answers", exact: true })
        .isVisible(),
    );
    await page.evaluate(() => {
      fail = null;
      timezoneError = true;
      openLeasingSetup();
    });
    await page
      .getByText(/Setup needed — This property needs an operating timezone/)
      .waitFor();
    check.equal(
      await page
        .getByRole("button", { name: "Retry Tour times", exact: true })
        .count(),
      0,
    );
    await page.evaluate(() => {
      timezoneError = false;
      responses.tourSlots = {};
      openLeasingSetup();
    });
    await page.getByText("Unavailable — retry this read.").waitFor();
    await page.evaluate(() => {
      delay = "leasingKnowledge";
      openLeasingSetup();
    });
    await page.waitForFunction(() => !!window.finish);
    await page.evaluate(() => {
      meta = { user_id: "u", property_id: "other" };
      closeLeasingSetup();
      finish();
    });
    check.equal(await page.locator("#leasingSetupDialog").count(), 0);
    check.equal(await page.locator("#leasingSetupReturn").count(), 0);
  } finally {
    await browser.close();
  }
}
main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
