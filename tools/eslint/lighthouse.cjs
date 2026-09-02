/** @type {import('eslint').Linter.Config} */
module.exports = {
  rules: {
    'react/jsx-no-target-blank': [
      'error',
      {
        allowReferrer: false,
        enforceDynamicLinks: 'always'
      }
    ],
    'react/no-danger': 'error',
    'react/iframe-missing-sandbox': 'error',
    'react/jsx-no-script-url': 'error',
    'react/jsx-no-useless-fragment': 'warn',
    'import/no-duplicates': 'error',
    'import/no-self-import': 'error',
    'no-eval': 'error',
    'no-implied-eval': 'error',
    'no-new-func': 'error',
    'no-script-url': 'error'
  }
}
