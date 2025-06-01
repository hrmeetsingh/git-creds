const simpleGit = require('simple-git');
const inquirer = require('inquirer');
const chalk = require('chalk');
const fs = require('fs-extra');
const path = require('path');
const os = require('os');
const { exec } = require('child_process');
const util = require('util');

const execAsync = util.promisify(exec);

class GitCredentialManager {
  constructor() {
    this.configDir = path.join(os.homedir(), '.switch-git-creds');
    this.configFile = path.join(this.configDir, 'profiles.json');
    this.git = simpleGit();
    this.ensureConfigDir();
  }

  async ensureConfigDir() {
    try {
      await fs.ensureDir(this.configDir);
      if (!(await fs.pathExists(this.configFile))) {
        await fs.writeJson(this.configFile, { profiles: [], lastUsed: null });
      }
    } catch (error) {
      console.error(chalk.red('Error creating config directory:', error.message));
    }
  }

  async loadProfiles() {
    try {
      return await fs.readJson(this.configFile);
    } catch (error) {
      return { profiles: [], lastUsed: null };
    }
  }

  async saveProfiles(data) {
    await fs.writeJson(this.configFile, data, { spaces: 2 });
  }

  async getCurrentCredentials() {
    try {
      const isGitRepo = await this.git.checkIsRepo();
      if (!isGitRepo) {
        console.log(chalk.yellow('Not in a Git repository. Showing global credentials.'));
      }

      const globalName = await this.git.raw(['config', '--global', 'user.name']).catch(() => '');
      const globalEmail = await this.git.raw(['config', '--global', 'user.email']).catch(() => '');
      
      let localName = '';
      let localEmail = '';
      
      if (isGitRepo) {
        localName = await this.git.raw(['config', 'user.name']).catch(() => '');
        localEmail = await this.git.raw(['config', 'user.email']).catch(() => '');
      }

      return {
        isGitRepo,
        global: {
          name: globalName.trim(),
          email: globalEmail.trim()
        },
        local: {
          name: localName.trim(),
          email: localEmail.trim()
        }
      };
    } catch (error) {
      throw new Error(`Failed to get current credentials: ${error.message}`);
    }
  }

  async showCurrentCredentials() {
    const creds = await this.getCurrentCredentials();
    
    console.log(chalk.blue('\n=== Current Git Credentials ==='));
    
    if (creds.isGitRepo && (creds.local.name || creds.local.email)) {
      console.log(chalk.green('\nLocal (Repository) Credentials:'));
      console.log(`  Name:  ${creds.local.name || chalk.gray('(not set)')}`);
      console.log(`  Email: ${creds.local.email || chalk.gray('(not set)')}`);
    }
    
    console.log(chalk.green('\nGlobal Credentials:'));
    console.log(`  Name:  ${creds.global.name || chalk.gray('(not set)')}`);
    console.log(`  Email: ${creds.global.email || chalk.gray('(not set)')}`);

    await this.showSSHKeyInfo();
  }

  async showSSHKeyInfo() {
    try {
      const sshDir = path.join(os.homedir(), '.ssh');
      const sshConfigFile = path.join(sshDir, 'config');
      
      console.log(chalk.green('\nSSH Key Information:'));
      
      if (await fs.pathExists(sshConfigFile)) {
        console.log(`  SSH Config: ${sshConfigFile}`);
      }

      const keyFiles = ['id_rsa', 'id_ed25519', 'id_ecdsa'];
      const existingKeys = [];
      
      for (const keyFile of keyFiles) {
        const keyPath = path.join(sshDir, keyFile);
        if (await fs.pathExists(keyPath)) {
          existingKeys.push(keyFile);
        }
      }
      
      if (existingKeys.length > 0) {
        console.log(`  Available keys: ${existingKeys.join(', ')}`);
      } else {
        console.log(chalk.gray('  No standard SSH keys found'));
      }
    } catch (error) {
      console.log(chalk.gray('  Could not read SSH information'));
    }
  }

  async switchCredentials(isGlobal = false) {
    const creds = await this.getCurrentCredentials();
    const profiles = await this.loadProfiles();

    console.log(chalk.blue(`\n=== Switch Git Credentials ${isGlobal ? '(Global)' : '(Local)'} ===`));
    
    if (!isGlobal && !creds.isGitRepo) {
      console.log(chalk.yellow('Not in a Git repository. Use --global flag to set global credentials.'));
      return;
    }

    const currentName = isGlobal ? creds.global.name : (creds.local.name || creds.global.name);
    const currentEmail = isGlobal ? creds.global.email : (creds.local.email || creds.global.email);

    console.log(chalk.green(`\nCurrent credentials:`));
    console.log(`  Name:  ${currentName || chalk.gray('(not set)')}`);
    console.log(`  Email: ${currentEmail || chalk.gray('(not set)')}`);

    const choices = [
      { name: 'Enter new credentials', value: 'new' },
      ...profiles.profiles.map(profile => ({
        name: `${profile.name} <${profile.email}>`,
        value: profile
      })),
      { name: 'Cancel', value: 'cancel' }
    ];

    const { selection } = await inquirer.prompt([
      {
        type: 'list',
        name: 'selection',
        message: 'What would you like to do?',
        choices
      }
    ]);

    if (selection === 'cancel') {
      console.log(chalk.yellow('Operation cancelled.'));
      return;
    }

    let newCreds;
    if (selection === 'new') {
      newCreds = await this.promptForNewCredentials();
      
      const { saveProfile } = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'saveProfile',
          message: 'Save this as a profile for future use?',
          default: true
        }
      ]);

      if (saveProfile) {
        await this.saveProfile(newCreds, profiles);
      }
    } else {
      newCreds = selection;
    }

    await this.applyCredentials(newCreds, isGlobal);
    
    profiles.lastUsed = newCreds;
    await this.saveProfiles(profiles);

    console.log(chalk.green('\n✓ Credentials updated successfully!'));
  }

  async promptForNewCredentials() {
    const questions = [
      {
        type: 'input',
        name: 'name',
        message: 'Enter Git user name:',
        validate: input => input.trim() ? true : 'Name cannot be empty'
      },
      {
        type: 'input',
        name: 'email',
        message: 'Enter Git email:',
        validate: input => {
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          return emailRegex.test(input.trim()) ? true : 'Please enter a valid email address';
        }
      },
      {
        type: 'input',
        name: 'sshKey',
        message: 'Enter SSH private key path (optional):',
        default: ''
      }
    ];

    return await inquirer.prompt(questions);
  }

  async applyCredentials(creds, isGlobal) {
    const scope = isGlobal ? '--global' : '';
    
    try {
      await this.git.raw(['config', scope, 'user.name', creds.name].filter(Boolean));
      await this.git.raw(['config', scope, 'user.email', creds.email].filter(Boolean));

      if (creds.sshKey && creds.sshKey.trim()) {
        await this.setupSSHKey(creds.sshKey.trim());
      }
    } catch (error) {
      throw new Error(`Failed to apply credentials: ${error.message}`);
    }
  }

  async setupSSHKey(sshKeyPath) {
    try {
      const expandedPath = sshKeyPath.startsWith('~') 
        ? path.join(os.homedir(), sshKeyPath.slice(1))
        : sshKeyPath;

      if (!(await fs.pathExists(expandedPath))) {
        console.log(chalk.yellow(`Warning: SSH key file not found at ${expandedPath}`));
        return;
      }

      // Add SSH key to ssh-agent
      await execAsync(`ssh-add "${expandedPath}"`);
      console.log(chalk.green(`✓ SSH key added to ssh-agent: ${expandedPath}`));
    } catch (error) {
      console.log(chalk.yellow(`Warning: Could not add SSH key to ssh-agent: ${error.message}`));
    }
  }

  async saveProfile(creds, profiles) {
    // Check if profile already exists
    const existingIndex = profiles.profiles.findIndex(
      profile => profile.email === creds.email
    );

    if (existingIndex >= 0) {
      profiles.profiles[existingIndex] = creds;
      console.log(chalk.green('✓ Profile updated'));
    } else {
      profiles.profiles.push(creds);
      console.log(chalk.green('✓ Profile saved'));
    }

    await this.saveProfiles(profiles);
  }

  async listProfiles() {
    const profiles = await this.loadProfiles();
    
    console.log(chalk.blue('\n=== Saved Credential Profiles ==='));
    
    if (profiles.profiles.length === 0) {
      console.log(chalk.gray('No profiles saved yet.'));
      return;
    }

    profiles.profiles.forEach((profile, index) => {
      const isLastUsed = profiles.lastUsed && 
        profiles.lastUsed.email === profile.email && 
        profiles.lastUsed.name === profile.name;
      
      const marker = isLastUsed ? chalk.green('★ ') : '  ';
      console.log(`${marker}${profile.name} <${profile.email}>`);
      
      if (profile.sshKey) {
        console.log(`    SSH Key: ${profile.sshKey}`);
      }
    });

    if (profiles.lastUsed) {
      console.log(chalk.green('\n★ = Last used profile'));
    }
  }

  async addProfile() {
    console.log(chalk.blue('\n=== Add New Credential Profile ==='));
    
    const creds = await this.promptForNewCredentials();
    const profiles = await this.loadProfiles();
    
    await this.saveProfile(creds, profiles);
  }

  async removeProfile() {
    const profiles = await this.loadProfiles();
    
    if (profiles.profiles.length === 0) {
      console.log(chalk.yellow('No profiles to remove.'));
      return;
    }

    const choices = profiles.profiles.map((profile, index) => ({
      name: `${profile.name} <${profile.email}>`,
      value: index
    }));

    const { profileIndex } = await inquirer.prompt([
      {
        type: 'list',
        name: 'profileIndex',
        message: 'Select profile to remove:',
        choices
      }
    ]);

    const { confirm } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'confirm',
        message: `Are you sure you want to remove "${profiles.profiles[profileIndex].name}" profile?`,
        default: false
      }
    ]);

    if (confirm) {
      profiles.profiles.splice(profileIndex, 1);
      await this.saveProfiles(profiles);
      console.log(chalk.green('✓ Profile removed successfully!'));
    } else {
      console.log(chalk.yellow('Operation cancelled.'));
    }
  }
}

module.exports = GitCredentialManager;