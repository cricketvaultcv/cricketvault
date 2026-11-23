import dotenv from "dotenv";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import { User } from "./models.js";

dotenv.config({
  path: resolve(dirname(fileURLToPath(import.meta.url)), "../.env"),
});

const uri = process.env.MONGODB_URI;
const name = process.env.BOOTSTRAP_ADMIN_NAME?.trim();
const email = process.env.BOOTSTRAP_ADMIN_EMAIL?.trim().toLowerCase();
const password = process.env.BOOTSTRAP_ADMIN_PASSWORD;

if (!uri || !name || !email || !password) {
  throw new Error(
    "MONGODB_URI, BOOTSTRAP_ADMIN_NAME, BOOTSTRAP_ADMIN_EMAIL, and BOOTSTRAP_ADMIN_PASSWORD are required",
  );
}
if (password.length < 12 || password.length > 128) {
  throw new Error("Bootstrap administrator password must be 12-128 characters");
}

try {
  await mongoose.connect(uri);
  if (await User.exists({ email })) {
    throw new Error("An account with that email already exists; no changes were made");
  }
  const user = await User.create({
    name,
    email,
    passwordHash: await bcrypt.hash(password, 12),
    role: "ADMIN",
    status: "ACTIVE",
  });
  console.info(`Created administrator account ${user.email}`);
} finally {
  await mongoose.disconnect();
}
