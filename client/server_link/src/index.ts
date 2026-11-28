import dotenv from "dotenv";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import mongoose from "mongoose";
import { reportOperationalIssue, startApplicationMonitoring } from "./monitoring.js";
dotenv.config({
  path: resolve(dirname(fileURLToPath(import.meta.url)), "../.env"),
});
const { default: app } = await import("./app.js");
const port = Number(process.env.PORT || process.env.API_PORT || 4000);
const uri = process.env.MONGODB_URI;
const razorpayKeyId = process.env.RAZORPAY_KEY_ID?.trim();
const razorpayKeySecret = process.env.RAZORPAY_KEY_SECRET?.trim();
console.info(
  JSON.stringify({
    level: "info",
    message: "Razorpay configuration",
    mode: process.env.RAZORPAY_MODE || "test",
    keyIdPresent: Boolean(razorpayKeyId),
    keySecretPresent: Boolean(razorpayKeySecret),
    testKey: razorpayKeyId?.startsWith("rzp_test_") ?? false,
  }),
);
if (!uri) {
  console.error(
    "MONGODB_URI is required. Copy .env.example to .env and configure it.",
  );
  process.exit(1);
}
mongoose
  .connect(uri)
  .then(() => {
    startApplicationMonitoring();
    app.listen(port, () =>
      console.log(`CricketVault API listening on :${port}`),
    );
  })
  .catch((error) => {
    console.error("MongoDB connection failed", error.message);
    process.exit(1);
  });

process.on("unhandledRejection", (reason) => {
  const detail = reason instanceof Error ? reason.message : String(reason);
  console.error("Unhandled promise rejection", detail);
  void reportOperationalIssue("unhandled-rejection", "Unhandled server error", detail);
});

process.on("uncaughtException", (error) => {
  console.error("Uncaught server exception", error.message);
  void reportOperationalIssue("uncaught-exception", "API process crashed", error.message).finally(() => {
    // PM2 restarts the process. A short delay gives the HTTPS email request time to leave the server.
    setTimeout(() => process.exit(1), 2_000).unref();
  });
});
