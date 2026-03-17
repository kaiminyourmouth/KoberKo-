import { runAccuracyTests } from './accuracy.test.js';

const result = runAccuracyTests();

if (result.failed > 0) {
  process.exitCode = 1;
}
