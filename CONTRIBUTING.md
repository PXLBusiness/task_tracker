# Contributing to Freshbooks Time Tracker

First off, thank you for considering contributing to Freshbooks Time Tracker! 🎉

## How Can I Contribute?

### Reporting Bugs

Before creating bug reports, please check the existing issues to avoid duplicates. When you create a bug report, include as many details as possible:

- **Use a clear and descriptive title**
- **Describe the exact steps to reproduce the problem**
- **Provide specific examples** - include config files (sanitized), screenshots, etc.
- **Describe the behavior you observed** and what you expected to see
- **Include your environment details**: OS, Node.js version, Electron version

### Suggesting Features

Feature suggestions are welcome! Please:

- **Use a clear and descriptive title**
- **Provide a detailed description** of the suggested feature
- **Explain why this feature would be useful** to most users
- **List any alternative solutions** you've considered

### Pull Requests

1. Fork the repo and create your branch from `main`
2. If you've added code that should be tested, add tests
3. Ensure your code follows the existing style
4. Update the documentation (README, CHANGELOG)
5. Write a clear commit message

## Development Setup

```bash
# Clone your fork
git clone https://github.com/yourusername/freshbooks-time-tracker.git
cd freshbooks-time-tracker

# Install dependencies
npm install

# Run in development
npm start
```

## Project Structure

- `main.js` - Electron main process (app lifecycle, windows, tray)
- `preload.js` - Context bridge for secure IPC
- `renderer.js` - UI logic and timer management
- `index.html` - Main window markup
- `styles.css` - All styling
- `data/` - User configuration and data files

## Code Style

- Use 2 spaces for indentation
- Use meaningful variable names
- Comment complex logic
- Follow existing patterns in the codebase

## Commit Messages

- Use the present tense ("Add feature" not "Added feature")
- Use the imperative mood ("Move cursor to..." not "Moves cursor to...")
- Limit the first line to 72 characters
- Reference issues and pull requests after the first line

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
