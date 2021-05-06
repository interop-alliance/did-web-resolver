import pkg from './package.json'

export default [
  {
    input: './src/index.js',
    output: [
      {
        dir: 'dist',
        format: 'cjs',
        preserveModules: true
      }
    ],
    external: Object.keys(pkg.dependencies).concat(['crypto', 'util'])
  }
]
