<template>
  <div class="goo-loader" :class="{ compact }" role="status" :aria-label="label">
    <svg class="filter" aria-hidden="true" width="0" height="0"><defs><filter :id="filterId" x="-50%" y="-50%" width="200%" height="200%" color-interpolation-filters="sRGB"><feGaussianBlur in="SourceGraphic" stdDeviation="8" result="blur"/><feColorMatrix in="blur" mode="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 21 -7"/></filter></defs></svg>
    <svg aria-hidden="true" width="150" height="54" viewBox="0 0 150 54"><g :filter="`url(#${filterId})`"><circle class="circle" cx="75" cy="27" r="12"/><circle class="circle right" cx="75" cy="27" r="12"/></g></svg>
    <span v-if="showLabel">{{ label }}</span>
  </div>
</template>
<script>
let loaderId = 0;
export default {
  name: 'GooLoader',
  props: {
    label: { type: String, default: 'Loading...' },
    compact: Boolean,
    showLabel: { type: Boolean, default: true }
  },
  data: () => ({ filterId: `goo-loader-${++loaderId}` })
};
</script>
<style scoped>
/* MIT License, Copyright (c) 2023 Uiverse.io. Component by Nawsome: https://uiverse.io/Nawsome/moody-dingo-3 */
.goo-loader { min-height: 150px; display: grid; place-items: center; place-content: center; color: var(--muted); font-size: .82rem; }
.goo-loader.compact { min-height: 92px; }
.filter { position: absolute; }.circle { fill: var(--accent); animation: move571 1.8s linear infinite; }.circle.right { fill: #e0aa25; animation-direction: reverse; }
@keyframes move571 { 25% { transform: translateX(-24px); } 75% { transform: translateX(24px); } }
@media (prefers-reduced-motion: reduce) { .circle { animation: none; transform: translateX(-13px); }.circle.right { transform: translateX(13px); } }
</style>
