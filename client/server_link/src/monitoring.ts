import mongoose from "mongoose";
import { sendEmail } from "./email.js";

type AlertLevel = "critical" | "warning" | "resolved";

const cooldownMs = Number(process.env.MONITORING_ALERT_COOLDOWN_MS || 15 * 60 * 1000);
const lastAlertAt = new Map<string, number>();
let databaseUnavailable = false;

function monitoringRecipient() {
  return process.env.MONITORING_ALERT_EMAIL?.trim();
}

function shouldSend(key: string, level: AlertLevel) {
  if (level === "resolved") return true;
  const previous = lastAlertAt.get(key) || 0;
  if (Date.now() - previous < cooldownMs) return false;
  lastAlertAt.set(key, Date.now());
  return true;
}

export async function reportOperationalIssue(
  key: string,
  title: string,
  detail: string,
  level: AlertLevel = "critical",
) {
  const recipient = monitoringRecipient();
  if (!recipient || !shouldSend(key, level)) return;
  const label = level === "resolved" ? "Resolved" : level === "warning" ? "Warning" : "Action required";
  try {
    await sendEmail({
      to: recipient,
      subject: `[CricketVault] ${label}: ${title}`,
      text: `${label}: ${title}\n\n${detail}\n\nServer: ${process.env.HOSTNAME || "CricketVault VPS"}\nTime: ${new Date().toISOString()}`,
      preheader: `${label}: ${title}`,
      html: `<p style="margin-top:0;font-size:13px;font-weight:700;text-transform:uppercase;color:${level === "resolved" ? "#047857" : "#b45309"};">${label}</p><h1 style="margin:0 0 16px;font-size:24px;line-height:1.25;color:#0f172a;">${escapeHtml(title)}</h1><p>${escapeHtml(detail)}</p><p style="margin-bottom:0;color:#64748b;font-size:13px;">Server: ${escapeHtml(process.env.HOSTNAME || "CricketVault VPS")}<br>Time: ${new Date().toISOString()}</p>`,
    });
  } catch (error) {
    // Never let a failed notification take down the API or create an alert loop.
    console.error(JSON.stringify({
      level: "error",
      message: "Unable to send operational alert",
      alertKey: key,
      error: error instanceof Error ? error.message : "Unknown alert error",
    }));
  }
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  })[character]!);
}

export function startApplicationMonitoring() {
  const checkDatabase = () => {
    const connected = mongoose.connection.readyState === 1;
    if (!connected && !databaseUnavailable) {
      databaseUnavailable = true;
      void reportOperationalIssue(
        "mongodb-unavailable",
        "Database connection is unavailable",
        "The API is running but it cannot currently reach MongoDB. Player requests may fail until the connection is restored.",
      );
    } else if (connected && databaseUnavailable) {
      databaseUnavailable = false;
      void reportOperationalIssue(
        "mongodb-unavailable",
        "Database connection restored",
        "The API has reconnected to MongoDB and normal service has resumed.",
        "resolved",
      );
    }
  };

  mongoose.connection.on("error", (error) => {
    void reportOperationalIssue("mongodb-error", "MongoDB connection error", error.message);
  });
  mongoose.connection.on("disconnected", checkDatabase);
  mongoose.connection.on("connected", checkDatabase);
  setInterval(checkDatabase, 60_000).unref();
}
