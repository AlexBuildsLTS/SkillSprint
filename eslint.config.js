// https://docs.expo.dev/guides/using-eslint/
import { defineConfig } from 'eslint/config';
import expoConfig from "eslint-config-expo/flat/default.js";

export default defineConfig([
  expoConfig,
  {
    ignores: ['dist/*', 'metro.config.js'],
    rules: {
      'prettier/prettier': [
        'error', { endOfLine: 'auto' }
      ]
    }
  }
]);
