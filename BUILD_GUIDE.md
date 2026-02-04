# Building Distributable Apps

This guide shows you how to build standalone executables for Windows, macOS, and Linux.

## Prerequisites

1. Node.js installed
2. All dependencies installed (`npm install`)
3. Code is working when you run `npm start`

## Building for Windows

### Option 1: Windows Installer (Recommended for Distribution)

Creates an installer that users can run to install the app properly.

```bash
npm run build:win
```

This creates in the `dist/` folder:
- **Freshbooks Time Tracker Setup.exe** - NSIS installer (recommended)
- **Freshbooks-Time-Tracker-Portable.exe** - Portable version (no install needed)

**The installer will:**
- Install to Program Files
- Create desktop shortcut
- Create Start Menu entry
- Add uninstaller
- Allow users to choose install location

### Option 2: Portable Executable

Just the portable .exe is created (no installer).

Edit `package.json` and change the `win` target to just `"portable"`, then run:
```bash
npm run build:win
```

## Building for macOS

**Note:** Best done on a Mac, but can be done on Windows with extra setup.

```bash
npm run build:mac
```

Creates:
- **Freshbooks Time Tracker.dmg** - Disk image for installation
- **Freshbooks Time Tracker.app.zip** - Zipped app bundle

## Building for Linux

```bash
npm run build:linux
```

Creates:
- **Freshbooks-Time-Tracker.AppImage** - Universal Linux executable
- **freshbooks-time-tracker.deb** - Debian/Ubuntu package

## Building for All Platforms

```bash
npm run build
```

This attempts to build for all platforms (works best on macOS).

## What Gets Included in the Build

The build includes:
- ✅ All JavaScript files (main.js, preload.js, renderer.js)
- ✅ HTML and CSS
- ✅ Assets (icons, tray icon)
- ✅ Example config and client files
- ✅ node-fetch dependency

The build EXCLUDES:
- ❌ node_modules/ (bundled separately by electron-builder)
- ❌ Your personal data/clients.json
- ❌ Your personal data/config.json
- ❌ Development files (.git, .gitignore, etc.)

## First-Time User Experience

When someone runs your built app for the first time:

1. App starts
2. Automatically creates `data/` folder in app directory
3. Creates default `config.json` and `clients.json` from examples
4. User needs to:
   - Edit config.json with their webhook URL
   - Edit clients.json with their Freshbooks clients
   - Restart the app

## Testing Your Build

After building:

1. Go to the `dist/` folder
2. Run the installer or portable .exe
3. The app should work exactly like `npm start` but without needing Node.js

## Distribution

### For GitHub Releases:

1. Build the app: `npm run build:win`
2. Go to your GitHub repo → Releases → Create new release
3. Upload files from `dist/` folder:
   - Freshbooks Time Tracker Setup.exe (installer)
   - Freshbooks-Time-Tracker-Portable.exe (portable)
4. Users can download and run without installing Node.js!

### For Personal Use:

Just run the portable .exe - no installation needed. You can:
- Copy it to a USB drive
- Put it in Dropbox/OneDrive
- Run it from any Windows PC

## File Sizes

Expect the following approximate sizes:
- Windows Installer: ~120-150 MB
- Portable .exe: ~120-150 MB
- macOS .dmg: ~130-160 MB
- Linux AppImage: ~120-150 MB

**Why so big?** The entire Chromium browser and Node.js runtime are packaged with your app. This is normal for Electron apps.

## Advanced: Code Signing (Optional)

For production distribution, you should code sign your app to avoid Windows SmartScreen warnings.

### Windows Code Signing:

1. Purchase a code signing certificate ($100-300/year)
2. Add to package.json:
```json
"win": {
  "certificateFile": "path/to/cert.pfx",
  "certificatePassword": "password"
}
```

### macOS Code Signing:

1. Enroll in Apple Developer Program ($99/year)
2. Add to package.json:
```json
"mac": {
  "identity": "Developer ID Application: Your Name (TEAM_ID)"
}
```

## Troubleshooting

### "electron-builder command not found"
```bash
npm install
```

### Build fails with "Cannot find module"
Make sure all dependencies are installed:
```bash
npm install --save-dev electron-builder
```

### Windows Defender blocks the .exe
This is normal for unsigned apps. Add an exception or code sign your app.

### App won't start after building
Check the console logs:
- Windows: `%APPDATA%\Freshbooks Time Tracker\logs`
- macOS: `~/Library/Logs/Freshbooks Time Tracker`
- Linux: `~/.config/Freshbooks Time Tracker/logs`

### Build is too large
This is normal for Electron apps. To reduce size:
- Remove unused dependencies
- Use `electron-builder`'s compression options
- Don't include unnecessary assets

## Updating the App

When you release a new version:

1. Update version in package.json: `"version": "1.1.0"`
2. Update CHANGELOG.md
3. Build: `npm run build:win`
4. Create GitHub release with new version tag
5. Upload new installers

Users will need to download and reinstall (auto-update can be added in Phase 2+).

## Build Output Structure

```
dist/
├── win-unpacked/              # Unpacked Windows build (for testing)
├── Freshbooks Time Tracker Setup.exe    # Windows installer
├── Freshbooks-Time-Tracker-Portable.exe # Windows portable
└── latest.yml                 # Metadata for auto-updates (future)
```

---

**Ready to distribute your app to users who don't have Node.js!** 🚀
