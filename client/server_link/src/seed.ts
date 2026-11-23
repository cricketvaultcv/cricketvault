import dotenv from "dotenv";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import { User, Player, Coach, Plan } from "./models.js";
dotenv.config({
  path: resolve(dirname(fileURLToPath(import.meta.url)), "../.env"),
});
const uri = process.env.MONGODB_URI;
if (!uri) throw new Error("MONGODB_URI is required");
if (process.env.NODE_ENV === "production") {
  throw new Error("The demo seed script cannot run in production");
}
const password = process.env.DEMO_ADMIN_PASSWORD;
if (!password)
  throw new Error("Set DEMO_ADMIN_PASSWORD to seed the administrator");
const coachPassword = process.env.DEMO_COACH_PASSWORD;
if (!coachPassword)
  throw new Error("Set DEMO_COACH_PASSWORD to seed the demonstration coach");
const playerPassword = process.env.DEMO_PLAYER_PASSWORD;
if (!playerPassword)
  throw new Error("Set DEMO_PLAYER_PASSWORD to seed the demonstration player");
await mongoose.connect(uri);
const admin = await User.findOneAndUpdate(
  { email: "admin@cricketvault.demo" },
  {
    name: "Demo Administrator",
    email: "admin@cricketvault.demo",
    passwordHash: await bcrypt.hash(password, 12),
    role: "ADMIN",
    status: "ACTIVE",
  },
  { upsert: true, new: true },
);
const coachUser = await User.findOneAndUpdate(
  { email: "coach@cricketvault.demo" },
  {
    name: "Anika Sharma",
    email: "coach@cricketvault.demo",
    passwordHash: await bcrypt.hash(coachPassword, 12),
    role: "COACH",
    status: "ACTIVE",
  },
  { upsert: true, new: true },
);
await Coach.findOneAndUpdate(
  { user: coachUser._id },
  {
    bio: "Former state player focused on technically sound batting.",
    experience: 12,
    pricePerReview: 299,
    specialties: ["Batting", "Fielding"],
    levels: ["Beginner", "Intermediate"],
    formats: ["T20", "ODI"],
    available: true,
    capacity: 8,
    approved: true,
  },
  { upsert: true },
);
const playerUser = await User.findOneAndUpdate(
  { email: "player@cricketvault.demo" },
  {
    name: "Demo Player",
    email: "player@cricketvault.demo",
    passwordHash: await bcrypt.hash(playerPassword, 12),
    role: "PLAYER",
    status: "ACTIVE",
  },
  { upsert: true, new: true },
);
await Player.findOneAndUpdate(
  { user: playerUser._id },
  {
    playingRole: "Batter",
    battingStyle: "Right-hand bat",
    bowlingStyle: "None",
    ageGroup: "Under 19",
    skillLevel: "Beginner",
    goals: [],
    location: "",
    availability: "",
  },
  { upsert: true },
);
await Plan.updateMany(
  { name: { $in: ["Foundation", "Performance"] } },
  { $set: { published: false } },
);
await Plan.bulkWrite([
  {
    updateOne: {
      filter: { name: "Basic Review" },
      update: {
        $set: {
          name: "Basic Review",
          description: "Get focused feedback on one training video.",
          pricePaise: 19900,
          durationDays: 30,
          maxVideos: 1,
          includedReviews: 1,
          feedbackFrequency: "2-3 days turnaround",
          features: ["One video review", "Technical observations", "Action-plan tasks"],
          published: true,
        },
      },
      upsert: true,
    },
  },
  {
    updateOne: {
      filter: { name: "Premium Review" },
      update: {
        $set: {
          name: "Premium Review",
          description: "Detailed technical analysis with a personalized drill plan.",
          pricePaise: 39900,
          durationDays: 45,
          maxVideos: 1,
          includedReviews: 1,
          feedbackFrequency: "1-2 days turnaround",
          features: ["Detailed video review", "Technical analysis", "Personalized action plan"],
          published: true,
        },
      },
      upsert: true,
    },
  },
  {
    updateOne: {
      filter: { name: "Monthly Mentorship" },
      update: {
        $set: {
          name: "Monthly Mentorship",
          description: "Continuous guidance to improve your game week after week.",
          pricePaise: 79900,
          durationDays: 30,
          maxVideos: 4,
          includedReviews: 4,
          feedbackFrequency: "Weekly",
          features: ["Dedicated coach", "Four video submissions", "Ongoing action plan"],
          published: true,
        },
      },
      upsert: true,
    },
  },
]);
console.log(
  `Seeded ${admin.email}, ${coachUser.email}, and ${playerUser.email}; passwords are supplied through DEMO_*_PASSWORD variables.`,
);
await mongoose.disconnect();
