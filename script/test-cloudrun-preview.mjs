import assert from "node:assert/strict";
import { build } from "esbuild";
import { createRequire } from "node:module";
import vm from "node:vm";

const realRequire = createRequire(import.meta.url);

async function load(path, preview, overrides = {}, environment = {}) {
  const result = await build({ entryPoints: [path], bundle: false, platform: "node", format: "cjs", write: false, logLevel: "silent" });
  const module = { exports: {} };
  const context = {
    module,
    exports: module.exports,
    require(id) {
      if (Object.hasOwn(overrides, id)) return overrides[id];
      if (id.endsWith("migration-preview")) return { migrationPreview: preview };
      if (id.startsWith(".") || id.startsWith("@shared/")) return {};
      return realRequire(id);
    },
    process: {
      env: { NODE_ENV: "production", PORT: "8080", ...environment },
      on() {},
    },
    console: { log() {}, warn() {}, error() {} },
    Buffer,
    setInterval() { throw new Error("Unexpected scheduler activation"); },
    setTimeout() { throw new Error("Unexpected scheduled work"); },
    clearInterval() {},
    __dirname: "/preview/dist",
  };
  vm.runInNewContext(result.outputFiles[0].text, context, { filename: path });
  return module.exports;
}

async function boot(preview) {
  const calls = { vapid: 0, scheduler: 0, select: 0, activate: 0, registered: 0 };
  const middleware = [];
  const routes = new Map();
  let app;
  let complete;
  const listening = new Promise(resolve => { complete = resolve; });
  const express = () => {
    app = realRequire("express")();
    const use = app.use.bind(app);
    const get = app.get.bind(app);
    app.use = (...args) => { middleware.push(args); return use(...args); };
    app.get = (path, ...handlers) => {
      if (handlers.length) routes.set(path, handlers[0]);
      return get(path, ...handlers);
    };
    return app;
  };
  express.json = realRequire("express").json;
  express.urlencoded = realRequire("express").urlencoded;
  await load("server/index.ts", preview, {
    express,
    http: { createServer: () => ({ listen(options, callback) { calls.listen = options; callback(); complete(); } }) },
    "./routes": { async registerRoutes() { calls.registered++; } },
    "./static": { serveStatic() {} },
    "./arya/reminder-scheduler": {
      async initVapidKeys() { calls.vapid++; },
      startReminderScheduler() { calls.scheduler++; },
    },
    "./arya/razorpay-service": { async activateUserPlan() { calls.activate++; } },
    "./db": { db: {
      select() { calls.select++; return { from: () => ({ where: () => ({ limit: async () => [{ status: "active" }] }) }) }; },
      async execute() { throw new Error("private database error"); },
    } },
    "../shared/schema": { aryaSubscriptions: {} },
    "drizzle-orm": { eq() {}, and() {}, sql() {} },
  }, { ALLOWED_ORIGINS: "https://preview.example", REPLIT_DOMAINS: "legacy.example" });
  await listening;
  return { calls, middleware, routes };
}

const preview = await boot(true);
assert.equal(preview.calls.vapid, 0);
assert.equal(preview.calls.scheduler, 0);
assert.equal(preview.calls.select, 0);
assert.equal(preview.calls.activate, 0);
assert.equal(preview.calls.registered, 1);
assert.equal(preview.calls.listen.host, "0.0.0.0");
assert.equal(preview.calls.listen.port, 8080);
const legacy = await boot(false);
assert.equal(legacy.calls.vapid, 1);
assert.equal(legacy.calls.scheduler, 1);
assert.equal(legacy.calls.select, 1);
assert.equal(legacy.calls.registered, 1);

function response() {
  return { code: 200, body: null, status(code) { this.code = code; return this; }, json(body) { this.body = JSON.parse(JSON.stringify(body)); return this; } };
}
const paymentGuard = preview.middleware.find(args => Array.isArray(args[0]));
assert.equal(paymentGuard[0].length, 5);
for (const path of paymentGuard[0]) {
  const res = response();
  paymentGuard[1]({ method: "POST", path }, res, () => assert.fail("Payment mutation was allowed"));
  assert.equal(res.code, 503);
}
assert.equal(legacy.middleware.some(args => Array.isArray(args[0])), false);
const ready = response();
await preview.routes.get("/readyz")({}, ready);
assert.equal(ready.code, 503);
assert.deepEqual(ready.body, { status: "unavailable" });

// Exercise the real CORS middleware with both new and existing origin settings.
const cors = preview.middleware.find(args => args[0]?.name === "corsMiddleware")[0];
for (const origin of ["https://preview.example", "https://legacy.example", "https://unlisted.example"]) {
  const headers = {};
  const error = await new Promise(resolve => cors({ method: "GET", headers: { origin } }, {
    setHeader(key, value) { headers[key.toLowerCase()] = value; },
    getHeader(key) { return headers[key.toLowerCase()]; },
  }, resolve));
  if (origin.includes("unlisted")) assert.ok(error);
  else { assert.equal(error, undefined); assert.equal(headers["access-control-allow-origin"], origin); }
}

let databaseCalls = 0;
const poisonDb = new Proxy({}, { get() { databaseCalls++; throw new Error("Unexpected database access"); } });
const push = await load("server/arya/reminder-scheduler.ts", true, { "../db": { db: poisonDb } });
await push.sendPushToUser("test", "test", "test", "test");
push.startReminderScheduler();
assert.equal(databaseCalls, 0);
let emailCalls = 0;
const mailer = { createTransport() { emailCalls++; return { async sendMail() {} }; } };
const smtp = { SMTP_HOST: "example.invalid", SMTP_USER: "test", SMTP_PASS: "placeholder" };
await (await load("server/arya/email-service.ts", true, { nodemailer: mailer }, smtp)).sendWelcomeEmail("Test", "test@example.invalid");
assert.equal(emailCalls, 0);
await (await load("server/arya/email-service.ts", false, { nodemailer: mailer }, smtp)).sendWelcomeEmail("Test", "test@example.invalid");
assert.equal(emailCalls, 1);
const calendar = await load("server/arya/google-calendar.ts", true, { "../db": { db: poisonDb } });
assert.equal(await calendar.createCalendarEvent("test", "test", "test", "test"), null);
assert.equal(databaseCalls, 0);
const payments = await load("server/arya/razorpay-service.ts", true, { "../db": { db: poisonDb } }, { RAZORPAY_PLAN_ID_CORE: "plan_placeholder" });
await assert.rejects(payments.createSubscription("core", "test"), /Payments are unavailable during migration testing/);
assert.equal(databaseCalls, 0);
console.log("PASS: preview startup, legacy startup, payment guards, CORS, readiness errors, push, email and calendar guards.");
