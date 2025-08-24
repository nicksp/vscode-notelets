// @ts-check
import antfu from '@antfu/eslint-config'

export default antfu(
  {
    type: 'lib',
    typescript: true,
    formatters: true,
    lessOpinionated: true,
    stylistic: {
      indent: 2,
      quotes: 'single',
      semi: false,
    },
  },
  {
    rules: {
      'antfu/top-level-function': ['error'],
      'ts/consistent-type-definitions': ['error', 'type'],
      'antfu/no-top-level-await': ['off'],
      'ts/explicit-function-return-type': ['off'],
      'style/brace-style': ['error', '1tbs', {
        allowSingleLine: false,
      }],
      'style/arrow-parens': ['error', 'as-needed'],
      'node/prefer-global/process': ['off'],
      'perfectionist/sort-imports': ['error', {
        groups: [
          'type',
          ['parent-type', 'sibling-type', 'index-type', 'internal-type'],
          'builtin',
          'external',
          'internal',
          ['parent', 'sibling', 'index'],
          'side-effect',
          'style',
          'object',
          'unknown',
        ],
        newlinesBetween: 'always',
        order: 'asc',
        type: 'natural',
        tsconfigRootDir: '.',
        internalPattern: ['^@/.*'],
      }],
      'unicorn/filename-case': ['error', {
        case: 'kebabCase',
        ignore: ['README.md', 'CONTRIBUTING.md', 'CHANGELOG.md', 'FUNDING.yml', 'pull_request_template.md'],
      }],
      'test/prefer-lowercase-title': ['error', {
        ignore: ['describe'],
      }],
      'test/padding-around-all': 'error',
    },
  },
)
