import { Marked } from 'marked'
import { markedHighlight } from 'marked-highlight'
import hljs from 'highlight.js/lib/core'
import DOMPurify from 'dompurify'

// 仅注册常用语言，避免打包全部语言导致体积过大
import javascript from 'highlight.js/lib/languages/javascript'
import typescript from 'highlight.js/lib/languages/typescript'
import python from 'highlight.js/lib/languages/python'
import xml from 'highlight.js/lib/languages/xml'
import css from 'highlight.js/lib/languages/css'
import json from 'highlight.js/lib/languages/json'
import bash from 'highlight.js/lib/languages/bash'
import markdown from 'highlight.js/lib/languages/markdown'
import sql from 'highlight.js/lib/languages/sql'
import java from 'highlight.js/lib/languages/java'
import go from 'highlight.js/lib/languages/go'
import rust from 'highlight.js/lib/languages/rust'
import yaml from 'highlight.js/lib/languages/yaml'
import plaintext from 'highlight.js/lib/languages/plaintext'

const languages = {
  javascript, typescript, python, xml, css, json,
  bash, markdown, sql, java, go, rust, yaml, plaintext,
}
for (const [name, lang] of Object.entries(languages)) {
  hljs.registerLanguage(name, lang)
}
hljs.registerAliases(['js'], { languageName: 'javascript' })
hljs.registerAliases(['ts'], { languageName: 'typescript' })
hljs.registerAliases(['py'], { languageName: 'python' })
hljs.registerAliases(['html', 'vue'], { languageName: 'xml' })
hljs.registerAliases(['sh', 'shell', 'zsh'], { languageName: 'bash' })
hljs.registerAliases(['yml'], { languageName: 'yaml' })
hljs.registerAliases(['text', 'plain', 'txt'], { languageName: 'plaintext' })

// 配置 marked：启用 GFM（表格、删除线、任务列表）+ 代码高亮
const marked = new Marked(
  markedHighlight({
    langPrefix: 'hljs language-',
    highlight(code, lang) {
      // 未注册的语言一律按纯文本处理，绝不让单个代码块的高亮失败拖垮整篇渲染
      const language = lang && hljs.getLanguage(lang) ? lang : 'plaintext'
      try {
        return hljs.highlight(code, { language }).value
      } catch {
        return hljs.highlight(code, { language: 'plaintext' }).value
      }
    },
  }),
)

marked.setOptions({
  gfm: true,
  breaks: true,
})

// 让外部链接在新标签页打开，并加上安全属性
DOMPurify.addHook('afterSanitizeAttributes', (node) => {
  if (node.tagName === 'A' && node.getAttribute('href')) {
    node.setAttribute('target', '_blank')
    node.setAttribute('rel', 'noopener noreferrer')
  }
})

/**
 * 将 Markdown 文本渲染为净化后的安全 HTML 字符串。
 * 渲染异常时回退为转义后的原文，保证预览区不至于白屏。
 */
export function renderMarkdown(text) {
  try {
    const raw = marked.parse(text ?? '')
    return DOMPurify.sanitize(raw, {
      ADD_ATTR: ['target', 'rel'],
    })
  } catch (err) {
    console.error('Markdown 渲染失败：', err)
    const escaped = String(text ?? '').replace(
      /[&<>]/g,
      (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[c],
    )
    return `<pre class="render-error">${escaped}</pre>`
  }
}
