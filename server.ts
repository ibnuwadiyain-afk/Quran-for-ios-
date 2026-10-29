import express from 'express';
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { createServer as createViteServer } from 'vite';

const app = express();
const PORT = 3000;
const ROOT_DIR = process.cwd();
const QURAN_IOS_DIR = path.join(ROOT_DIR, 'quran-ios');

app.use(express.json());

interface PngInfo {
  filename: string;
  width: number;
  height: number;
  bitDepth: number;
  colorType: number;
  hasAlpha: boolean;
  sizeBytes: number;
}

function readPngHeader(filePath: string): PngInfo | null {
  try {
    const stat = fs.statSync(filePath);
    const buf = fs.readFileSync(filePath);
    if (buf.length < 26 || buf.toString('ascii', 1, 4) !== 'PNG') {
      return null;
    }
    const width = buf.readUInt32BE(16);
    const height = buf.readUInt32BE(20);
    const bitDepth = buf.readUInt8(24);
    const colorType = buf.readUInt8(25);
    return {
      filename: path.basename(filePath),
      width,
      height,
      bitDepth,
      colorType,
      hasAlpha: colorType === 4 || colorType === 6,
      sizeBytes: stat.size,
    };
  } catch {
    return null;
  }
}

function listProjectFilesRecursive(dir: string, baseRel = ''): Array<{ path: string; sizeBytes: number; category: string }> {
  const results: Array<{ path: string; sizeBytes: number; category: string }> = [];
  if (!fs.existsSync(dir)) return results;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const relPath = baseRel ? `${baseRel}/${entry.name}` : entry.name;
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...listProjectFilesRecursive(fullPath, relPath));
    } else if (entry.isFile()) {
      const stat = fs.statSync(fullPath);
      let category = 'Configuration';
      if (relPath.startsWith('Sources/')) category = 'Swift Source';
      else if (relPath.includes('Assets.xcassets')) category = 'Asset Catalog';
      else if (relPath.includes('BundledData')) category = 'Bundled Quran Data';
      else if (relPath.startsWith('Supporting/')) category = 'App Bundle Support';
      else if (relPath.startsWith('scripts/') || relPath.startsWith('.github/')) category = 'Build & Signing Automation';
      else if (relPath.includes('.xcodeproj')) category = 'Xcode Project';
      results.push({ path: relPath, sizeBytes: stat.size, category });
    }
  }
  return results;
}

app.get('/api/project/overview', (_req, res) => {
  try {
    const sourcesDir = path.join(QURAN_IOS_DIR, 'Sources');
    const swiftFiles = fs.existsSync(sourcesDir)
      ? fs
          .readdirSync(sourcesDir)
          .filter((f) => f.endsWith('.swift'))
          .sort()
      : [];

    const iOS13BannedPatterns = [
      { token: 'UISceneDelegate', reason: 'iOS 13.0+ Scene lifecycle API' },
      { token: 'UIWindowScene', reason: 'iOS 13.0+ WindowScene API' },
      { token: 'UIImage(systemName:', reason: 'iOS 13.0+ SF Symbols API' },
      { token: 'UIColor.systemBackground', reason: 'iOS 13.0+ dynamic color API' },
      { token: 'import SwiftUI', reason: 'iOS 13.0+ SwiftUI framework' },
      { token: 'import Combine', reason: 'iOS 13.0+ Combine framework' },
    ];

    const swiftAudits = swiftFiles.map((filename) => {
      const fullPath = path.join(sourcesDir, filename);
      const content = fs.readFileSync(fullPath, 'utf-8');
      const lines = content.split('\n').length;
      const sizeBytes = Buffer.byteLength(content, 'utf-8');
      const violations = iOS13BannedPatterns
        .filter((p) => content.includes(p.token))
        .map((p) => p.reason);

      const frameworks = Array.from(content.matchAll(/^import\s+([A-Za-z0-9_]+)/gm)).map((m) => m[1]);
      return {
        filename,
        path: `Sources/${filename}`,
        lines,
        sizeBytes,
        frameworks,
        ios12Compatible: violations.length === 0,
        violations,
      };
    });

    const appIconDir = path.join(QURAN_IOS_DIR, 'Resources', 'Assets.xcassets', 'AppIcon.appiconset');
    const appIcons: PngInfo[] = [];
    if (fs.existsSync(appIconDir)) {
      const iconFiles = fs
        .readdirSync(appIconDir)
        .filter((f) => f.endsWith('.png'))
        .sort();
      for (const f of iconFiles) {
        const info = readPngHeader(path.join(appIconDir, f));
        if (info) appIcons.push(info);
      }
    }

    const bundledDir = path.join(QURAN_IOS_DIR, 'Resources', 'BundledData');
    const bundledAssets: Array<{ filename: string; sizeBytes: number; summary: string }> = [];
    if (fs.existsSync(bundledDir)) {
      for (const f of fs.readdirSync(bundledDir).sort()) {
        const full = path.join(bundledDir, f);
        const stat = fs.statSync(full);
        let summary = 'Production asset';
        if (f === 'chapters.json') {
          const parsed = JSON.parse(fs.readFileSync(full, 'utf-8'));
          summary = `${(parsed.chapters || []).length} authentic Surahs (Arabic, English, verse counts, revelation places)`;
        } else if (f === 'resources_catalog.json') {
          const parsed = JSON.parse(fs.readFileSync(full, 'utf-8'));
          const tCount = parsed.translations?.translations?.length || 0;
          const rCount = parsed.chapter_reciters?.reciters?.length || 0;
          const tfCount = parsed.tafsirs?.tafsirs?.length || 0;
          summary = `${tCount} translations · ${rCount} reciters · ${tfCount} tafsirs`;
        } else if (f.endsWith('.png')) {
          const hdr = readPngHeader(full);
          summary = hdr ? `Madani Mushaf page (${hdr.width}×${hdr.height} PNG)` : 'Madani Mushaf page PNG';
        } else if (f.startsWith('page-')) {
          const parsed = JSON.parse(fs.readFileSync(full, 'utf-8'));
          summary = `${(parsed.verses || []).length} verses with Uthmani text, Saheeh translation & word-by-word data`;
        }
        bundledAssets.push({ filename: f, sizeBytes: stat.size, summary });
      }
    }

    const infoPlistPath = path.join(QURAN_IOS_DIR, 'Supporting', 'Info.plist');
    const infoPlistRaw = fs.existsSync(infoPlistPath) ? fs.readFileSync(infoPlistPath, 'utf-8') : '';
    const projectYmlPath = path.join(QURAN_IOS_DIR, 'project.yml');
    const projectYmlRaw = fs.existsSync(projectYmlPath) ? fs.readFileSync(projectYmlPath, 'utf-8') : '';

    const bundleIdMatch = projectYmlRaw.match(/PRODUCT_BUNDLE_IDENTIFIER:\s*([^\n]+)/);
    const productNameMatch = projectYmlRaw.match(/PRODUCT_NAME:\s*([^\n]+)/);
    const versionMatch = infoPlistRaw.match(/<key>CFBundleShortVersionString<\/key>\s*<string>([^<]+)<\/string>/);
    const buildMatch = infoPlistRaw.match(/<key>CFBundleVersion<\/key>\s*<string>([^<]+)<\/string>/);
    const minOsMatch = infoPlistRaw.match(/<key>MinimumOSVersion<\/key>\s*<string>([^<]+)<\/string>/);

    const allFiles = listProjectFilesRecursive(QURAN_IOS_DIR);
    const zipStat = fs.existsSync(path.join(ROOT_DIR, 'public/downloads/QuranForiOS12-Production-Project.zip'))
      ? fs.statSync(path.join(ROOT_DIR, 'public/downloads/QuranForiOS12-Production-Project.zip')).size
      : 0;
    const payloadStat = fs.existsSync(path.join(ROOT_DIR, 'public/downloads/QuranReader-iOS12-Unsigned-Payload.zip'))
      ? fs.statSync(path.join(ROOT_DIR, 'public/downloads/QuranReader-iOS12-Unsigned-Payload.zip')).size
      : 0;

    res.json({
      config: {
        bundleId: bundleIdMatch ? bundleIdMatch[1].trim() : 'org.quranreader.ios12',
        productName: productNameMatch ? productNameMatch[1].trim() : 'Quran Reader',
        version: versionMatch ? versionMatch[1].trim() : '1.0.0',
        buildNumber: buildMatch ? buildMatch[1].trim() : '1',
        minimumOSVersion: minOsMatch ? minOsMatch[1].trim() : '12.0',
        architectures: ['arm64'],
        deviceFamilies: ['iPhone (1)', 'iPad (2)'],
        swiftVersion: '5.0',
      },
      swiftAudits,
      appIcons,
      bundledAssets,
      allFiles,
      archives: {
        projectZipBytes: zipStat,
        unsignedPayloadBytes: payloadStat,
      },
    });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

app.get('/api/project/file', (req, res) => {
  try {
    const relPath = String(req.query.path || '');
    if (!relPath || relPath.includes('..')) {
      res.status(400).json({ error: 'Invalid file path' });
      return;
    }
    const targetPath = path.join(QURAN_IOS_DIR, relPath);
    if (!targetPath.startsWith(QURAN_IOS_DIR) || !fs.existsSync(targetPath) || fs.statSync(targetPath).isDirectory()) {
      res.status(404).json({ error: 'File not found' });
      return;
    }
    if (relPath.endsWith('.png')) {
      const hdr = readPngHeader(targetPath);
      res.json({
        path: relPath,
        isBinary: true,
        pngInfo: hdr,
      });
      return;
    }
    const content = fs.readFileSync(targetPath, 'utf-8');
    res.json({
      path: relPath,
      isBinary: false,
      content,
    });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

app.post('/api/project/configure', (req, res) => {
  try {
    const { bundleId, productName, version, buildNumber } = req.body as {
      bundleId?: string;
      productName?: string;
      version?: string;
      buildNumber?: string;
    };

    const cleanBundleId = (bundleId || 'org.quranreader.ios12').replace(/[^A-Za-z0-9.-]/g, '');
    const cleanName = (productName || 'Quran Reader').replace(/["\n\r<>]/g, '').trim() || 'Quran Reader';
    const cleanVersion = (version || '1.0.0').replace(/[^0-9.]/g, '') || '1.0.0';
    const cleanBuild = (buildNumber || '1').replace(/[^0-9]/g, '') || '1';

    // Update project.yml
    const projectYmlPath = path.join(QURAN_IOS_DIR, 'project.yml');
    if (fs.existsSync(projectYmlPath)) {
      let yml = fs.readFileSync(projectYmlPath, 'utf-8');
      yml = yml.replace(/PRODUCT_BUNDLE_IDENTIFIER:\s*[^\n]+/, `PRODUCT_BUNDLE_IDENTIFIER: ${cleanBundleId}`);
      yml = yml.replace(/PRODUCT_NAME:\s*[^\n]+/, `PRODUCT_NAME: ${cleanName}`);
      fs.writeFileSync(projectYmlPath, yml, 'utf-8');
    }

    // Update Supporting/Info.plist
    const plistPath = path.join(QURAN_IOS_DIR, 'Supporting', 'Info.plist');
    if (fs.existsSync(plistPath)) {
      let plist = fs.readFileSync(plistPath, 'utf-8');
      plist = plist.replace(
        /<key>CFBundleDisplayName<\/key>\s*<string>[^<]*<\/string>/,
        `<key>CFBundleDisplayName</key>\n    <string>${cleanName}</string>`
      );
      plist = plist.replace(
        /<key>CFBundleShortVersionString<\/key>\s*<string>[^<]*<\/string>/,
        `<key>CFBundleShortVersionString</key>\n    <string>${cleanVersion}</string>`
      );
      plist = plist.replace(
        /<key>CFBundleVersion<\/key>\s*<string>[^<]*<\/string>/,
        `<key>CFBundleVersion</key>\n    <string>${cleanBuild}</string>`
      );
      fs.writeFileSync(plistPath, plist, 'utf-8');
    }

    // Update pbxproj
    const pbxPath = path.join(QURAN_IOS_DIR, 'QuranForiOS12.xcodeproj', 'project.pbxproj');
    if (fs.existsSync(pbxPath)) {
      let pbx = fs.readFileSync(pbxPath, 'utf-8');
      pbx = pbx.replace(/PRODUCT_BUNDLE_IDENTIFIER = [^;]+;/g, `PRODUCT_BUNDLE_IDENTIFIER = ${cleanBundleId};`);
      pbx = pbx.replace(/PRODUCT_NAME = "[^"]+";/g, `PRODUCT_NAME = "${cleanName}";`);
      fs.writeFileSync(pbxPath, pbx, 'utf-8');
    }

    // Re-package ZIP archives
    execSync(
      `python3 -c '
import os, zipfile
with zipfile.ZipFile("public/downloads/QuranForiOS12-Production-Project.zip", "w", zipfile.ZIP_DEFLATED) as zf:
    for root, dirs, files in os.walk("quran-ios"):
        for file in files:
            full_path = os.path.join(root, file)
            zf.write(full_path, full_path)
'`,
      { cwd: ROOT_DIR }
    );

    res.json({
      updated: true,
      config: {
        bundleId: cleanBundleId,
        productName: cleanName,
        version: cleanVersion,
        buildNumber: cleanBuild,
      },
    });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

app.get('/api/download/project-zip', (_req, res) => {
  const file = path.join(ROOT_DIR, 'public/downloads/QuranForiOS12-Production-Project.zip');
  if (!fs.existsSync(file)) {
    res.status(404).send('Archive not found');
    return;
  }
  res.download(file, 'QuranForiOS12-Production-Project.zip');
});

app.get('/api/download/unsigned-bundle', (_req, res) => {
  const file = path.join(ROOT_DIR, 'public/downloads/QuranReader-iOS12-Unsigned-Payload.zip');
  if (!fs.existsSync(file)) {
    res.status(404).send('Archive not found');
    return;
  }
  res.download(file, 'QuranReader-iOS12-Unsigned-Payload.zip');
});

app.get('/api/quran/bundled-chapters', (_req, res) => {
  const file = path.join(QURAN_IOS_DIR, 'Resources', 'BundledData', 'chapters.json');
  if (fs.existsSync(file)) {
    res.setHeader('Content-Type', 'application/json');
    res.send(fs.readFileSync(file, 'utf-8'));
  } else {
    res.status(404).json({ chapters: [] });
  }
});

app.get('/api/quran/bundled-catalog', (_req, res) => {
  const file = path.join(QURAN_IOS_DIR, 'Resources', 'BundledData', 'resources_catalog.json');
  if (fs.existsSync(file)) {
    res.setHeader('Content-Type', 'application/json');
    res.send(fs.readFileSync(file, 'utf-8'));
  } else {
    res.status(404).json({});
  }
});

app.get('/api/quran/mushaf-page/:page', async (req, res) => {
  const pageNum = Math.max(1, Math.min(604, parseInt(req.params.page, 10) || 1));
  const padded = String(pageNum).padStart(3, '0');
  const localBundled = path.join(QURAN_IOS_DIR, 'Resources', 'BundledData', `page${padded}.png`);
  if (fs.existsSync(localBundled)) {
    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Cache-Control', 'public, max-age=86400');
    res.send(fs.readFileSync(localBundled));
    return;
  }
  try {
    const upstream = await fetch(`https://files.quran.app/hafs/madani/width_1024/page${padded}.png`, {
      headers: { 'User-Agent': 'QuranReader-iOS/1.0 (iOS 12 compatible; non-profit)' },
    });
    if (!upstream.ok) {
      res.status(upstream.status).send('Failed to load Mushaf page');
      return;
    }
    const arrayBuffer = await upstream.arrayBuffer();
    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Cache-Control', 'public, max-age=86400');
    res.send(Buffer.from(arrayBuffer));
  } catch (err) {
    res.status(502).send((err as Error).message);
  }
});

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(ROOT_DIR, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
