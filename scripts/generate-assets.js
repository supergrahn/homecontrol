// Generates PNG assets from SVG sources using sharp.
// Inputs:
//  - assets/POTY-AppIcon-Foreground.svg -> assets/icon.png (1024x1024, white bg)
//  - assets/POTY-AppIcon-Foreground.svg -> assets/adaptive-icon.png (1024x1024, transparent bg)
//  - assets/POTY-Logo-Stacked.svg       -> assets/splash.png (2000x3200, centered, transparent bg)

const path = require("path");
const fs = require("fs");

async function main() {
  const sharp = require("sharp");
  const assetsDir = path.resolve(process.cwd(), "assets");

  const iconSrc = path.join(assetsDir, "POTY-Logo-Stacked.svg");
  const adaptiveSrc = path.join(assetsDir, "POTY-Logo-Stacked.svg");
  const splashSrc = path.join(assetsDir, "POTY-Logo-Stacked.svg");

  const iconOut = path.join(assetsDir, "icon.png");
  const adaptiveOut = path.join(assetsDir, "adaptive-icon.png");
  const splashOut = path.join(assetsDir, "splash.png");

  const ensureExists = (p) => {
    if (!fs.existsSync(p)) {
      throw new Error(`Missing required source: ${path.relative(process.cwd(), p)}`);
    }
  };

  ensureExists(iconSrc);
  ensureExists(adaptiveSrc);
  ensureExists(splashSrc);

  // icon.png: 1024x1024, white background, content centered with padding
  await sharp(iconSrc)
    .resize(1024, 1024, { fit: "contain", background: "#ffffff" })
    .png()
    .toFile(iconOut);
  console.log(`Wrote ${path.relative(process.cwd(), iconOut)}`);

  // adaptive-icon.png: 1024x1024, transparent background for Android foreground image
  await sharp(adaptiveSrc)
    .resize(1024, 1024, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toFile(adaptiveOut);
  console.log(`Wrote ${path.relative(process.cwd(), adaptiveOut)}`);

  // splash.png: 2000x3200 canvas, center the stacked logo at ~70% of width
  const canvasW = 2000;
  const canvasH = 3200;
  const logoW = Math.floor(canvasW * 0.7);
  const logoBuf = await sharp(splashSrc)
    .resize({ width: logoW, fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();

  await sharp({
    create: {
      width: canvasW,
      height: canvasH,
      channels: 4,
      background: { r: 255, g: 255, b: 255, alpha: 0 }, // transparent; Expo uses backgroundColor
    },
  })
    .composite([{ input: logoBuf, gravity: "center" }])
    .png()
    .toFile(splashOut);
  console.log(`Wrote ${path.relative(process.cwd(), splashOut)}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
