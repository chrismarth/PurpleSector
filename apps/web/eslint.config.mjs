/** @type {import('eslint').Linter.Config} */
module.exports = {
  extends: ['next/core-web-vitals', 'next/typescript', 'plugin:react-hooks/recommended'],
  rules: {
    'react-hooks/exhaustive-deps': 'warn',
  },
};
