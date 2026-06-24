import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const exists = (file) => fs.existsSync(path.join(root, file));

test("auth endpoints are proxied through Cloudflare Pages Functions", () => {
  assert.equal(exists("functions/api/auth/signup.ts"), true);
  assert.equal(exists("functions/api/auth/login.ts"), true);

  const signup = read("functions/api/auth/signup.ts");
  const login = read("functions/api/auth/login.ts");

  assert.match(signup, /\/auth\/v1\/signup/);
  assert.match(login, /\/auth\/v1\/token\?grant_type=password/);
  assert.match(signup, /VITE_SUPABASE_ANON_KEY/);
  assert.match(login, /VITE_SUPABASE_ANON_KEY/);
  assert.doesNotMatch(signup, /@supabase\/supabase-js/);
  assert.doesNotMatch(login, /@supabase\/supabase-js/);
});

test("login form calls local auth proxy instead of browser-to-Supabase auth", () => {
  const loginRegister = read("src/components/LoginRegister.tsx");

  assert.match(loginRegister, /requestAuth\("\/api\/auth\/login"/);
  assert.match(loginRegister, /requestAuth\("\/api\/auth\/signup"/);
  assert.doesNotMatch(loginRegister, /supabase\.auth\.signUp/);
  assert.doesNotMatch(loginRegister, /supabase\.auth\.signInWithPassword/);
});
