# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0-phase1] - 2026-02-03

### Added
- Initial release - Phase 1 complete
- Global hotkey (Alt+T) to toggle window
- Dual entry modes: Timer and Manual Entry
- Concurrent timer support - run multiple timers simultaneously
- Live elapsed time display for active timers
- Smart duration rounding (5min minimum, 10min increments for >15min)
- n8n webhook integration for sending time entries
- Client and project dropdown management
- Custom logo and title support
- Configurable window dimensions
- System tray integration with context menu
- Keyboard-first navigation (Tab, Enter, Esc)
- Draggable window positioning
- Beautiful styled in-app modals
- Content Security Policy compliance
- Automatic config file generation

### Technical
- Built with Electron 28.0.0
- No external runtime dependencies (except Electron and node-fetch)
- Context isolation and preload script for security
- Local JSON file storage for configuration and active timers
- Clean separation of main process, preload, and renderer
