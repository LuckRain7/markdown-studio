# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目概述

Markdown Studio 是一个纯前端的在线 Markdown 编辑器（Vue 3 `<script setup>` + Vite 6）。无后端、无路由、无状态管理库——所有数据存在浏览器内存与 `localStorage` 中。

## 常用命令

```bash
npm install
npm run dev      # 开发服务器，默认 http://localhost:5173（vite.config.js 中配置了 open: true）
npm run build    # 生产构建到 dist/
npm run preview  # 本地预览生产构建
```

仓库中**没有测试框架、没有 lint 配置**。不要假设 `npm test` / `npm run lint` 存在。

## 架构

数据流是单向的，全部由 `src/App.vue` 这个根组件统筹：

- **状态归属 App.vue**：`content`（正文）和 `theme` 都是 `usePersistentRef` 创建的、自动同步到 `localStorage` 的响应式引用。所有文件操作（新建/打开/导出 .md/导出 .html/复制 HTML）、主题切换、全屏、字数统计都集中在 App.vue，子组件只负责展示和发事件。
- **`src/composables/useStorage.js`** — `usePersistentRef(key, fallback, delay)`：包装 `ref` + 防抖写入 `localStorage`，读写都用 try/catch 兜底（隐私模式/配额满时降级而非崩溃）。新增需要持久化的状态时复用它，不要直接调 `localStorage`。
- **`src/composables/useMarkdown.js`** — 唯一的渲染管线，导出 `renderMarkdown(text)`。内部：`marked`（开启 GFM + breaks）→ `marked-highlight`（代码高亮）→ `DOMPurify.sanitize`（防 XSS）。**预览渲染和 HTML 导出共用这一个函数**，所以改渲染行为只需改这里一处。
- **highlight.js 按需注册**：为控制打包体积，只在 `useMarkdown.js` 顶部显式 `import` 并注册了一批常用语言（js/ts/python/go/rust/sql/yaml…）和别名。**要支持新语言，必须在此处 import 对应 `highlight.js/lib/languages/xxx` 并加进 `languages` 表**——否则该语言代码块会回退成 plaintext。

### 编辑区 ⇆ 预览区滚动同步

App.vue 的 `syncScroll` 按滚动比例双向同步。它依赖两个子组件用 `defineExpose` 暴露的内部 DOM 节点：

- `EditorPane.vue` → `defineExpose({ textarea })`
- `PreviewPane.vue` → `defineExpose({ scroller })`

App.vue 通过 `editorRef.value.textarea` / `previewRef.value.scroller` 直接读写 `scrollTop`。`syncing` 标志位 + `requestAnimationFrame` 复位用来打断回声循环——动这块逻辑时要保持这个不变量，否则会出现滚动卡死。

### 容错约定

代码里多处刻意做了降级而非抛错，改动时请沿用：
- `renderMarkdown` 渲染失败 → 回退为转义后的 `<pre>`，预览区不白屏。
- 单个代码块高亮失败 / 语言未注册 → 当作 plaintext，不拖垮整篇。
- `localStorage` 读写失败 → `console.warn` 后用默认值继续。

### 安全

预览和导出的 HTML 一律经过 `DOMPurify`。`useMarkdown.js` 里有一个 `afterSanitizeAttributes` 钩子，给所有 `<a>` 补 `target="_blank"` + `rel="noopener noreferrer"`。新增允许的标签/属性要同步更新 `DOMPurify.sanitize` 的配置（当前 `ADD_ATTR: ['target', 'rel']`）。

## 约定

- 全屏是窗口内 CSS 全屏（`isFullscreen` 切类名），**不是浏览器原生 Fullscreen API**。
- UI 文案、注释、commit message 均为中文。
- 主题通过 `document.documentElement.dataset.theme`（`light` / `dark`）切换，配色定义在 `src/styles/global.css` 的 CSS 变量里。
