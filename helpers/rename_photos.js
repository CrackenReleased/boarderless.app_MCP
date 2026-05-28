// helpers/rename_photos.js
import fs from 'node:fs/promises';
import path from 'node:path';
import { existsSync } from 'node:fs';

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

function extractNumber(filename) {
  const match = filename.match(/\d+/);
  return match ? parseInt(match[0], 10) : null;
}

export async function performRenaming(seniorsDir, mode) {
  if (!existsSync(seniorsDir)) {
    return `Error: Seniors directory does not exist at ${seniorsDir}`;
  }

  const entries = await fs.readdir(seniorsDir, { withFileTypes: true });
  const subdirs = entries
    .filter(e => e.isDirectory())
    .map(e => e.name)
    .sort(naturalCompare);

  let totalRenamed = 0;
  const report = [];

  for (const subdir of subdirs) {
    const seniorNamePrefix = subdir.replace(/\s+/g, '');
    const subdirPath = path.join(seniorsDir, subdir);

    const filesInDir = await fs.readdir(subdirPath, { withFileTypes: true });
    const files = filesInDir
      .filter(e => e.isFile())
      .map(e => e.name);
    
    const sortedFiles = files.sort(naturalCompare);

    report.push(`\nProcessing Folder: ${subdir}`);
    report.push("-".repeat(40));

    if (mode === "sequential") {
      // Step 1: Rename to temporary names to prevent any collision
      const tempRenames = [];
      for (let idx = 0; idx < sortedFiles.length; idx++) {
        const file = sortedFiles[idx];
        const filePath = path.join(subdirPath, file);
        const ext = path.extname(file);
        const tempName = `__temp_${String(idx).padStart(3, '0')}__${ext}`;
        const tempPath = path.join(subdirPath, tempName);

        try {
          await fs.rename(filePath, tempPath);
          tempRenames.push({ tempPath, idx, ext });
        } catch (e) {
          report.push(`  Error during temp rename of ${file}: ${e.message}`);
        }
      }

      // Step 2: Rename from temporary names to final sequential names
      for (const { tempPath, idx, ext } of tempRenames) {
        const finalName = `${seniorNamePrefix}_${String(idx + 1).padStart(2, '0')}${ext}`;
        const finalPath = path.join(subdirPath, finalName);

        try {
          await fs.rename(tempPath, finalPath);
          report.push(`  ${sortedFiles[idx]} -> ${finalName}`);
          totalRenamed++;
        } catch (e) {
          report.push(`  Error during final rename to ${finalName}: ${e.message}`);
        }
      }
    } else {
      // gap_fill mode: Keep existing numbers and fill remaining slots
      const numberedFiles = [];
      const otherFiles = [];

      for (const f of sortedFiles) {
        const num = extractNumber(f);
        if (num !== null && num <= 20) {
          numberedFiles.push({ file: f, num });
        } else {
          otherFiles.push(f);
        }
      }

      // Map of number -> original filename
      const mapping = new Map();
      const usedNumbers = new Set();

      for (const { file, num } of numberedFiles) {
        mapping.set(num, file);
        usedNumbers.add(num);
      }

      // Fill gaps (1 to 20) with other files
      const gaps = [];
      for (let n = 1; n <= 20; n++) {
        if (!usedNumbers.has(n)) {
          gaps.push(n);
        }
      }

      for (let idx = 0; idx < otherFiles.length; idx++) {
        const f = otherFiles[idx];
        if (idx < gaps.length) {
          mapping.set(gaps[idx], f);
        }
      }

      // Perform rename via temp step to prevent collisions
      const tempRenames = [];
      const sortedNums = Array.from(mapping.keys()).sort((a, b) => a - b);

      for (const num of sortedNums) {
        const file = mapping.get(num);
        const filePath = path.join(subdirPath, file);
        const ext = path.extname(file);
        const tempName = `__temp_${String(num).padStart(3, '0')}__${ext}`;
        const tempPath = path.join(subdirPath, tempName);

        try {
          await fs.rename(filePath, tempPath);
          tempRenames.push({ tempPath, num, ext, origFile: file });
        } catch (e) {
          report.push(`  Error during temp rename of ${file}: ${e.message}`);
        }
      }

      for (const { tempPath, num, ext, origFile } of tempRenames) {
        const finalName = `${seniorNamePrefix}_${String(num).padStart(2, '0')}${ext}`;
        const finalPath = path.join(subdirPath, finalName);

        try {
          await fs.rename(tempPath, finalPath);
          report.push(`  ${origFile} -> ${finalName}`);
          totalRenamed++;
        } catch (e) {
          report.push(`  Error during final rename to ${finalName}: ${e.message}`);
        }
      }
    }
  }

  report.push("\n" + "=".repeat(50));
  report.push("Renaming Complete!");
  report.push(`Total files successfully numbered: ${totalRenamed}`);
  report.push("=".repeat(50));
  return report.join("\n");
}

// Support command line usage
if (process.argv[1] && (process.argv[1].endsWith('rename_photos.js') || process.argv[1].endsWith('rename_photos.js"'))) {
  const args = process.argv.slice(2);
  let dir = '';
  let mode = 'sequential';

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--dir' && args[i + 1]) {
      dir = args[i + 1];
    } else if (args[i] === '--mode' && args[i + 1]) {
      mode = args[i + 1];
    }
  }

  if (!dir) {
    console.error("Error: --dir parameter is required.");
    process.exit(1);
  }

  performRenaming(dir, mode)
    .then(console.log)
    .catch(console.error);
}
