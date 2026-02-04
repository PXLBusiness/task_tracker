# Pushing Phase 1 to GitHub - Step by Step Guide

## Prerequisites
1. Install Git: https://git-scm.com/download/win
2. Create a GitHub account if you don't have one: https://github.com
3. Create a new repository on GitHub (don't initialize with README)

## Step 1: Initialize Git Repository

Open Command Prompt or PowerShell in your TaskTracker folder:

```bash
cd "C:\Users\david\Documents\_Misc\PXL Business Development\TaskTracker\TaskTracker-Ph1"
```

Initialize git:
```bash
git init
```

## Step 2: Configure Git (First Time Only)

Set your identity:
```bash
git config --global user.name "Your Name"
git config --global user.email "your.email@example.com"
```

## Step 3: Stage All Files

Add all files to git:
```bash
git add .
```

Check what will be committed:
```bash
git status
```

You should see all your files listed in green. The .gitignore file will automatically exclude:
- node_modules/
- data/clients.json (your personal client data)
- data/config.json (your personal config)
- data/timers.json (active timers)
- *.zip files

## Step 4: Create Your First Commit

```bash
git commit -m "feat: Phase 1 complete - core time tracking functionality

- Global hotkey (Alt+T) toggle
- Dual entry modes (Timer + Manual)
- Concurrent timers with live elapsed time
- Smart duration rounding (5min min, 10min increments)
- n8n webhook integration
- Dynamic client list from webhook with refresh
- Auto-select first project on client selection
- Configurable window dimensions
- Custom branding (logo + title)
- System tray integration
- Keyboard-first navigation
- Beautiful styled modals
- Full GitHub documentation"
```

## Step 5: Create GitHub Repository

1. Go to https://github.com/new
2. Repository name: `freshbooks-time-tracker`
3. Description: "Beautiful Electron app for tracking time and logging to Freshbooks via n8n webhooks"
4. Choose Public or Private
5. **DO NOT** check "Initialize this repository with a README"
6. Click "Create repository"

## Step 6: Connect Local Repo to GitHub

GitHub will show you commands. Use these (replace YOUR-USERNAME):

```bash
git remote add origin https://github.com/YOUR-USERNAME/freshbooks-time-tracker.git
```

Verify the remote:
```bash
git remote -v
```

## Step 7: Create Main Branch and Push

Rename default branch to main:
```bash
git branch -M main
```

Push to GitHub:
```bash
git push -u origin main
```

You may be prompted to authenticate:
- Username: your GitHub username
- Password: use a Personal Access Token (not your password)

### To Create a Personal Access Token:
1. Go to GitHub.com → Settings → Developer settings → Personal access tokens → Tokens (classic)
2. Generate new token (classic)
3. Give it a name: "Time Tracker App"
4. Select scopes: `repo` (full control)
5. Generate and copy the token
6. Use this token as your password when pushing

## Step 8: Create a Release (Optional but Recommended)

1. Go to your GitHub repository
2. Click "Releases" → "Create a new release"
3. Tag version: `v1.0.0-phase1`
4. Release title: `Phase 1 - Core Time Tracking`
5. Description:
```markdown
## 🎉 Phase 1 Complete - Core Time Tracking Functionality

### ✨ Features
- ⏱️ Global hotkey (Alt+T) to toggle window
- 🔄 Dual entry modes: Timer and Manual Entry
- 📊 Concurrent timers with live elapsed time display
- 🎯 Smart duration rounding (5min minimum, 10min increments for >15min)
- 🔗 n8n webhook integration for Freshbooks
- 🔄 Dynamic client list from webhook with manual refresh
- ⚡ Auto-select first project when choosing client
- 🎨 Custom logo, title, and window dimensions
- 🖥️ System tray integration
- ⌨️ Full keyboard navigation
- ✨ Beautiful styled in-app modals

### 📦 Installation
See [README.md](README.md) for installation instructions.

### 🐛 Known Issues
None - Phase 1 is stable and production-ready!

### 🗺️ Next Steps
Phase 2 will include:
- Offline queue with automatic retry
- Recent projects quick-select
- Enhanced error handling
```

6. Upload the release zip file: `freshbooks-time-tracker-v1.0.0-phase1-RELEASE.zip`
7. Click "Publish release"

## Step 9: Update Repository Settings (Optional)

1. Go to repository Settings
2. Add topics: `electron`, `time-tracking`, `freshbooks`, `n8n`, `productivity`, `automation`
3. Add a description
4. Set the website URL if you have one

## Step 10: Verify Everything

Visit your repository URL:
```
https://github.com/YOUR-USERNAME/freshbooks-time-tracker
```

You should see:
✅ All your files (except those in .gitignore)
✅ Beautiful README.md displayed
✅ License badge
✅ Version badge
✅ Release v1.0.0-phase1 available for download

## Future Updates (Phase 2, 3, etc.)

When you make changes:

```bash
# Stage changes
git add .

# Commit with descriptive message
git commit -m "feat: add new feature"

# Push to GitHub
git push
```

## Troubleshooting

### "fatal: not a git repository"
- Make sure you're in the correct directory
- Run `git init` first

### "Authentication failed"
- Use a Personal Access Token, not your password
- Make sure the token has `repo` scope

### "rejected - non-fast-forward"
- Your local is behind remote
- Run `git pull origin main` first, then `git push`

### Files you don't want are being tracked
- Make sure they're in .gitignore
- If already tracked: `git rm --cached filename`

## Helpful Git Commands

```bash
git status              # See what's changed
git log                 # See commit history
git diff                # See changes before committing
git branch              # List branches
git checkout -b feature # Create new branch
git pull                # Get latest from GitHub
```

---

**🎉 Congratulations! Your Phase 1 is now on GitHub and ready to share with the world!**
