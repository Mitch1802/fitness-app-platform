import { readFileSync, writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const angularJsonPath = resolve(__dirname, '..', 'angular.json');

const version = process.env.APP_VERSION ?? 'test';
const config = JSON.parse(readFileSync(angularJsonPath, 'utf8'));

config.projects['fitness-app'].architect.build.options.define['APP_VERSION'] = `"${version}"`;

writeFileSync(angularJsonPath, JSON.stringify(config, null, 2) + '\n');
console.log(`APP_VERSION set to: ${version}`);
