# dom-cfg-extractor

[![npm version](https://img.shields.io/npm/v/dom-cfg-extractor.svg)](https://www.npmjs.com/package/dom-cfg-extractor)

[English](./README.md) | **简体中文**

通过一份 JSON 配置来便捷地提取 DOM 中的数据。当页面结构变化时，改配置，不改代码。

- 适用于需要长期在一个或多个站点反复提取同类数据，同时页面布局不可控，可能随时修改的情况；

- 通过将页面结构抽象成纯 JSON 配置，即使页面结构发生变更，也只需要修改配置；从而将配置变成纯粹的用户数据，可以存储、让用户自定义、分享等；

- 对于 AI 应用的意义：对于需要长期分析且结构相对稳定的页面，可以节省 token，并降低幻觉的影响；

- 更多特性：支持自定义 Action 对数据初步清洗、支持提取数组数据、iframe 内容，以及点击后才出现的值。

## 环境要求

- Node.js >= 18
- 具备 DOM 运行环境（浏览器，或 `happy-dom` / `jsdom` 等 DOM 模拟器）
- 仅支持 ESM（使用 `import`，不支持 `require`）

## 安装

```bash
npm install dom-cfg-extractor
```

## 快速开始

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

`search()` 是唯一的核心函数，接受 `Document` 或 `Element` 作为根节点，并接受一个纯 JSON 对象作为**搜索配置**。

## 搜索配置（Search map）

搜索配置是一个普通对象，其键会成为结果对象的键。每个值可以是：

- **selector 字符串** —— `{ selector: '<value>' }` 的简写
- **配置项对象** —— 包含以下字段

| 字段       | 类型             | 默认值        | 说明                                                |
| ---------- | ---------------- | ------------- | --------------------------------------------------- |
| `selector` | `string`         | —             | 目标元素的 CSS 选择器（必填，且不能为空）           |
| `attr`     | `string`         | `'innerText'` | 要读取的属性或特性                                  |
| `actions`  | `ActionCaller[]` | `[]`          | 作用于提取值的 Action，按顺序链式执行               |
| `click`    | `string`         | —             | 提取前要点击的元素的 selector；随后等待目标元素出现 |

### 读取属性

当 `attr` 为 `innerText`、`innerHTML` 或 `href` 之一时，读取对应的 DOM 属性；否则回退到 `getAttribute(attr)`。

- `href` 返回解析后的完整 URL，而不是原始属性值。
- `text` 和 `html` 分别是 `innerText` 和 `innerHTML` 的别名。
- 字符串结果会去除首尾空白。

```ts
const data = await extractor.search(document.body, {
  name: { selector: '.name', attr: 'text' },     // innerText
  photo: { selector: '.photo', attr: 'html' },   // innerHTML
  profile: { selector: '.profile a', attr: 'href' },
})
```

### 可选键

在键末尾追加 `?`，即可容忍元素不存在。此时该键会解析为空字符串，而不是抛出异常。

```ts
const data = await extractor.search(document.body, {
  name: '.name',
  'selfIntroduction?': '.self-introduction',
})
// { name: 'Han Meimei', selfIntroduction: '' }  // 元素不存在时
```

### 数组

默认情况下，每个键返回单个值（第一个匹配项）。将键声明在 `groupKeys` 中，即可通过 `querySelectorAll` 返回值的数组：

```ts
const extractor = new DomExtractor({ groupKeys: ['majorCourses'] })

const data = await extractor.search(document.body, {
  majorCourses: '.major-courses .course',
})
// { majorCourses: ['Data Structures', 'Operating Systems', ...] }
```

匹配不到任何元素的 group 键会解析为 `[]`，而不是抛出异常。

> group 查找使用 `querySelectorAll`，因此下文介绍的 `@` 深查找语法不适用于 group 键。

### 深查找（iframe）

iframe 深查找是本项目特有的选择器语法。在 selector 中使用 `@` 进入 iframe 文档。每一段都是常规选择器：

```ts
const data = await extractor.search(document.body, {
  attendanceRate: '.additional-info iframe@dd:nth-of-type(1)',
  activityRemark: '.additional-info iframe@.inner-frame@.activity-remark',
})
```

跨域 iframe 无法访问；此时会打印警告，并将该元素视为不存在。

### 提取前点击

当某个值只在用户交互后才出现时，将 `click` 设置为触发元素的 selector。提取器会先点击该元素，然后轮询查找目标 selector（默认最多重试 6 次，间隔 500 ms，直到找到目标）。

```ts
const data = await extractor.search(document.body, {
  scoreOfOperatingSystems: {
    selector: '#major_course_scores tbody td:nth-child(2)',
    click: '#btn_load_scores',
  },
})
```

点击同样支持 `@` 深查找。如果触发元素无法点击或目标始终未出现，会打印警告，并将目标视为不存在。

### 特殊选择器

有些值并不存在于 DOM 中。选择器 `URL` 会解析为 `window.location.href`：

```ts
const data = await extractor.search(document.body, {
  refer: 'URL',
})
```

特殊选择器目前仅支持 `URL`，它直接调用 `window.location.href` 实现。

## Actions

Action 用于转换提取到的原始值。调用方式可以是 Action 名称，也可以是带参数的对象：

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

### 内置 Action

| 名称      | 适用类型 | 参数         | 行为                                             |
| --------- | -------- | ------------ | ------------------------------------------------ |
| `trim`    | single   | —            | 去除首尾空白                                     |
| `replace` | single   | `from`, `to` | 将 `from` 正则的所有匹配替换为 `to`              |
| `remove`  | single   | `target`     | 删除 `target` 正则的所有匹配                     |
| `extract` | single   | `pattern`    | 返回第一个捕获组；没有捕获组时返回整个匹配       |
| `split`   | group    | `splitter`   | 将数组中唯一的元素拆分为新数组                   |

### 正则安全

`replace`、`remove`、`extract` 会把参数编译成正则表达式。正则来自你的配置，但输入来自被解析的页面；一个只是“接近匹配”的回溯型正则会阻塞事件循环。

这三个 Action 对超过 8192 字符的输入抛出 `REGEXP_INPUT_TOO_LONG`。该上限限制的是多项式级回溯（触顶时最坏约 60 ms）；它**不能**防御指数级回溯的模式，因此 Action 里的正则应视为可信配置。

如果搜索配置来自使用者而非你自己编写（不可信配置），建议在调用 `search()` 前对 `action` 的 `params` 做校验或收紧，例如只允许预先审核过的正则，或对使用者提供的 pattern 做静态 ReDoS 检查。

### single 与 group Action

- **single** Action 接收一个字符串并返回一个字符串。当值为数组时，会对每个元素分别应用。
- **group** Action 接收整个数组并返回一个数组。它只能用于 group 键；应用于单个值时会抛出 `ACTION_TYPE_MISMATCH`。

这让链式组合变得自然：例如 `split` 将逗号分隔的字符串拆成数组，随后 `trim` 清洗每个元素。

### 自定义 Action

在 `ActionRegistry` 上注册自定义 Action，并将其传给提取器：

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

处理函数的签名是 `(data, ...params) => data`。`register()` 的第三个参数为 `'single'`（默认）或 `'group'`。

自定义 Action 会与内置 Action 合并。注册重复名称（包括与内置名称重复）会抛出 `ACTION_DUPLICATE`。

### 向 Action 共享数据

传入 `context`，即可让其中的值在 Action 处理函数中通过 `this` 访问：

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

## 错误

所有错误都以 `DomExtractorError` 抛出，它继承自 `Error`，并携带：

- `code` —— 稳定的错误码（见下表）
- `occur` —— `{ key, item }`，指向出错的搜索配置项
- `cause` —— 发生包装时的原始错误

消息以 `[DOM_EXTRACTOR_ERR]` 为前缀。

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

| 错误码                   | 含义                                             |
| ------------------------ | ------------------------------------------------ |
| `INVALID_DOM`            | 根节点不是 `Document` 或 `Element`               |
| `INVALID_MAP`            | 搜索配置不是普通对象                             |
| `SELECTOR_EMPTY`         | selector 缺失、为空或仅含空白                    |
| `INVALID_ACTIONS`        | `actions` 不是数组                               |
| `ELEMENT_NOT_FOUND`      | 找不到必需的元素                                 |
| `ATTR_READ_FAILED`       | 元素存在，但无法读取指定属性                     |
| `ACTION_NOT_FOUND`       | 指定的 Action 未注册                             |
| `ACTION_DUPLICATE`       | 同名 Action 已注册                               |
| `INVALID_ACTION_NAME`    | Action 名称缺失或不是字符串                      |
| `INVALID_APPLY_FOR`      | `applyFor` 既不是 `'single'` 也不是 `'group'`    |
| `INVALID_ACTION_HANDLE`  | Action 处理函数不是函数或没有参数                |
| `INVALID_ACTION_PARAMS`  | Action 的 `params` 不是数组                      |
| `ACTION_PARAMS_REQUIRED` | 内置 Action 缺少必需参数                         |
| `INVALID_ACTION_DATA`    | Action 收到的数据既不是字符串也不是数组          |
| `ACTION_TYPE_MISMATCH`   | single/group Action 应用于不匹配的值类型         |
| `REGEXP_INPUT_TOO_LONG`  | 正则类 Action 的输入超过长度上限                 |
| `INVALID_REGEX_GUARD_OPTIONS`  | 内部正则守卫收到的 `inputLimit` 非法             |
| `UNKNOWN_ERROR`          | 其它错误，包装时保留原始 `cause`                 |

传给 `search()` 的搜索配置不会被修改。

## API

### `new DomExtractor(options?)`

| 选项             | 类型             | 说明                                     |
| ---------------- | ---------------- | ---------------------------------------- |
| `groupKeys`      | `string[]`       | 需要返回数组的键                         |
| `actionRegistry` | `ActionRegistry` | 自定义 Action，与内置 Action 合并        |
| `context`        | `object`         | 在 Action 处理函数中通过 `this` 访问的数据 |

### `search(dom, map): Promise<Record<string, string | string[]>>`

按照 `map` 从 `dom` 中提取值。

### `new ActionRegistry()`

| 成员                                      | 说明                                             |
| ----------------------------------------- | ------------------------------------------------ |
| `register(name, handle, applyFor?)`       | 注册 Action；`applyFor` 默认为 `'single'`        |
| `includes(name)`                          | 检查某个 Action 名称是否已注册                   |
| `getAction(name)`                         | 返回对应 Action，未找到时抛出 `ACTION_NOT_FOUND` |
| `ActionRegistry.getMerged(...registries)` | 合并多个注册表，名称重复时抛错                   |

### 导出的类型

`SearchMap`、`MapItem`、`ExtractorOptions`、`ActionCaller`、`ActionHandle`、`ApplyFor`、`ErrorOccurrence`、`ErrorCode`。

## 开发

```bash
npm install
npm test          # watch 模式
npm run test:run  # 运行一次
npm run build     # 编译到 dist/
```

## 许可证

[ISC](./LICENSE)
