#!/usr/bin/env node
/**
 * Capture the README screenshots from a running Mediora Server web UI.
 *
 * Usage:
 *   SCREENSHOT_TOKEN=<jwt> node scripts/screenshots.mjs
 *   node scripts/screenshots.mjs --base-url http://localhost:3000 --token <jwt>
 *
 *   # only a subset
 *   node scripts/screenshots.mjs --token <jwt> --only search,library-movies
 *
 * Options:
 *   --base-url   Web UI origin (default: $SCREENSHOT_BASE_URL or http://localhost:3000)
 *   --token      Mediora Server JWT, stored in localStorage (default: $SCREENSHOT_TOKEN)
 *   --out        Output folder (default: $SCREENSHOT_OUT or docs/screenshots)
 *   --only       Comma separated screenshot names to capture
 *   --keep       Keep the browser window open (debugging, headful)
 *
 * The token can be the one the web UI stores after login at /login
 * (localStorage key `mediora-server_token`). On a server you control, mint one:
 *
 *   docker exec mediora-server-api node -e \
 *     "console.log(require('jsonwebtoken').sign({sub:'mediora-server'},process.env.JWT_SECRET,{expiresIn:'1d'}))"
 *
 * The script never prints the token and blanks API keys before capturing the
 * settings page.
 */
import { mkdir } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const TOKEN_STORAGE_KEY = "mediora-server_token";
const SECRET_INPUT_IDS = [
  "param-tmdb_api_key",
  "param-jackett_api_key",
  "param-sonarr_radarr_api_key",
];

function parseArgs(argv) {
  const args = {};
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (!arg.startsWith("--")) continue;
    const key = arg.slice(2);
    const next = argv[index + 1];
    if (["keep"].includes(key)) {
      args[key] = true;
      continue;
    }
    if (next === undefined || next.startsWith("--")) {
      throw new Error(`Missing value for --${key}`);
    }
    args[key] = next;
    index += 1;
  }
  return args;
}

const CASES = [
  {
    name: "search",
    path: "/search",
    description: "Search page with popular movies and TV shows",
  },
  {
    name: "discover",
    path: "/discover",
    description: "Discover page with language, year, score and genre filters",
  },
  {
    name: "library-movies",
    path: "/library/movies",
    description: "Movie library grid with sorting and filtering",
  },
  {
    name: "movie-details",
    path: "/library/movies",
    description: "Movie details dialog opened from a library card",
    async before(page) {
      await openFirstCard(page);
    },
    async after(page) {
      await page.locator('[role="dialog"]').first().waitFor({ timeout: 15000 });
      await settle(page);
    },
  },
  {
    name: "manual-search",
    path: "/library/movies",
    description: "Manual torrent search inside the movie details dialog",
    optional: true,
    async before(page) {
      await openFirstCard(page);
      const dialog = page.locator('[role="dialog"]').first();
      await dialog.waitFor({ timeout: 15000 });
      await dialog.getByRole("button", { name: "Replace" }).click();
      await page.locator('[role="dialog"]').nth(1).waitFor({ timeout: 15000 });
      // Jackett queries can take a while; wait for rows or an empty state.
      await page
        .locator('[role="dialog"] table tbody tr')
        .first()
        .waitFor({ timeout: 60000 })
        .catch(() => {});
      await settle(page, { networkIdle: false });
    },
  },
  {
    name: "library-tvshows",
    path: "/library/tvshows",
    description: "TV show library with per-show episode progress",
  },
  {
    name: "tvshow-details",
    path: "/library/tvshows",
    description: "TV show dialog with seasons and download actions",
    async before(page) {
      await openFirstCard(page);
    },
    async after(page) {
      await page.locator('[role="dialog"]').first().waitFor({ timeout: 15000 });
      await settle(page);
    },
  },
  {
    name: "downloads",
    path: "/downloads",
    description: "Transmission downloads table with progress and speeds",
  },
  {
    name: "suggestions",
    path: "/suggestions",
    description: "Recommendations based on the current library",
  },
  {
    name: "calendar",
    path: "/calendar",
    description: "Release calendar for library movies and episodes",
  },
  {
    name: "settings",
    path: "/settings",
    description: "Settings page (API keys masked)",
    async after(page) {
      await maskSecrets(page);
    },
  },
];

async function openFirstCard(page) {
  const card = page.locator(".group.cursor-pointer").first();
  await card.waitFor({ timeout: 20000 });
  await card.click();
}

async function settle(page, { networkIdle = true } = {}) {
  if (networkIdle) {
    await page
      .waitForLoadState("networkidle", { timeout: 30000 })
      .catch(() => {});
  }
  await page
    .waitForFunction(
      () => Array.from(document.images).every((image) => image.complete),
      undefined,
      { timeout: 15000 },
    )
    .catch(() => {});
  await page.evaluate(() => document.fonts.ready).catch(() => {});
  // Drop focus rings left behind by clicks so the capture looks neutral.
  await page.evaluate(() => document.activeElement?.blur?.()).catch(() => {});
  // Let carousels, background images and transitions settle.
  await page.waitForTimeout(700);
}

async function maskSecrets(page) {
  await page.evaluate((secretIds) => {
    for (const input of document.querySelectorAll("input")) {
      const isSecret = secretIds.includes(input.id) || input.readOnly;
      if (!isSecret) continue;
      input.value = "•".repeat(18);
      input.setAttribute("data-screenshot-masked", "true");
    }
  }, SECRET_INPUT_IDS);
  await page.waitForTimeout(200);
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const baseURL =
    args["base-url"] ||
    process.env.SCREENSHOT_BASE_URL ||
    "http://localhost:3000";
  const token = args.token || process.env.SCREENSHOT_TOKEN;
  const outDir = path.resolve(
    args.out || process.env.SCREENSHOT_OUT || "docs/screenshots",
  );
  const only = args.only
    ? new Set(args.only.split(",").map((name) => name.trim()))
    : null;

  if (!token) {
    console.error(
      "Missing token. Pass --token <jwt> or set SCREENSHOT_TOKEN. See the header of this file.",
    );
    process.exit(1);
  }

  let chromium;
  try {
    ({ chromium } = await import("playwright"));
  } catch {
    console.error(
      "playwright is not installed. Run `yarn install` at the repo root, then `yarn playwright install chromium`.",
    );
    process.exit(1);
  }

  const cases = CASES.filter((testCase) => !only || only.has(testCase.name));
  if (cases.length === 0) {
    console.error(
      `No screenshot matched --only. Known names: ${CASES.map((c) => c.name).join(", ")}`,
    );
    process.exit(1);
  }

  await mkdir(outDir, { recursive: true });

  const browser = await chromium.launch({ headless: !args.keep });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 2,
    colorScheme: "dark",
    locale: "en-US",
    reducedMotion: "reduce",
  });
  await context.addInitScript(
    ([key, value]) => {
      try {
        window.localStorage.setItem(key, value);
      } catch {
        // Ignore storage failures; the login check reports the real problem.
      }
    },
    [TOKEN_STORAGE_KEY, token],
  );
  const page = await context.newPage();
  page.setDefaultTimeout(20000);

  const failures = [];

  for (const testCase of cases) {
    const startedAt = Date.now();
    try {
      await page.goto(new URL(testCase.path, baseURL).toString(), {
        waitUntil: "domcontentloaded",
      });
      await settle(page);
      if (testCase.before) await testCase.before(page);
      if (testCase.after) await testCase.after(page);

      if (page.url().includes("/login")) {
        throw new Error("redirected to /login, token rejected");
      }

      const file = path.join(outDir, `${testCase.name}.png`);
      await page.screenshot({
        path: file,
        scale: "css",
        animations: "disabled",
        caret: "hide",
      });
      const seconds = ((Date.now() - startedAt) / 1000).toFixed(1);
      console.log(
        `✓ ${testCase.name} (${seconds}s) → ${path.relative(process.cwd(), file)}`,
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      failures.push({ name: testCase.name, message });
      console.error(
        `${testCase.optional ? "⚠" : "✗"} ${testCase.name}: ${message}`,
      );
    } finally {
      // Close any dialog left open so the next page starts clean.
      await page.keyboard.press("Escape").catch(() => {});
    }
  }

  await browser.close();

  const hardFailures = failures.filter(
    ({ name }) => !CASES.find((testCase) => testCase.name === name)?.optional,
  );
  if (failures.length > 0) {
    console.error(`\n${failures.length} screenshot(s) failed:`);
    for (const { name, message } of failures) {
      console.error(`  - ${name}: ${message}`);
    }
  }
  if (hardFailures.length > 0) process.exit(1);
}

await main();
