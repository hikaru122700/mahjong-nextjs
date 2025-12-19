import next from 'eslint-config-next';

const nextConfig = [...next];

const config = [
  {
    ignores: ['.next/**', 'node_modules/**', 'coverage/**'],
  },
  ...nextConfig,
  {
    rules: {
      'react-hooks/set-state-in-effect': 'off',
    },
  },
];

export default config;
