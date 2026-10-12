<template>
  <section class="collection" aria-labelledby="collection-title">
    <header><div><p class="eyebrow">MY BRICKS</p><h2 id="collection-title">{{ t('套装收集进度', 'Set collection progress') }}</h2></div>
      <button type="button" :disabled="busy" @click="start()">{{ t('+ 添加套装', '+ Add set') }}</button></header>
    <p class="hint">{{ t('记录每套乐高已收集的零件，离完整套装更近一步。', 'Track the pieces you own for each LEGO set.') }}</p>
    <p v-if="loading" role="status">{{ t('正在加载…', 'Loading…') }}</p>
    <p v-if="error" class="error" role="alert">{{ error }} <button v-if="loadFailed" @click="load">{{ t('重试', 'Retry') }}</button></p>
    <p v-if="!loading && !loadFailed && !entries.length" class="empty">{{ t('还没有记录。添加你正在收集的第一套乐高。', 'No sets yet. Add the first set you are collecting.') }}</p>
    <article v-for="entry in entries" :key="entry.collection_id" class="entry">
      <div class="entry-heading"><h3>{{ entry.name }}</h3><strong>{{ percent(entry) }}%</strong></div>
      <progress :value="entry.collected" :max="entry.total" :aria-label="entry.name"></progress>
      <div class="entry-footer"><span>{{ entry.collected.toLocaleString() }} / {{ entry.total.toLocaleString() }} {{ t('件', 'pieces') }} · {{ entry.collected === entry.total ? t('已集齐', 'Complete') : t(`还差 ${entry.total - entry.collected} 件`, `${entry.total - entry.collected} remaining`) }}</span>
        <button type="button" :disabled="busy" @click="start(entry)">{{ t('更新进度', 'Update') }}</button></div>
    </article>
    <form v-if="draft" @submit.prevent="save">
      <h3>{{ draft.collection_id ? t('更新套装', 'Update set') : t('添加套装', 'Add a set') }}</h3>
      <label>{{ t('套装名称 / 编号', 'Set name / number') }}<input ref="nameInput" v-model.trim="draft.name" list="collection-set-names" required maxlength="120" :placeholder="t('例如：75375 千年隼', 'e.g. 75375 Millennium Falcon')" /></label>
      <datalist id="collection-set-names"><option v-for="name in setNames" :key="name" :value="name" /></datalist>
      <div class="counts"><label>{{ t('总零件数', 'Total pieces') }}<input v-model.number="draft.total" type="number" min="1" max="1000000" step="1" required /></label>
      <label>{{ t('已收集零件数', 'Pieces collected') }}<input v-model.number="draft.collected" type="number" min="0" :max="draft.total || 0" step="1" required /></label></div>
      <div class="actions"><button class="save" :disabled="busy">{{ busy ? t('保存中…', 'Saving…') : t('保存进度', 'Save progress') }}</button><button type="button" :disabled="busy" @click="draft = null">{{ t('取消', 'Cancel') }}</button>
        <button v-if="draft.collection_id" class="remove" type="button" :disabled="busy" @click="remove">{{ t('删除记录', 'Delete record') }}</button></div>
    </form>
    <p v-if="message" role="status">{{ message }}</p>
  </section>
</template>

<script>
import axios from 'axios';
import { API } from '../services/api';
export default {
  data: () => ({ entries: [], setNames: [], draft: null, loading: true, loadFailed: false, busy: false, error: '', message: '', zh: localStorage.getItem('lang') === 'zh' }),
  mounted() { this.load(); window.addEventListener('language-change', this.language); },
  beforeUnmount() { window.removeEventListener('language-change', this.language); },
  methods: {
    language() { this.zh = localStorage.getItem('lang') === 'zh'; },
    t(zh, en) { return this.zh ? zh : en; },
    percent(entry) { return entry.collected === entry.total ? 100 : Math.floor(entry.collected / entry.total * 100); },
    options() { return { headers: { 'X-Authorization': localStorage.getItem('session_token') }, timeout: 10000 }; },
    async load() {
      this.loading = true; this.error = ''; this.loadFailed = false;
      try { this.entries = (await axios.get(`${API}/collections`, this.options())).data; }
      catch { this.loadFailed = true; this.error = this.t('无法加载收集进度，请重试。', 'Could not load collection progress. Please retry.'); }
      finally { this.loading = false; }
      try { this.setNames = [...new Set((await axios.get(`${API}/items`, { timeout: 10000 })).data.map(item => item.name))]; } catch { /* Custom set names remain available. */ }
    },
    start(entry) { this.draft = entry ? { ...entry } : { name: '', total: null, collected: 0 }; this.message = ''; this.$nextTick(() => this.$refs.nameInput?.focus()); },
    async save() {
      if (this.busy) return;
      const { name, total, collected } = this.draft;
      if (!name || !Number.isSafeInteger(total) || total < 1 || total > 1000000 || !Number.isSafeInteger(collected) || collected < 0 || collected > total) {
        this.error = this.t('请填写名称和有效整数，已收集数量不能超过总数。', 'Enter a name and valid whole numbers. Collected pieces cannot exceed the total.'); return;
      }
      this.busy = true; this.error = ''; this.message = '';
      try {
        const id = this.draft.collection_id;
        if (id) { await axios.put(`${API}/collections/${id}`, { name, total, collected }, this.options()); this.entries = this.entries.map(entry => entry.collection_id === id ? { ...entry, name, total, collected } : entry); }
        else { const { data } = await axios.post(`${API}/collections`, { name, total, collected }, this.options()); this.entries.unshift(data); }
        this.draft = null; this.message = this.t('收集进度已保存。', 'Collection progress saved.');
      } catch { this.error = this.t('保存失败，请检查登录状态后重试。', 'Could not save. Check your session and retry.'); }
      finally { this.busy = false; }
    },
    async remove() {
      if (!window.confirm(this.t('删除这条套装收集记录？', 'Delete this set collection record?'))) return;
      this.busy = true; this.error = ''; this.message = '';
      try { const id = this.draft.collection_id; await axios.delete(`${API}/collections/${id}`, this.options()); this.entries = this.entries.filter(entry => entry.collection_id !== id); this.draft = null; this.message = this.t('记录已删除。', 'Record deleted.'); }
      catch { this.error = this.t('删除失败，请重试。', 'Could not delete. Please retry.'); }
      finally { this.busy = false; }
    }
  }
};
</script>

<style scoped>
.collection { margin-top: 32px; padding: 28px 0; border-bottom: 1px solid var(--line); }
header, .entry-heading, .entry-footer, .actions { display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap; }
.eyebrow { color: var(--accent); font-size: .7rem; letter-spacing: .12em; margin: 0 0 8px; font-weight: 700; }
h2 { margin: 0; font-size: 1.4rem; } h3 { margin: 0; font-size: 1rem; overflow-wrap: anywhere; }
.hint, .empty, .entry-footer { color: var(--muted); font-size: .85rem; line-height: 1.6; }
.empty { padding: 20px 0; } .entry { padding: 22px 0; border-top: 1px solid var(--line); }
.entry-heading strong { font-variant-numeric: tabular-nums; color: var(--accent); }
progress { display: block; width: 100%; height: 9px; margin: 14px 0 10px; border: 0; border-radius: 5px; overflow: hidden; background: var(--line); accent-color: var(--accent); }
progress::-webkit-progress-bar { background: var(--line); } progress::-webkit-progress-value { background: var(--accent); } progress::-moz-progress-bar { background: var(--accent); }
button { padding: 9px 13px; border: 1px solid var(--line); border-radius: var(--radius-control); background: var(--surface); color: var(--ink); cursor: pointer; }
button:disabled { opacity: .55; cursor: wait; } button:hover:not(:disabled) { border-color: var(--accent); }
form { display: grid; gap: 18px; padding: 22px; background: var(--surface-muted); border-radius: var(--radius); }
label { display: grid; gap: 8px; font-size: .85rem; } input { width: 100%; min-width: 0; padding: 11px; border: 1px solid var(--line); border-radius: var(--radius-control); background: var(--surface); color: var(--ink); }
.counts { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; } .actions { justify-content: flex-start; } .save { background: var(--accent); color: white; border-color: var(--accent); } .remove { margin-left: auto; color: var(--danger); } .error { color: var(--danger); }
@media(max-width: 520px) { .counts { grid-template-columns: 1fr; } form { padding: 16px; } }
</style>
