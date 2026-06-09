<script setup>
// Markdown Studio 品牌标识：几何极简「M↓」（箭头 descender M）。
// 单色，继承 currentColor，由父级 CSS 控制尺寸与颜色 → 自动跟随主题。
// 路径源数据见 docs/superpowers/specs/2026-06-09-logo-redesign-design.md。
</script>

<template>
  <svg
    class="brand-logo"
    viewBox="0 0 96 96"
    fill="none"
    stroke="currentColor"
    stroke-width="9"
    stroke-linecap="round"
    stroke-linejoin="round"
    role="img"
    aria-label="Markdown Studio"
  >
    <path d="M22 58 L22 24 L48 46 L74 24 L74 58" />
    <path d="M48 46 L48 78" />
    <path d="M35 65 L48 78 L61 65" />
  </svg>
</template>

<style scoped>
.brand-logo {
  display: block;
  width: 100%;
  height: 100%;
}
</style>
