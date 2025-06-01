# git-creds

A command-line utility for managing and switching between multiple Git credentials and SSH keys. Designed for developers who work with various Git accounts (such as personal, work, or client projects).

## Features
- Switch between different Git user credentials
- Manage SSH keys for multiple accounts
- Save and reuse credential profiles
- Apply changes locally (per repository) or globally
- View current Git credentials and SSH key information
- Maintain a history of last used credentials

## Installation
Install globally via npm:

```bash
npm install -g git-creds
```
## Usage

### Basic Commands
Show help:
```bash
git-creds --help
```
Switch credentials (interactive):
```bash
git-creds switch
```
Switch credentials globally:
```bash
git-creds switch --global
```
View current credentials:
```bash
git-creds current
```
List saved profiles:
```bash
git-creds list
```
Add a new profile:
```bash
git-creds add
```
Remove a profile:
```bash
git-creds remove
```
## Workflow Example

Add your work profile:
```bash
git-creds add
# Enter: John Doe, john.doe@company.com, ~/.ssh/id_work
```
Add your personal profile:
```bash
git-creds add
# Enter: John Doe, john@personal.com, ~/.ssh/id_personal
```
Switch between profiles:
```bash
git-creds switch
# Select from saved profiles or enter new credentials
```
Check current setup:
```bash
git-creds current
```
## How It Works

### Local vs Global Configuration
- **Local**: Changes apply only to the current Git repository.
- **Global**: Changes apply to all Git repositories on your system (uses `git config --global`).
- The tool automatically detects if you are in a Git repository and applies changes accordingly.

### SSH Key Management
- When you specify an SSH key path, the tool attempts to add the key to your SSH agent.
- Supports RSA, Ed25519, and ECDSA key formats.
- Keys are referenced by their file path (e.g., `~/.ssh/id_rsa`, `~/.ssh/id_work`).

### Profile Storage
- Profiles are stored in `~/.git-creds/profiles.json` and include:
  - User name
  - Email address
  - SSH key path (optional)
  - Last used profile tracking

### Configuration File Location
- Linux/macOS: `~/.git-creds/profiles.json`
- Windows: `%USERPROFILE%\.git-creds\profiles.json`

## Requirements
- Node.js 14.0.0 or higher
- Git installed and accessible via command line
- SSH agent running (for SSH key management)

## Examples

### Switching for a specific project
```bash
cd /path/to/work/project
git-creds switch
# Select work profile
```

### Setting global credentials
```bash
git-creds switch --global
# Select personal profile to use as default
```

### Managing multiple SSH keys
```bash
# Add profile with specific SSH key
git-creds add
# Name: Work Account
# Email: work@company.com
# SSH Key: ~/.ssh/id_work_rsa
```
The tool will automatically use this SSH key when switching to this profile.

## Troubleshooting

### SSH Key Not Found
- Verify the path to your SSH key file.
- Ensure the key file has proper permissions (600).
- Generate a new SSH key if needed: `ssh-keygen -t ed25519 -C "your-email@example.com"`

### Permission Denied
- Check that you have write access to your home directory.
- Ensure Git is properly installed and configured.

## Contributing
1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to your branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License
This project is licensed under the MIT License. See the LICENSE file for details.

## Changelog

**v1.0.0**
- Initial release
- Basic credential switching functionality
- Profile management
- SSH key integration
- Local and global configuration support
