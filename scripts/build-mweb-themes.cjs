/**
 * 把 imageslr/mweb-themes 的 SCSS 主题编译为本项目可用的「预览样式」CSS。
 *
 * 用法（依赖不进 package.json，临时安装即可）：
 *   git clone --depth 1 https://github.com/imageslr/mweb-themes.git /tmp/mweb-themes
 *   npm i --no-save sass@1.32 postcss@8
 *   node scripts/build-mweb-themes.cjs /tmp/mweb-themes
 *
 * 转换规则：
 * - 所有选择器收拢到 `.mweb-<id>` 作用域下，`html` / `body` / `:root` / `.markdown-body`
 *   本身合并为作用域根节点，并去掉其 max-width / margin / padding（宽度由全屏阅读宽度控制）
 * - 删除引用相对路径字体文件的 @font-face（项目内不附带字体，回退到本地字体）
 * - prism 的 `.token.xxx` 高亮配色映射为 highlight.js 的 `.hljs-xxx`
 * - 产物写入 src/styles/mweb/，并生成主题清单 index.js
 */
const fs = require('fs')
const path = require('path')
const sass = require('sass')
const postcss = require('postcss')

const repo = process.argv[2]
if (!repo) {
  console.error('请传入 mweb-themes 仓库路径')
  process.exit(1)
}
const themeDir = path.join(repo, 'src/themes')
const outDir = path.join(__dirname, '../src/styles/mweb')
const config = require(path.join(themeDir, 'mweb-config.js'))

// 主题显示名：保留原英文名
const displayName = (id) =>
  id.split('-').map((w) => w[0].toUpperCase() + w.slice(1)).join(' ')

// prism token → highlight.js 类名
// 只映射语义一一对应的 token；attr-value / entity / char / atrule 在 prism 主题里常与
// keyword、string 混在同一条规则，映射过去会让 hljs 的字符串被染成关键字色，故不映射
const TOKEN_MAP = {
  comment: ['comment', 'quote'],
  prolog: ['meta'],
  doctype: ['meta'],
  cdata: ['meta'],
  punctuation: ['punctuation'],
  property: ['property'],
  tag: ['tag', 'name'],
  boolean: ['literal'],
  number: ['number'],
  constant: ['variable.constant_'],
  symbol: ['symbol', 'bullet'],
  deleted: ['deletion'],
  selector: ['selector-tag', 'selector-id', 'selector-class'],
  'attr-name': ['attr', 'attribute'],
  string: ['string'],
  builtin: ['built_in'],
  inserted: ['addition'],
  operator: ['operator'],
  url: ['link'],
  keyword: ['keyword', 'meta.keyword'],
  function: ['title.function_'],
  'class-name': ['title', 'title.class_'],
  regex: ['regexp'],
  important: ['strong'],
  variable: ['variable', 'template-variable', 'params'],
  bold: ['strong'],
  italic: ['emphasis'],
}

const ROOT_SELECTOR = /^(html|body|:root|\.markdown-body)$/
const LAYOUT_PROPS = /^(max-width|min-width|margin|padding)(-|$)/

function scopeSelector(sel, scope) {
  sel = sel.trim()
  if (/^html\./.test(sel)) return null // 例如 html.borderbox *，依赖宿主页面类名，丢弃
  if (ROOT_SELECTOR.test(sel)) return scope
  const m = sel.match(/^(html|body|\.markdown-body)(?=[\s>+~:.[])(.*)$/)
  if (m) {
    // `.markdown-body > p` / `.markdown-body.xxx` / `body .x`
    return m[1] === '.markdown-body' ? scope + m[2] : `${scope}${m[2].startsWith(' ') ? '' : ' '}${m[2]}`.replace(/\s+/g, ' ')
  }
  return `${scope} ${sel}`
}

// 为包含 prism token 的选择器补一份 hljs 版本
function hljsSelectors(sel) {
  const m = sel.match(/^(.*?)\.token\.([a-z-]+)((?:\.[a-z-]+)*)$/)
  if (!m) return []
  const [, prefix, token, extra] = m
  if (extra || /language-|\.style|\.token/.test(prefix)) return []
  const targets = TOKEN_MAP[token]
  if (!targets) return []
  return targets.map((t) => `${prefix}.hljs-${t}`)
}

function transform(css, id) {
  const scope = `.mweb-${id}`
  const root = postcss.parse(css)

  root.walkAtRules('font-face', (at) => {
    const src = at.nodes?.find((d) => d.prop === 'src')?.value || ''
    if (/url\((?!["']?(data:|https?:))/.test(src)) at.remove()
  })
  root.walkAtRules('import', (at) => at.remove())

  root.walkRules((rule) => {
    if (rule.parent?.type === 'atrule' && /keyframes$/.test(rule.parent.name)) return
    const isRoot = rule.selectors.every((s) => ROOT_SELECTOR.test(s.trim()))
    const scoped = rule.selectors.map((s) => scopeSelector(s, scope)).filter(Boolean)
    if (!scoped.length) return rule.remove()
    const extra = scoped.flatMap(hljsSelectors)
    rule.selectors = [...new Set([...scoped, ...extra])]
    if (isRoot) {
      rule.walkDecls((d) => {
        if (LAYOUT_PROPS.test(d.prop)) d.remove()
      })
      if (!rule.nodes.length) rule.remove()
    }
  })
  return root
}

// 从产物中提取色板：背景、正文、强调色（链接色）
function extractSwatch(root, scope) {
  const pick = (selector, props) => {
    let val = null
    root.walkRules((rule) => {
      if (rule.parent.type !== 'root' || !rule.selectors.includes(selector)) return
      rule.walkDecls((d) => {
        if (props.includes(d.prop) && !/var\(|inherit|none|transparent/.test(d.value)) val = d.value
      })
    })
    return val
  }
  return {
    bg: pick(scope, ['background-color', 'background']) || '#ffffff',
    fg: pick(scope, ['color']) || '#333333',
    accent: pick(`${scope} a`, ['color']) || pick(`${scope} h1`, ['color']) || '#3182ce',
  }
}

fs.rmSync(outDir, { recursive: true, force: true })
fs.mkdirSync(outDir, { recursive: true })

const manifest = []
for (const [id, meta] of Object.entries(config)) {
  const file = path.join(themeDir, meta.file)
  const compiled = sass.renderSync({ file, includePaths: [themeDir] }).css.toString()
  const root = transform(compiled, id)
  const header = `/* mweb-themes · ${id}\n * 来源：https://github.com/imageslr/mweb-themes（ISC）\n * 由 scripts/build-mweb-themes.cjs 生成，请勿手改 */\n`
  fs.writeFileSync(path.join(outDir, `${id}.css`), header + root.toString())
  manifest.push({ id, name: displayName(id), mode: meta.mode === 'dark' ? 'dark' : 'light', ...extractSwatch(root, `.mweb-${id}`) })
}

const index = `// 由 scripts/build-mweb-themes.cjs 生成，请勿手改
// 预览样式清单：来自 https://github.com/imageslr/mweb-themes
export const mwebThemes = ${JSON.stringify(manifest, null, 2)}
`
fs.writeFileSync(path.join(outDir, 'index.js'), index)
console.log(`已生成 ${manifest.length} 套预览样式 → ${path.relative(process.cwd(), outDir)}`)
