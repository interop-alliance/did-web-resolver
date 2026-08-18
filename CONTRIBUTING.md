# Contributing

Code style and contribution conventions. Coding agents receive this file via the
include in [AGENTS.md](AGENTS.md).

<!-- BEGIN interop-conventions-core (canonical source: isomorphic-lib-template/CONTRIBUTING.md) -->

## Refactoring

- Preserve existing comments and formatting

## Code Style

### Special Characters

- Avoid using the character `→` in the code, use `to` instead.
- Avoid mdashes, use `--` instead.
- Avoid the character `…`, use `...` instead.

### Naming

- Use `camelCase` for variables, functions, and properties; `PascalCase` for
  classes
- Avoid single-letter variable names — use descriptive names (e.g. `err` not
  `e`, `chunk` not `c`)

### Functions

- Prefer named `async function` declarations over arrow functions at module
  level
- Export functions and classes inline (`export async function ...`,
  `export class ...`)

### Imports

- Use `node:` prefix for Node.js built-in imports (e.g.
  `import fs from 'node:fs'`)
- Group imports: Node.js built-ins first, then external packages, then local
  modules
- Use named imports; avoid default imports where possible

### Parameters

- Pass related arguments as a single options object and destructure in the
  signature:
  ```js
  export async function exportKey({ publicKey, secretKey }) { ... }
  ```

### Types

- If an options/arguments type is only used once (i.e. twice, counting its own
  definition), inline it at the function/method signature instead of declaring a
  named interface/type.
- If a type/interface only has a single field, inline it at the usage site
  rather than declaring a named interface/type.

## JSDoc

Use multi-line `@param options` style, documenting each property on its own
line:

```js
/**
 * @param options {object}
 * @param options.methodId {string}
 * @param [options.contentType] {string}   ← square brackets for optional params
 */
```

Do not use the inline `@param {{ prop: type }}` style. Use `@returns {type}`
whenever possible.

## Error Handling

- Use `err` (not `e`) as the catch variable name
- Handle specific error codes explicitly (e.g. `err.code === 'ENOENT'`) before
  re-throwing
- Prefer `new Error(message, { cause })` over mutating an error's `.cause`

## Comments

- Use `/** */` JSDoc-style block comments for file, class, and function headers
  (including the one-paragraph "what this file does" header at the top of a
  module).
- Always use the multi-line form for `/** */` blocks, even for a single sentence
  — never the collapsed `/** text */` form:

  ```ts
  /**
   * Correct: multi-line even when the comment is one line.
   */

  /** Wrong: collapsed single-line form. */
  ```

- Use `//` only for short one- or two-line inline comments.
- Do not put "See AGENTS.md ..." cross-references inside code comments; keep
  pointers to the spec/docs in the README and AGENTS.md.

<!-- END interop-conventions-core -->
