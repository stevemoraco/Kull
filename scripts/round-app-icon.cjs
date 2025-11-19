const sharp = require('sharp');
const path = require('path');

const inputPath = path.join(__dirname, '../apps/Kull Universal App/kull/kull/Assets.xcassets/AppIcon.appiconset/app-icon-1024.png');
const outputPath = inputPath; // Overwrite the original

async function roundIcon() {
  try {
    const size = 1024;
    // iOS uses approximately 22.37% corner radius (229px for 1024x1024)
    const cornerRadius = Math.round(size * 0.2237);

    // Create an SVG for the rounded rectangle mask
    const roundedCorners = Buffer.from(
      `<svg width="${size}" height="${size}">
        <rect x="0" y="0" width="${size}" height="${size}" rx="${cornerRadius}" ry="${cornerRadius}" fill="white"/>
      </svg>`
    );

    // Load the image and apply the mask
    await sharp(inputPath)
      .resize(size, size, {
        fit: 'cover',
        position: 'center'
      })
      .composite([
        {
          input: roundedCorners,
          blend: 'dest-in'
        }
      ])
      .png()
      .toFile(outputPath + '.tmp');

    // Replace original
    const fs = require('fs');
    fs.renameSync(outputPath + '.tmp', outputPath);

    console.log(`✅ Successfully rounded app icon with ${cornerRadius}px corner radius`);
    console.log(`📍 Location: ${outputPath}`);
  } catch (error) {
    console.error('❌ Error processing icon:', error);
    process.exit(1);
  }
}

roundIcon();
