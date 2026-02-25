#!/usr/bin/env node

import { Command } from 'commander';
import { registerConfigureCommand } from './commands/configure';
import { registerGetContextCommand } from './commands/get-context';
import { registerValidateOutputCommand } from './commands/validate-output';
import { registerPostCommentsCommand } from './commands/post-comments';

const program = new Command();

program
  .name('ai-review')
  .description(
    'AI-powered code review CLI — fetch MR context, validate review output, post comments',
  )
  .version('0.1.0');

registerConfigureCommand(program);
registerGetContextCommand(program);
registerValidateOutputCommand(program);
registerPostCommentsCommand(program);

program.parse(process.argv);
