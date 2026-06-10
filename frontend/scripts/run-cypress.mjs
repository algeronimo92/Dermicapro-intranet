#!/usr/bin/env node
// VSCode (y otros editores) inyectan ELECTRON_RUN_AS_NODE en su terminal
// integrada. Cypress empaqueta su propio Electron, y si esa variable existe
// (incluso vacía) Electron arranca como Node plano e intenta `require()` los
// argumentos de Cypress, fallando con MODULE_NOT_FOUND. `delete` es la única
// forma multiplataforma de quitarla por completo del entorno del hijo.
import { spawnSync } from 'node:child_process';

delete process.env.ELECTRON_RUN_AS_NODE;

const [mode, ...rest] = process.argv.slice(2);

const result = spawnSync('npx', ['cypress', mode, ...rest], {
  stdio: 'inherit',
  env: process.env,
  shell: true,
});

process.exit(result.status ?? 1);
