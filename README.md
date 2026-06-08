# Markdown Studio ✍️

一个安静、专注的在线 Markdown 编辑器，基于 Vue 3 + Vite。左侧书写，右侧实时预览。

## 功能

- **实时预览**：输入即渲染，编辑区与预览区滚动同步。
- **格式化工具条**：加粗、斜体、删除线、标题、引用、代码、列表、任务、链接、图片、表格、分割线，并支持 `Cmd/Ctrl + B / I / K` 快捷键。
- **扩展语法**：GFM 表格、任务列表、删除线，以及代码块语法高亮（基于 highlight.js）。
- **文件操作**：新建、打开本地 `.md`、导出 `.md`、导出独立 `.html`、一键复制 HTML。
- **本地存储**：内容自动保存到浏览器 `localStorage`，刷新不丢失。
- **明暗主题**：暖纸张亮色与深墨暗色一键切换。
- **全屏模式**：沉浸式写作。
- **安全渲染**：HTML 输出经 DOMPurify 净化，防止 XSS。

## 开发

```bash
npm install
npm run dev      # 启动开发服务器 http://localhost:5173
npm run build    # 生产构建到 dist/
npm run preview  # 预览生产构建
```

## 技术栈

- Vue 3（`<script setup>`）+ Vite 6
- marked + marked-highlight（Markdown 解析）
- highlight.js（按需注册常用语言）
- DOMPurify（HTML 净化）

## 目录结构

```
src/
├─ App.vue                  # 主布局，文件/主题/全屏/滚动同步
├─ components/
│  ├─ Toolbar.vue           # 顶部工具栏
│  ├─ EditorPane.vue        # 编辑区 + 格式化工具条
│  └─ PreviewPane.vue       # 实时预览区
├─ composables/
│  ├─ useMarkdown.js        # marked + 高亮 + 净化封装
│  └─ useStorage.js         # localStorage 持久化
├─ data/sample.js           # 初始示例文档
└─ styles/                  # 全局与 Markdown 排版样式
```
