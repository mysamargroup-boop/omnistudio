import fs from "node:fs";
import path from "node:path";

const rootDir = process.cwd();

console.log("🔍 [OmniStudio Test Suite] Running Automated Frontend Integrity & Contract Checks...\n");

let errors = 0;
let passes = 0;

function checkFileExists(relPath) {
  const full = path.join(rootDir, relPath);
  if (fs.existsSync(full)) {
    console.log(`  ✅ Exists: ${relPath}`);
    passes++;
    return true;
  } else {
    console.error(`  ❌ Missing file: ${relPath}`);
    errors++;
    return false;
  }
}

function verifyFileExports(relPath, requiredTokens) {
  const full = path.join(rootDir, relPath);
  if (!fs.existsSync(full)) {
    console.error(`  ❌ Missing: ${relPath}`);
    errors++;
    return;
  }
  const content = fs.readFileSync(full, "utf8");
  for (const token of requiredTokens) {
    if (content.includes(token)) {
      passes++;
    } else {
      console.error(`  ❌ ${relPath} missing expected token: "${token}"`);
      errors++;
    }
  }
  console.log(`  ✅ Verified contract tokens for ${relPath}`);
}

console.log("1. Verifying Core Studio Route Endpoints:");
const routes = [
  "src/app/page.tsx",
  "src/app/video/page.tsx",
  "src/app/image/page.tsx",
  "src/app/voice/page.tsx",
  "src/app/publish/page.tsx",
  "src/app/pipeline/page.tsx",
  "src/app/vault/page.tsx",
  "src/app/settings/page.tsx",
];
routes.forEach(checkFileExists);

console.log("\n2. Verifying Cinema Director & Motion Rig Modular Components:");
verifyFileExports("src/components/video/MotionRigVectorPad.tsx", [
  "DEFAULT_MOTION_RIG",
  "MotionRigConfig",
  "FOCAL_LENSES",
  "APERTURES",
  "SHUTTER_ANGLES",
  "COLOR_LUTS",
]);

verifyFileExports("src/components/video/ViewportHudOverlay.tsx", [
  "ViewportHudOverlay",
  "aspectRatio",
  "fps",
  "resolution",
  "ANAMORPHIC SCOPE 2.39:1 MASK",
]);

verifyFileExports("src/components/video/StoryboardTimelineStrip.tsx", [
  "StoryboardTimelineStrip",
  "StoryboardShot",
  "DEFAULT_SHOTS",
  "totalDurationStr",
]);

console.log("\n3. Verifying Brand Kit & Precision Video Components:");
verifyFileExports("src/components/brand/BrandKitModal.tsx", [
  "BrandKitModal",
  "BrandKitData",
  "PRESET_TEMPLATES",
]);

verifyFileExports("src/components/video/PrecisionVideoEditor.tsx", [
  "PrecisionVideoEditor",
  "PrecisionVideoEditorProps",
  "LUT_PRESETS",
]);

console.log("\n------------------------------------------------");
console.log(`Total Checks: ${passes + errors} | Passed: ${passes} | Failed: ${errors}`);
if (errors > 0) {
  console.error("❌ Integrity checks failed!");
  process.exit(1);
} else {
  console.log("✨ 100% Frontend Integrity & Contract Checks Passed Cleanly!");
  process.exit(0);
}
