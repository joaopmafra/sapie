const babelJestTransform = [
  'babel-jest',
  {
    presets: [
      ['@babel/preset-env', { targets: { node: 'current' } }],
      ['@babel/preset-react', { runtime: 'automatic' }],
      '@babel/preset-typescript',
    ],
  },
];

const moduleNameMapper = {
  '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
  '\\.(jpg|jpeg|png|gif|eot|otf|webp|svg|ttf|woff|woff2|mp4|webm|wav|mp3|m4a|aac|oga)$':
    '<rootDir>/src/__mocks__/fileMock.js',
};

const moduleFileExtensions = [
  'web.js',
  'js',
  'web.ts',
  'ts',
  'web.tsx',
  'tsx',
  'json',
  'web.jsx',
  'jsx',
  'node',
];

/** @type {import('jest').Config} */
export default {
  projects: [
    {
      displayName: 'unit',
      testEnvironment: 'jsdom',
      roots: ['<rootDir>/src'],
      testMatch: [
        '<rootDir>/src/**/__tests__/**/*.{js,jsx,ts,tsx}',
        '<rootDir>/src/**/*.{test,spec}.{js,jsx,ts,tsx}',
      ],
      testPathIgnorePatterns: ['RichNoteBodyEditor\\.test\\.tsx$'],
      setupFilesAfterEnv: ['<rootDir>/src/setupTests.ts'],
      transform: {
        '^.+\\.(js|jsx|ts|tsx)$': babelJestTransform,
      },
      transformIgnorePatterns: [
        '[/\\\\]node_modules[/\\\\].+\\.(js|jsx|ts|tsx)$',
      ],
      moduleNameMapper,
      moduleFileExtensions,
      collectCoverageFrom: [
        'src/**/*.{js,jsx,ts,tsx}',
        '!src/**/*.d.ts',
        '!src/main.tsx',
        '!src/vite-env.d.ts',
      ],
    },
    {
      displayName: 'mdxeditor',
      testEnvironment: 'jsdom',
      roots: ['<rootDir>/src'],
      testMatch: ['<rootDir>/src/**/RichNoteBodyEditor.test.tsx'],
      setupFilesAfterEnv: ['<rootDir>/src/setupTests.ts'],
      transform: {
        '^.+\\.(js|jsx|ts|tsx)$': babelJestTransform,
      },
      // @mdxeditor/editor’s dependency tree is ESM-only; compile all of node_modules for this small suite only.
      transformIgnorePatterns: ['\\.pnpm_jest_never_ignore_this_pattern__'],
      moduleNameMapper,
      moduleFileExtensions,
    },
  ],
};
