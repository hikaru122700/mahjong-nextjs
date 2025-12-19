import next from 'eslint-config-next';

const nextConfig = [...next];

const config = [
  {
    ignores: ['.next/**', 'node_modules/**'],
  },
  ...nextConfig,
  {
    rules: {
      'react-hooks/set-state-in-effect': 'off',
    },
  },
];

export default config;
