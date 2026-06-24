import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

test("home divination illustration uses the local fortune tube", () => {
  const app = read("src/App.tsx");
  const homeImage = app.match(/id="home-mini-tube-img"[\s\S]*?\/>/)?.[0] ?? "";

  assert.match(homeImage, /src=\{FORTUNE_TUBE_IMAGE\}/);
  assert.doesNotMatch(homeImage, /googleusercontent\.com/);
});

test("active ritual renders a full viewport overlay with a media fallback", () => {
  const componentPath = path.join(root, "src/components/DivinationRitualOverlay.tsx");
  assert.equal(fs.existsSync(componentPath), true, "full-screen ritual component should exist");

  const app = read("src/App.tsx");
  const overlay = read("src/components/DivinationRitualOverlay.tsx");
  const styles = read("src/index.css");

  assert.match(app, /\{isShaking && \([\s\S]*?<DivinationRitualOverlay/);
  assert.equal(
    app.match(/FORTUNE_TUBE_RITUAL_VIDEO/g)?.length,
    2,
    "the ritual video constant should only be declared and passed to the full-screen overlay"
  );
  assert.match(overlay, /fixed inset-0/);
  assert.match(overlay, /object-cover/);
  assert.match(overlay, /100dvh/);
  assert.match(overlay, /poster=\{posterSrc\}/);
  assert.match(overlay, /onError/);
  assert.match(overlay, /motion-reduce:/);
  assert.match(overlay, /data-ritual-foreground/);
  assert.match(overlay, /object-contain/);
  assert.doesNotMatch(overlay, /scale-\[1\.03\][^"\n]*object-cover/);
  assert.match(overlay, /bottom-\[clamp\(7\.5rem,18vh,10rem\)\]/);
  assert.equal((overlay.match(/<video/g) ?? []).length, 1);
  assert.match(styles, /@keyframes ritual-mist-drift/);
});

test("supabase client uses statically replaceable Vite environment variables", () => {
  const supabaseClient = read("src/lib/supabase.ts");

  assert.match(supabaseClient, /import\.meta\.env\.VITE_SUPABASE_URL/);
  assert.match(supabaseClient, /import\.meta\.env\.VITE_SUPABASE_ANON_KEY/);
  assert.doesNotMatch(supabaseClient, /\(import\.meta as any\)\.env/);
});
