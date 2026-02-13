# ⏱ Freshbooks Time Tracker

> A beautiful, lightweight Electron app for tracking time and automatically logging entries to Freshbooks via n8n webhooks.

![Version](https://img.shields.io/badge/version-1.0.0--phase1-blue)
![License](https://img.shields.io/badge/license-Personal%20Use%20Only-orange)
![Electron](https://img.shields.io/badge/electron-28.0.0-lightblue)

## ✨ Features

- **🎯 Global Hotkey** - Toggle window with `Alt+T` (customizable)
- **⏲️ Dual Entry Modes** - Start/stop timers or manually enter time
- **🔄 Concurrent Timers** - Track multiple tasks simultaneously
- **📊 Smart Rounding** - Auto-rounds to 5min minimum, 10min increments for tasks >15min
- **🔗 Webhook Integration** - Seamlessly sends data to n8n → Freshbooks
- **🎨 Customizable UI** - Custom logo, title, and window dimensions
- **🌟 System Tray** - Lives quietly in your tray, always accessible
- **⌨️ Keyboard-First** - Full keyboard navigation (Tab, Enter, Esc)
- **🎭 Beautiful Modals** - Styled confirmation dialogs, no ugly system alerts

## 🚀 Quick Start

### Prerequisites

- [Node.js](https://nodejs.org/) (LTS version recommended)
- n8n instance with webhook configured
- Freshbooks account with API access

### Installation

1. **Clone the repository**

   ```bash
   git clone https://github.com/yourusername/freshbooks-time-tracker.git
   cd freshbooks-time-tracker
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Configure the app**

   Copy example files and edit with your details:

   ```bash
   cp data/config.example.json data/config.json
   cp data/clients.example.json data/clients.json
   ```

   Edit `data/config.json`:

   ```json
   {
     "webhook_url": "https://your-n8n-instance.com/webhook/freshbooks",
     "window_width": 1000,
     "window_height": 1080,
     "project_title": "My Time Tracker",
     ...
   }
   ```

   Edit `data/clients.json` with your Freshbooks client and project IDs.

4. **Run the app**
   ```bash
   npm start
   ```

Press `Alt+T` to show/hide the tracker!

## 🎛️ Configuration

### Window Customization

Adjust window dimensions in `data/config.json`:

```json
{
  "window_width": 1200,
  "window_height": 1080
}
```

### Logo & Branding

Add your own logo:

```json
{
  "use_logo": true,
  "logo_path": "C:\\path\\to\\your\\logo.png",
  "project_title": "My Company Time Tracker",
  "use_title": true
}
```

### Hotkey

Change the global hotkey (default `Alt+T`):

```json
{
  "hotkey": "CommandOrControl+Shift+T"
}
```

### Dynamic Client List

Automatically populate clients from a webhook:

```json
{
  "clients_webhook_enabled": true,
  "clients_webhook_url": "https://your-n8n-instance.com/webhook/get-clients"
}
```

When enabled:

- Clients are fetched from the webhook on app startup
- A refresh icon (🔄) appears in the footer to manually refresh
- Response should be an array matching the `clients.json` format

**Expected webhook response:**

```json
[
  {
    "client_name": "Client Name",
    "client_id": "12345",
    "projects": [
      {
        "project_name": "Project Name",
        "project_id": "67890"
      }
    ]
  }
]
```

This allows you to keep your client list in sync with Freshbooks automatically!

## 📡 Webhook Integration

### n8n Workflow Setup

The app sends time entries to your n8n webhook in this format:

```json
{
  "task_name": "Homepage design",
  "started_at": "2026-02-03T08:00:00Z",
  "duration": 3600,
  "note": "Optional note",
  "client_id": "12345",
  "project_id": "67890",
  "service_name": "Homepage design"
}
```

**Fields:**

- `task_name` - Description of the work
- `started_at` - ISO 8601 timestamp
- `duration` - Duration in seconds (pre-rounded)
- `note` - Optional notes (from manual entries)
- `client_id` - Your Freshbooks client ID
- `project_id` - Your Freshbooks project ID
- `service_name` - Service category (same as task_name)

### Sample n8n Workflow

1. **Webhook Trigger** - Receives time entry
2. **Freshbooks Node** - Creates time entry via API
3. **Optional: Slack/Email** - Confirmation notifications

## ⌨️ Keyboard Shortcuts

| Shortcut | Action             |
| -------- | ------------------ |
| `Alt+T`  | Toggle window      |
| `Tab`    | Navigate fields    |
| `Enter`  | Submit/Start timer |
| `Esc`    | Close window       |

## 📋 Usage

### Starting a Timer

1. Press `Alt+T`
2. Select client from dropdown
3. Select project
4. Enter task name
5. Press `Enter` or click "Start Timer"

Window closes automatically, timer runs in background.

### Finishing a Timer

1. Press `Alt+T`
2. Click ✓ on the active timer
3. Time is automatically rounded and sent to webhook

### Manual Entry

1. Press `Alt+T`
2. Click "Manual Entry" tab
3. Fill in all fields including start time and duration
4. Click "Log Entry"

## 🔧 Development

### Project Structure

```
freshbooks-time-tracker/
├── main.js              # Electron main process
├── preload.js           # Context bridge
├── renderer.js          # UI logic
├── index.html           # Main window
├── styles.css           # Styling
├── data/
│   ├── config.json      # User configuration
│   ├── clients.json     # Client/project mappings
│   └── timers.json      # Active timers (auto-managed)
└── assets/
    └── tray-icon.png    # System tray icon
```

### Building for Distribution

Package the app for distribution:

```bash
npm run build
```

This creates platform-specific installers in the `dist/` folder.

## 🗺️ Roadmap

### Phase 1 ✅ (Complete)

- [x] Core timer functionality
- [x] Webhook integration
- [x] System tray

### Phase 2 ✅ (Complete)

- [x] Custom branding
- [x] Keyboard navigation
- [x] Offline queue with retry

### Phase 3 ✅ (Complete)

- [x] Recent projects quick-select
- [x] Rounding Rules
- [x] Adjustable Minimum Duration

### Phase 4 (Complete)

- [x] Always-on-top floating widget
- [x] Idle detection / alert
- [x] Timer statistics (today/week/month)
- [x] Milestone alerts (sound/notification)

### Phase 5 (In Development)

- [ ] CSV Logging Option
- [ ] Client / Project population option if not using webhook
- [ ] Settings UI

### Phase 6 (Planned)

- [ ] To-Do List System

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

**Copyright © 2026 PXL Business Development**

This project is **free for personal use**.

You may:

- ✅ Use the application for personal or individual productivity
- ✅ Modify the source for your own personal use
- ✅ Build and run the application locally

You may **not**, without prior written permission:

- ❌ Sell or redistribute the software (source or binaries)
- ❌ Use it commercially within a business or organization
- ❌ Bundle it with paid products or services
- ❌ Offer it as part of a SaaS or hosted solution

### Commercial Use

If you would like to use this software commercially, please contact:

**David — PXL Business Development**  
📧 _(add your email here)_

Commercial licenses are available.

See the [LICENSE](LICENSE) file for full terms.

## 🙏 Acknowledgments

- Built with [Electron](https://www.electronjs.org/)
- Designed for use with [n8n](https://n8n.io/) and [Freshbooks](https://www.freshbooks.com/)
- Created by David @ PXL Business Development

## 💬 Support

For issues, questions, or feature requests, please [open an issue](https://github.com/yourusername/freshbooks-time-tracker/issues).

---

**Made with ❤️ for freelancers and agencies who track time in Freshbooks**
