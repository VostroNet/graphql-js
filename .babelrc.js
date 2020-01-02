module.exports = {
  presets: [['@babel/preset-env', { targets: { node: 'current' } }]],
  plugins: [
    './resources/inline-invariant',
    '@babel/plugin-transform-flow-strip-types',
  ],
  overrides: [
    {
      exclude: ['**/__tests__/**/*', '**/__fixtures__/**/*'],
      presets: ['@babel/preset-env'],
      plugins: [
        ['@babel/plugin-transform-classes', { loose: true }],
        ['@babel/plugin-transform-destructuring', { loose: true }],
        ['@babel/plugin-transform-spread', { loose: true }],
        ['@babel/plugin-transform-for-of', { assumeArray: true }],
      ],
      env: {
        cjs: {
          presets: [['@babel/preset-env', { modules: 'commonjs' }]],
        },
        mjs: {
          presets: [['@babel/preset-env', { modules: false }]],
        },
      },
    },
  ],
};
