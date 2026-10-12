<template>
  <section class="activity">
    <h2>{{ $t('My auctions', '我的拍卖') }}</h2>
    <div class="tabs" :aria-label="$t('Auction filters', '拍卖筛选')">
      <button v-for="tab in tabs" :key="tab.value" :aria-pressed="status === tab.value" @click="status = tab.value; offset = 0; load()">{{ $t(tab.label, tab.zh) }}</button>
    </div>
    <GooLoader v-if="loading" compact :label="$t('Loading auctions...', '正在加载拍卖…')" />
    <p v-else-if="error" role="alert">{{ error }} <button @click="load">{{ $t('Retry', '重试') }}</button></p>
    <p v-else-if="!items.length">{{ $t('No auctions in this list yet.', '这个列表中暂无拍卖。') }}</p>
    <router-link v-for="item in items" v-show="!loading && !error" :key="item.item_id" :to="`/item/${item.item_id}`" class="auction-row">
      <span>{{ item.name }}<small>{{ new Date(item.end_date * 1000).toLocaleString() }}</small></span>
      <strong>£{{ item.current_bid }}</strong>
    </router-link>
    <div class="tabs"><button :disabled="loading || offset === 0" @click="offset -= 10; load()">{{ $t('Previous', '上一页') }}</button><span>{{ $t('Page', '第') }} {{ offset / 10 + 1 }} {{ $t('', '页') }}</span><button :disabled="loading || !hasMore" @click="offset += 10; load()">{{ $t('Next', '下一页') }}</button></div>
  </section>
</template>
<script>
import axios from 'axios';
import GooLoader from './GooLoader.vue';
import { apiUrl } from '../services/api';
export default {
  components: { GooLoader },
  data: () => ({ tabs: [{ value: 'OPEN', label: 'Selling', zh: '正在出售' }, { value: 'BID', label: 'My bids', zh: '我的竞价' }, { value: 'ARCHIVE', label: 'Ended listings', zh: '已结束' }], status: 'OPEN', items: [], offset: 0, hasMore: false, loading: false, error: '', sequence: 0 }),
  mounted() { this.load(); },
  methods: {
    async load() {
      const sequence = ++this.sequence; this.loading = true; this.error = '';
      try {
        const { data } = await axios.get(apiUrl('/search'), { params: { status: this.status, offset: this.offset, limit: 11 }, headers: { 'X-Authorization': localStorage.getItem('session_token') }, timeout: 10000 });
        if (sequence !== this.sequence) return;
        this.items = data.slice(0, 10); this.hasMore = data.length > 10;
      } catch { if (sequence === this.sequence) this.error = this.$t('Could not load your auctions. Please retry.', '无法加载你的拍卖，请重试。'); }
      finally { if (sequence === this.sequence) this.loading = false; }
    }
  }
};
</script>
<style scoped>
.activity { margin: 30px 0; } h2 { font-size: 1.4rem; }
.tabs { display: flex; flex-wrap: wrap; align-items: center; gap: 10px; margin: 20px 0; }
button { padding: 8px 12px; background: var(--surface); border: 1px solid var(--line); color: var(--ink); }
button[aria-pressed=true] { background: var(--accent); color: white; }
.auction-row { display: flex; gap: 18px; justify-content: space-between; padding: 18px 0; border-bottom: 1px solid var(--line); }
.auction-row:hover { color: var(--accent); } small { display: block; color: var(--muted); margin-top: 6px; } strong { white-space: nowrap; }
</style>
