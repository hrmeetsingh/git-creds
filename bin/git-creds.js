#!/usr/bin/env node

const program = require('commander');
const GitCredentialManager = require('../lib/GitCredentialManager.js');

const manager = new GitCredentialManager();

program
  .version('1.0.0')
  .description('Switch between different Git credentials and SSH keys');

program
  .command('switch')
  .description('Switch Git credentials for current repository or globally')
  .action(async (options) => {
    try {
      await manager.switchCredentials(options.global);
    } catch (error) {
      console.error('Error:', error.message);
      process.exit(1);
    }
  });

program
  .command('list')
  .description('List saved credential profiles')
  .action(async () => {
    try {
      await manager.listProfiles();
    } catch (error) {
      console.error('Error:', error.message);
      process.exit(1);
    }
  });

program
  .command('current')
  .description('Show current Git credentials')
  .action(async () => {
    try {
      await manager.showCurrentCredentials();
    } catch (error) {
      console.error('Error:', error.message);
      process.exit(1);
    }
  });

program
  .command('add')
  .description('Add a new credential profile')
  .action(async () => {
    try {
      await manager.addProfile();
    } catch (error) {
      console.error('Error:', error.message);
      process.exit(1);
    }
  });

program
  .command('remove')
  .description('Remove a credential profile')
  .action(async () => {
    try {
      await manager.removeProfile();
    } catch (error) {
      console.error('Error:', error.message);
      process.exit(1);
    }
  });

if (process.argv.length === 2) {
  program.help();
}

program.parse(process.argv);