# Contributing to Easy Resume

Thank you for your interest in contributing! This guide explains how to get involved.

## How to Contribute

### Reporting Bugs

If you find a bug, please [open an issue](https://github.com/ChanMeng666/easy-resume/issues/new) with:

- Steps to reproduce the problem
- Expected vs. actual behavior (screenshots or logs help)
- Your environment (OS, and relevant runtime/version)

### Suggesting Features

Have an idea? [Open a feature request](https://github.com/ChanMeng666/easy-resume/issues/new) describing the problem you want to solve and your proposed solution.

### Submitting Changes

1. **Fork** the repository and **clone** your fork:
   ```bash
   git clone https://github.com/<your-username>/easy-resume.git
   cd easy-resume
   ```
2. **Create a branch** for your changes:
   ```bash
   git checkout -b feature/your-feature-name
   ```
3. **Make your changes** and verify them locally (see Development Setup below).
4. **Commit** with a clear message following [Conventional Commits](https://www.conventionalcommits.org/):
   ```bash
   git commit -m "feat: short description of your change"
   ```
5. **Push** and open a Pull Request against the `master` branch.

## Development Setup

```bash
# Install dependencies
npm install

# Start the development server
npm run dev

# Production build
npm run build

# Lint
npm run lint
```

### Secret scanning (recommended)

This is a public repository, so please enable the local secret-scan hook once to
catch credentials before they are committed:

```bash
pip install pre-commit   # if you don't have it
pre-commit install       # installs the gitleaks pre-commit hook
```

The hook (config in `.pre-commit-config.yaml` + `.gitleaks.toml`) blocks a commit
that contains a secret. CI runs the same gitleaks scan as a non-bypassable gate,
so even without the local hook a leaked credential will fail the build.

## Code of Conduct

By participating, you agree to abide by our [Code of Conduct](CODE_OF_CONDUCT.md). For questions or
support, see [SUPPORT.md](SUPPORT.md). For security issues, see [SECURITY.md](SECURITY.md).
