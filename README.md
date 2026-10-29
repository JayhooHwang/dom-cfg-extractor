# dom-cfg-extractor

**English** | [简体中文](./README.zh-CN.md)

Extract DOM data conveniently with a single JSON config. When the page structure changes, update the config — not the code.

- Suited to cases where you need to repeatedly extract the same kind of data from one or more sites over time, while page layouts are out of your control and may change at any moment;

- By abstracting the page structure into a pure JSON config, even when the page structure changes, only the config needs updating; this turns the config into pure user data that can be stored, customized by users, shared, and more;

- Why it matters for AI applications: for pages that require long-term analysis and have a relatively stable structure, it saves tokens and mitigates hallucinations;

- More features: preliminary data cleaning with custom actions, extracting array data, iframe content, and values that only appear after a click.

## Requirements

- Node.js >= 18
- A DOM environment (browser, or a DOM emulator such as `happy-dom` / `jsdom`)
- ESM only (`import`, no `require`)

## Installation

```bash
npm install dom-cfg-extractor
```

## Quick start

```ts
import { DomExtractor } from 'dom-cfg-extractor'

const extractor = new DomExtractor()

const data = await extractor.search(document, {
  pageTitle: 'title',
  name: '.name',
  photo: { selector: '.photo img', attr: 'src' },
})

// {
//   pageTitle: 'Student Information',
//   name: 'Li Lei',
//   photo: 'https://example.com/photos/li-lei.jpg'
// }
```

`search()` is the only core function. It accepts a `Document` or `Element` as the root node and a pure JSON object as the **search map**.

## Search map

A search map is a plain object whose keys become the keys of the result. Each value is either:

- a **selector string** — shorthand for `{ selector: '<value>' }`
- a **map item** — an object with the following fields

| Field      | Type              | Default       | Description                                                                    |
| ---------- | ----------------- | ------------- | ------------------------------------------------------------------------------ |
| `selector` | `string`          | —             | CSS selector of the target element (required, non-empty)                       |
| `attr`     | `string`          | `'innerText'` | Property or attribute to read                                                  |
| `actions`  | `ActionCaller[]`  | `[]`          | Actions applied to the extracted value, chained in order                       |
| `click`    | `string`          | —             | Selector of an element to click before extracting; waits for the target to appear |

### Reading attributes

`attr` reads a DOM property when it is one of `innerText`, `innerHTML`, or `href`; otherwise it falls back to `getAttribute(attr)`.

- `href` returns the resolved absolute URL rather than the raw attribute value.
- `text` and `html` are aliases for `innerText` and `innerHTML`.
- String results are trimmed.

```ts
const data = await extractor.search(document.body, {
  name: { selector: '.name', attr: 'text' },     // innerText
  photo: { selector: '.photo', attr: 'html' },   // innerHTML
  profile: { selector: '.profile a', attr: 'href' },
})
```

### Optional keys

Append `?` to a key to tolerate a missing element. Instead of throwing, the key resolves to an empty string.

```ts
const data = await extractor.search(document.body, {
  name: '.name',
  'selfIntroduction?': '.self-introduction',
})
// { name: 'Han Meimei', selfIntroduction: '' }  // when the element is absent
```

### Arrays

By default a key returns a single value (the first match). Declare keys in `groupKeys` to return an array of values via `querySelectorAll`:

```ts
const extractor = new DomExtractor({ groupKeys: ['majorCourses'] })

const data = await extractor.search(document.body, {
  majorCourses: '.major-courses .course',
})
// { majorCourses: ['Data Structures', 'Operating Systems', ...] }
```

A group key that matches nothing resolves to `[]` instead of throwing.

> Group lookups use `querySelectorAll`, so the `@` deep-selector syntax described below is not supported for group keys.

### Deep selectors (iframe)

Deep iframe selection is a selector syntax unique to this project. Use `@` in a selector to descend into iframe documents. Each segment is a regular selector:

```ts
const data = await extractor.search(document.body, {
  attendanceRate: '.additional-info iframe@dd:nth-of-type(1)',
  activityRemark: '.additional-info iframe@.inner-frame@.activity-remark',
})
```

Cross-origin iframes cannot be accessed; a warning is logged and the element is treated as missing.

### Click before extracting

When a value only exists after user interaction, set `click` to the trigger's selector. The extractor clicks the element, then polls for the target selector (by default, up to 6 retries, 500 ms apart, until the target is found).

```ts
const data = await extractor.search(document.body, {
  scoreOfOperatingSystems: {
    selector: '#major_course_scores tbody td:nth-child(2)',
    click: '#btn_load_scores',
  },
})
```

The click supports `@` deep selectors as well. If the trigger cannot be clicked or the target never appears, a warning is logged and the target is treated as missing.

### Special selectors

Some values do not live in the DOM. Selector `URL` resolves to `window.location.href`:

```ts
const data = await extractor.search(document.body, {
  refer: 'URL',
})
```

Special selectors currently support only `URL`, implemented by directly calling `window.location.href`.

## Actions

Actions transform the raw extracted value. A caller is either an action name or an object with parameters:

```ts
const data = await extractor.search(document.body, {
  trimmed: { selector: '.name', actions: ['trim'] },
  phoneNumber: {
    selector: '.phone-number',
    actions: [{ name: 'replace', params: [' ', ''] }],
  },
  from: {
    selector: '.address',
    actions: [{ name: 'extract', params: [',([^,]*,[^,]*)$'] }, 'trim'],
  },
})
```

### Built-in actions

| Name      | Applies to | Parameters      | Behavior                                                                 |
| --------- | ---------- | --------------- | ------------------------------------------------------------------------ |
| `trim`    | single     | —               | Trims leading and trailing whitespace                                    |
| `replace` | single     | `from`, `to`    | Replaces all matches of the `from` regex with `to`                       |
| `remove`  | single     | `target`        | Removes all matches of the `target` regex                                |
| `extract` | single     | `pattern`       | Returns the first capture group, or the whole match if there is none     |
| `split`   | group      | `splitter`      | Splits the only element of the array into a new array                    |

### Single vs. group actions

- A **single** action receives one string and returns one string. When the value is an array, it is applied to each item.
- A **group** action receives the whole array and returns an array. It can only be used on group keys; applying it to a single value throws `ACTION_TYPE_MISMATCH`.

This makes chaining natural: for example, `split` turns a comma-separated string into an array, and `trim` then cleans each item.

### Custom actions

Register custom actions on an `ActionRegistry` and pass it to the extractor:

```ts
import { ActionRegistry, DomExtractor } from 'dom-cfg-extractor'

const actionRegistry = new ActionRegistry()

actionRegistry.register('upper', (text: string) => text.toUpperCase())
actionRegistry.register('sort', (items: string[]) => [...items].sort(), 'group')

const extractor = new DomExtractor({
  groupKeys: ['courses'],
  actionRegistry,
})

const data = await extractor.search(document.body, {
  name: { selector: '.name', actions: ['upper'] },
  courses: { selector: '.course', actions: ['sort'] },
})
```

The handler signature is `(data, ...params) => data`. The third argument of `register()` is `'single'` (default) or `'group'`.

Custom actions are merged with the built-in ones. Registering a duplicate name, including a built-in name, throws `ACTION_DUPLICATE`.

### Sharing data with actions

Pass `context` to make values available as `this` inside action handlers:

```ts
const actionRegistry = new ActionRegistry()

actionRegistry.register('cdn', function (this: { cdn?: string }, src: string) {
  if (!this.cdn) return src
  const url = new URL(src)
  const cdn = new URL(this.cdn)
  url.protocol = cdn.protocol
  url.host = cdn.host
  url.port = cdn.port
  return url.toString()
})

const extractor = new DomExtractor({
  context: { cdn: 'https://cdn.example.com' },
  actionRegistry,
})
```

## Errors

All errors are thrown as `DomExtractorError`, which extends `Error` and carries:

- `code` — a stable error code (see below)
- `occur` — `{ key, item }` pointing at the search-map entry that failed
- `cause` — the original error, when wrapping one

Messages are prefixed with `[DOM_EXTRACTOR_ERR]`.

```ts
import { DomExtractorError } from 'dom-cfg-extractor'

try {
  await extractor.search(document, { name: '.name' })
} catch (error) {
  if (error instanceof DomExtractorError) {
    console.error(error.code, error.occur?.key)
  }
}
```

| Code                     | Meaning                                                        |
| ------------------------ | -------------------------------------------------------------- |
| `INVALID_DOM`            | The root node is not a `Document` or `Element`                 |
| `INVALID_MAP`            | The search map is not a plain object                           |
| `SELECTOR_EMPTY`         | A selector is missing, empty, or whitespace-only               |
| `INVALID_ACTIONS`        | `actions` is not an array                                      |
| `ELEMENT_NOT_FOUND`      | A required element could not be found                          |
| `ATTR_READ_FAILED`       | The element exists but the requested attribute cannot be read  |
| `ACTION_NOT_FOUND`       | The named action is not registered                             |
| `ACTION_DUPLICATE`       | An action with the same name is already registered             |
| `INVALID_ACTION_NAME`    | Action name is missing or not a string                         |
| `INVALID_APPLY_FOR`      | `applyFor` is neither `'single'` nor `'group'`                 |
| `INVALID_ACTION_HANDLE`  | The action handler is not a function or takes no parameters    |
| `INVALID_ACTION_PARAMS`  | Action `params` is not an array                                |
| `ACTION_PARAMS_REQUIRED` | A built-in action is missing a required parameter              |
| `INVALID_ACTION_DATA`    | An action received data that is neither a string nor an array  |
| `ACTION_TYPE_MISMATCH`   | A single/group action was applied to the wrong kind of value   |
| `UNKNOWN_ERROR`          | Any other error, wrapped with its original `cause`             |

The search map passed to `search()` is never mutated.

## API

### `new DomExtractor(options?)`

| Option           | Type               | Description                                              |
| ---------------- | ------------------ | -------------------------------------------------------- |
| `groupKeys`      | `string[]`         | Keys that should return arrays                           |
| `actionRegistry` | `ActionRegistry`   | Custom actions, merged with the built-in ones            |
| `context`        | `object`           | Data exposed as `this` inside action handlers            |

### `search(dom, map): Promise<Record<string, string | string[]>>`

Extracts values from `dom` according to `map`.

### `new ActionRegistry()`

| Member                          | Description                                                    |
| ------------------------------- | -------------------------------------------------------------- |
| `register(name, handle, applyFor?)` | Registers an action; `applyFor` defaults to `'single'`     |
| `includes(name)`                | Checks whether an action name is registered                    |
| `getAction(name)`               | Returns the action or throws `ACTION_NOT_FOUND`                |
| `ActionRegistry.getMerged(...registries)` | Merges registries, throwing on duplicate names        |

### Exported types

`SearchMap`, `MapItem`, `ExtractorOptions`, `ActionCaller`, `ActionHandle`, `ApplyFor`, `ErrorOccurrence`, `ErrorCode`.

## Development

```bash
npm install
npm test          # watch mode
npm run test:run  # single run
npm run build     # compile to dist/
```

## License

[ISC](./LICENSE)
