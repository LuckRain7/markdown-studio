# Markdown Studio Logo 重设计 · 设计说明

日期：2026-06-09

## 目标

为 Markdown Studio 设计一个真正的品牌标识，替换当前临时占位——工具栏里的 emoji「✍」和 index.html 里内联的 ✍️ favicon。

## 设计决策

| 维度 | 决策 |
|------|------|
| 核心概念 | Markdown 的「M↓」标记 |
| 造型 | 方案 C「箭头 descender M」——几何 M，中央连接点向下延伸出竖杆 + 箭头，隐喻「向下写出 / 导出内容」 |
| 风格 | 无边框、几何极简、单色单笔 |
| 线条 | `stroke-width: 9`，`stroke-linecap/linejoin: round`，无填充 |
| 配色 | 单色 `currentColor`，由 CSS 控制 → 自动跟随主题（浅色 `--accent #3182ce` / 深色 `#4299e1`） |

## 标识源数据（唯一真相）

viewBox `0 0 96 96`，三段 path：

```
M 字身：  M22 58 L22 24 L48 46 L74 24 L74 58
箭头竖杆：M48 46 L48 78
箭头头：  M35 65 L48 78 L61 65
```

关键几何不变量：
- M 双腿底部在 y=58，箭头尖落在 y=78（descender 落于双腿下方，是该方案的识别点）。
- 箭头尖 (48,78) 同时是竖杆末端与箭头头的交点——三段必须共点，否则出现错位缺口。
- 全部使用 `currentColor`，禁止在 SVG 内写死颜色。

## 落地范围

1. **新建组件** `src/components/BrandLogo.vue`——纯展示的内联 SVG 组件，`width`/`height` 由 props 或父级 CSS 控制，颜色继承 `currentColor`。
   - 理由：工具栏品牌位与未来可能的其他位置复用同一份标识，避免 SVG 路径散落多处（呼应 CLAUDE.md「改渲染只改一处」的约定）。
2. **工具栏** `src/components/Toolbar.vue`——把 `<span class="brand-mark">✍</span>` 替换为 `<BrandLogo />`；调整 `.brand-mark` 相关样式让 SVG 尺寸/对齐与原 emoji 视觉等价。
3. **favicon** `index.html`——把内联 emoji 的 `data:image/svg+xml` 换成同款 M↓ 路径的内联 SVG data URI。
   - favicon 无法用 `currentColor`（脱离页面 CSS），固定填充浅色主调蓝 `#3182ce`，在浏览器标签浅/深底色下均清晰。

## 不做（YAGNI）

- 不引入图片资源文件（PNG/ICO）、不加构建步骤——沿用内联 SVG。
- 不改动主题/配色系统。
- 不做多尺寸 favicon 套件，单个矢量 favicon 足够。

## 验收

- `npm run dev` 后工具栏左上显示蓝色 M↓ 标识，切换深色主题时颜色自动变为 `#4299e1`。
- 浏览器标签页 favicon 显示同款 M↓。
- 缩到 16px favicon 仍可辨识 M 与下箭头。
