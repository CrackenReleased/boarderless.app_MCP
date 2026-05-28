// helpers/standardize_images.js
import fs from 'node:fs/promises';
import path from 'node:path';
import { existsSync } from 'node:fs';
import convert from 'heic-convert';
import Jimp from 'jimp';

function naturalSortKey(s) {
  return s.split(/(\d+)/).map(text => {
    const num = parseInt(text, 10);
    return isNaN(num) ? text.toLowerCase() : num;
  });
}

function naturalCompare(a, b) {
  const keyA = naturalSortKey(a);
  const keyB = naturalSortKey(b);
  for (let i = 0; i < Math.max(keyA.length, keyB.length); i++) {
    if (keyA[i] === undefined) return -1;
    if (keyB[i] === undefined) return 1;
    if (keyA[i] !== keyB[i]) {
      if (typeof keyA[i] === 'number' && typeof keyB[i] === 'number') {
        return keyA[i] - keyB[i];
      }
      return String(keyA[i]).localeCompare(String(keyB[i]));
    }
  }
  return 0;
}

// Parses JPEG marker segments to see if progressive (SOF2 marker) or CMYK (4 components in SOF0/SOF2).
async function checkJpegStatus(filepath) {
  const buffer = await fs.readFile(filepath);
  let isProgressive = false;
  let isCmyk = false;

  // JPEG starts with SOI (0xFFD8)
  if (buffer[0] !== 0xFF || buffer[1] !== 0xD8) {
    return { isProgressive, isCmyk, isValidJpeg: false };
  }

  let i = 2;
  while (i < buffer.length) {
    // Markers are prefixed by 0xFF. If a padding 0xFF is present, skip it.
    while (buffer[i] === 0xFF) {
      i++;
    }
    if (i >= buffer.length) break;
    
    const marker = buffer[i];
    i++;

    // Stop on SOS (Start of Scan) or EOI (End of Image)
    if (marker === 0xDA || marker === 0xD9) {
      break;
    }

    // Marker segment length
    if (i + 1 >= buffer.length) break;
    const length = buffer.readUInt16BE(i);

    if (marker === 0xC2) {
      isProgressive = true;
    }

    if (marker === 0xC0 || marker === 0xC2) {
      // SOF0 (Baseline) or SOF2 (Progressive)
      // Structure: i + 2: precision, i + 3: height (2B), i + 5: width (2B), i + 7: components (1B)
      const numComponents = buffer[i + 7];
      if (numComponents === 4) {
        isCmyk = true;
      }
    }

    i += length;
  }

  return { isProgressive, isCmyk, isValidJpeg: true };
}

export async function standardize(seniorsDir) {
  if (!existsSync(seniorsDir)) {
    return `Error: Seniors directory does not exist at ${seniorsDir}`;
  }

  const entries = await fs.readdir(seniorsDir, { withFileTypes: true });
  const subdirs = entries
    .filter(e => e.isDirectory())
    .map(e => e.name)
    .sort(naturalCompare);

  let modifiedCount = 0;
  let heicConverted = 0;
  let errors = 0;
  const report = [];

  for (const subdir of subdirs) {
    const subdirPath = path.join(seniorsDir, subdir);
    const filesInDir = await fs.readdir(subdirPath, { withFileTypes: true });
    const files = filesInDir
      .filter(e => e.isFile())
      .map(e => e.name);

    report.push(`\nScanning Folder: ${subdir}`);
    report.push("-".repeat(40));

    for (const file of files.sort(naturalCompare)) {
      const filepath = path.join(subdirPath, file);
      const ext = path.extname(file).toLowerCase();

      if (ext === ".heic") {
        const jpgName = path.basename(file, ext) + ".jpg";
        const jpgPath = path.join(subdirPath, jpgName);
        report.push(`  HEIC -> JPG: ${file} -> ${jpgName}`);
        try {
          const inputBuffer = await fs.readFile(filepath);
          const outputBuffer = await convert({
            buffer: inputBuffer,
            format: 'JPEG',
            quality: 95
          });
          await fs.writeFile(jpgPath, outputBuffer);
          await fs.unlink(filepath);
          heicConverted++;
        } catch (e) {
          report.push(`    ERROR converting HEIC ${file}: ${e.message}`);
          errors++;
        }
        continue;
      }

      if (ext === ".jpg" || ext === ".jpeg") {
        try {
          const status = await checkJpegStatus(filepath);
          if (status.isValidJpeg && (status.isProgressive || status.isCmyk)) {
            report.push(`  Standardizing JPEG: ${file} (Progressive: ${status.isProgressive}, CMYK: ${status.isCmyk})`);
            try {
              // Jimp automatically converts image modes to baseline RGBA, saving as standard baseline JPEG
              const image = await Jimp.read(filepath);
              const tempPath = filepath + ".tmp";
              await image.quality(95).writeAsync(tempPath);
              await fs.rename(tempPath, filepath);
              modifiedCount++;
            } catch (e) {
              report.push(`    ERROR standardizing ${file}: ${e.message}`);
              errors++;
            }
          }
        } catch (e) {
          // Ignore parse errors, proceed
        }
      }
    }
  }

  report.push("\n" + "=".repeat(50));
  report.push("Standardization Complete!");
  report.push(`JPEGs converted to baseline: ${modifiedCount}`);
  report.push(`HEIC files converted to JPG: ${heicConverted}`);
  report.push(`Errors encountered:           ${errors}`);
  report.push("=".repeat(50));
  return report.join("\n");
}

// Support command line usage
if (process.argv[1] && (process.argv[1].endsWith('standardize_images.js') || process.argv[1].endsWith('standardize_images.js"'))) {
  const args = process.argv.slice(2);
  let dir = '';

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--dir' && args[i + 1]) {
      dir = args[i + 1];
    }
  }

  if (!dir) {
    console.error("Error: --dir parameter is required.");
    process.exit(1);
  }

  standardize(dir)
    .then(console.log)
    .catch(console.error);
}
