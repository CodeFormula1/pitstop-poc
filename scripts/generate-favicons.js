/**
 * Favicon Generator Script
 * Generates PNG favicons at multiple sizes from the SVG source
 * 
 * Usage: node scripts/generate-favicons.js
 * 
 * Requires: sharp (npm install sharp --save-dev)
 */

const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

const PUBLIC_DIR = path.join(__dirname, '..', 'public');
const SVG_SOURCE = path.join(PUBLIC_DIR, 'favicon.svg');

// Sizes to generate
const SIZES = [
  { name: 'favicon-16.png', size: 16 },
  { name: 'favicon-32.png', size: 32 },
  { name: 'apple-touch-icon.png', size: 180 },
  // Additional sizes for favicon.ico
  { name: 'favicon-48.png', size: 48 },
];

async function generateFavicons() {
  console.log('🏎️  Generating favicons for CodeFx...\n');

  // Check if SVG source exists
  if (!fs.existsSync(SVG_SOURCE)) {
    console.error('❌ SVG source not found at:', SVG_SOURCE);
    process.exit(1);
  }

  // Read the SVG
  const svgBuffer = fs.readFileSync(SVG_SOURCE);

  for (const { name, size } of SIZES) {
    const outputPath = path.join(PUBLIC_DIR, name);
    
    try {
      await sharp(svgBuffer)
        .resize(size, size, {
          fit: 'contain',
          background: { r: 0, g: 0, b: 0, alpha: 0 } // Transparent background
        })
        .png()
        .toFile(outputPath);
      
      console.log(`✅ Generated ${name} (${size}×${size})`);
    } catch (err) {
      console.error(`❌ Failed to generate ${name}:`, err.message);
    }
  }

  console.log('\n📝 To generate favicon.ico, use an online tool like:');
  console.log('   https://favicon.io/favicon-converter/');
  console.log('   Upload favicon-16.png, favicon-32.png, and favicon-48.png');
  console.log('\n✨ Done! Files saved to public/');
}

generateFavicons().catch(console.error);


