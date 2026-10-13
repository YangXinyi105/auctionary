<template>
  <main class="market">
    <section class="intro" aria-labelledby="market-title">
      <div class="intro-copy">
        <p class="kicker">{{ $t('Brick collector marketplace', '积木收藏者市场') }}</p>
        <h1 id="market-title">{{ $t('LEGO set auctions.', '乐高套装拍卖.') }}</h1>
        <p>{{ $t('Buy, sell and bid on LEGO sets from other collectors.', '购买、出售并竞拍其他收藏者的乐高套装。') }}</p>
        <div class="intro-actions">
          <button class="primary-link" type="button" @click="scrollToLots">{{ $t('Browse auctions', '浏览拍卖') }}</button>
          <router-link class="primary-link ghost" to="/sell">{{ $t('Sell a set', '发布套装') }}</router-link>
        </div>
      </div>
      <div class="intro-meta" aria-live="polite">
        <strong>{{ total }}</strong>
        <span>{{ query ? $t('matching auctions', '个匹配拍卖') : $t('auctions listed', '个拍卖商品') }}</span>
        <small>{{ $t('New listings appear here as soon as collectors publish them.', '收藏者发布后，新商品会立即显示在这里。') }}</small>
      </div>
    </section>

    <section class="collection" id="lots" aria-labelledby="auction-heading">
      <div class="section-heading">
        <h2 id="auction-heading">{{ $t('Live auctions', '正在拍卖') }}</h2>
        <p>{{ $t('Open a set to see its details, bid history and end time.', '打开套装可查看详情、竞价记录和结束时间。') }}</p>
      </div>

      <div class="toolbar">
        <label class="search">
          <span class="visually-hidden">{{ $t('Search sets', '搜索套装') }}</span>
          <input v-model="query" :aria-label="$t('Search sets', '搜索套装')" :placeholder="$t('Search set names', '搜索套装名称')" @input="scheduleSearch" />
        </label>
        <label class="sort-label">
          <span>{{ $t('Sort', '排序') }}</span>
          <select v-model="sort" aria-label="Sort auctions" @change="offset = 0; load()">
            <option value="ending">{{ $t('Ending soon', '即将结束') }}</option>
            <option value="price">{{ $t('Highest price', '价格最高') }}</option>
            <option value="newest">{{ $t('Recently listed', '最新发布') }}</option>
          </select>
        </label>
        <label class="sort-label">
          <span>{{ $t('Theme', '主题') }}</span>
          <select v-model="categoryId" aria-label="Filter by LEGO theme" @change="offset = 0; load()">
            <option value="">{{ $t('All themes', '全部主题') }}</option>
            <option v-for="category in categories" :key="category.category_id" :value="category.category_id">{{ category.name }}</option>
          </select>
        </label>
      </div>

      <GooLoader v-if="loading" :label="$t('Loading auctions...', '正在加载拍卖…')" />
      <div v-else-if="error" class="feedback" role="alert">
        <p>{{ error }}</p>
        <button type="button" @click="load">{{ $t('Try again', '重试') }}</button>
      </div>
      <div v-else-if="!filteredItems.length" class="empty-copy">
        <h3>{{ query ? $t('No matching sets', '没有匹配的套装') : $t('No auctions yet', '暂无拍卖') }}</h3>
        <p>{{ query ? $t('Try another set name.', '试试其他套装名称。') : $t('Upload a LEGO set to create the first listing.', '上传乐高套装，创建第一个商品。') }}</p>
        <router-link v-if="!query" to="/sell">{{ $t('Create a listing', '发布商品') }}</router-link>
      </div>
      <div v-else class="product-grid">
        <ItemCard
          v-for="(item, index) in filteredItems"
          :key="item.item_id"
          :item="item"
          :index="index"
        />
      </div>
      <div class="pagination">
        <button :disabled="loading || offset === 0" @click="offset -= 20; load()">{{ $t('Previous', '上一页') }}</button>
        <span>{{ $t('Page', '第') }} {{ offset / 20 + 1 }} {{ $t('', '页') }}</span>
        <button :disabled="loading || !hasMore" @click="offset += 20; load()">{{ $t('Next', '下一页') }}</button>
      </div>
    </section>

    <section class="sell-cta" aria-labelledby="sell-cta-heading">
      <div>
        <h2 id="sell-cta-heading">{{ $t('Have a set to sell?', '有套装想出手？') }}</h2>
        <p>{{ $t('Add one clear photo and the information a bidder needs.', '添加清晰照片和竞拍者需要的信息。') }}</p>
      </div>
      <router-link class="primary-link" to="/sell">{{ $t('Create a listing', '发布商品') }}</router-link>
    </section>
  </main>
</template>

<script>
import axios from 'axios';
import ItemCard from '../../components/ItemCard.vue';
import GooLoader from '../../components/GooLoader.vue';
import { searchItems } from '../../services/core.service';
import { API } from '../../services/api';

export default {
  name: 'Home',
  components: { ItemCard, GooLoader },
  data: () => ({
    items: [],
    total: 0,
    loading: true,
    error: '',
    query: '',
    offset: 0,
    hasMore: false,
    searchTimer: null,
    loadSequence: 0,
    sort: 'ending',
    categoryId: '',
    categories: []
  }),
  computed: {
    filteredItems() {
      return this.items
        .filter((item) => item.name.toLowerCase().includes(this.query.toLowerCase()))
        .slice()
        .sort((a, b) => {
          if (this.sort === 'price') return b.current_bid - a.current_bid;
          if (this.sort === 'newest') return b.start_date - a.start_date;
          return a.end_date - b.end_date;
        });
    }
  },
  mounted() {
    this.loadCategories();
    this.load();
  },
  beforeUnmount() { clearTimeout(this.searchTimer); },
  methods: {
    scrollToLots() {
      document.getElementById('lots')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    },
    scheduleSearch() { clearTimeout(this.searchTimer); this.searchTimer = setTimeout(() => { this.offset = 0; this.load(); }, 250); },
    async load() {
      const sequence = ++this.loadSequence;
      this.loading = true;
      try {
        const params = { q: this.query, limit: 20, offset: this.offset, sort: this.sort };
        if (this.categoryId) params.category_id = this.categoryId;
        const results = await searchItems(params);
        if (sequence !== this.loadSequence) return;
        this.total = results.total;
        this.hasMore = this.offset + 20 < this.total;
        this.items = results.items;
        this.error = '';
      } catch {
        if (sequence === this.loadSequence) this.error = this.$t('Could not load listings. Make sure the backend is running.', '无法加载商品，请确认后端已启动。');
      } finally {
        if (sequence === this.loadSequence) this.loading = false;
      }
    },
    async loadCategories() { try { this.categories = (await axios.get(`${API}/categories`, { timeout: 10000 })).data; } catch { this.categories = []; } }
  }
};
</script>

<style scoped>
.market {
  width: min(calc(100% - 48px), 1344px);
  margin: 0 auto;
  padding-bottom: 24px;
}

.intro {
  position: relative;
  min-height: 390px;
  margin-top: 24px;
  padding: 58px 54px 52px;
  display: grid;
  grid-template-columns: minmax(0, 1.8fr) minmax(240px, 0.7fr);
  gap: 80px;
  align-items: end;
  overflow: hidden;
  border: 1px solid #d1ad19;
  border-radius: var(--radius);
  background:
    radial-gradient(circle at 18px 18px, rgba(255,255,255,.38) 0 7px, rgba(182,146,0,.14) 7.5px 9px, transparent 9.5px) 0 0 / 36px 36px,
    var(--lego-yellow);
  box-shadow: 0 8px 0 #d0a91d, 0 20px 45px rgba(35,44,64,.12);
}

.intro::after {
  content: "";
  position: absolute;
  right: -70px;
  top: -95px;
  width: 280px;
  height: 280px;
  border: 58px solid rgba(255,255,255,.2);
  border-radius: 50%;
  pointer-events: none;
}

.intro-copy {
  max-width: 760px;
}

.kicker {
  margin: 0 0 18px;
  color: #8f2028;
  font-size: 0.82rem;
  font-weight: 800;
  letter-spacing: .01em;
}

.intro h1 {
  max-width: 760px;
  margin: 0;
  font-size: clamp(3rem, 5.3vw, 5.3rem);
  line-height: 1;
  letter-spacing: -0.055em;
  font-weight: 900;
}

.intro-copy > p:not(.kicker) {
  margin: 22px 0 0;
  color: #394457;
  font-size: 1.04rem;
  line-height: 1.55;
}

.intro-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-top: 28px;
}

.primary-link {
  display: inline-block;
  padding: 11px 17px;
  border-radius: var(--radius-control);
  background: var(--accent);
  color: #fff;
  font-size: 0.9rem;
  font-weight: 760;
  box-shadow: 0 4px 0 #971923;
}

.primary-link:hover {
  background: var(--accent-hover);
}

.primary-link.ghost {
  background: transparent;
  color: var(--ink);
  box-shadow: inset 0 0 0 3px var(--ink);
}

.primary-link.ghost:hover {
  background: rgba(0, 0, 0, .07);
}

.intro-meta {
  position: relative;
  z-index: 1;
  padding: 25px;
  display: grid;
  border: 1px solid rgba(23,35,59,.22);
  border-radius: var(--radius);
  background: rgba(255,255,255,.52);
  backdrop-filter: blur(8px);
}

.intro-meta strong {
  font-size: 2.2rem;
  line-height: 1;
  letter-spacing: -0.045em;
}

.intro-meta span {
  margin-top: 6px;
  font-weight: 650;
}

.intro-meta small {
  max-width: 240px;
  margin-top: 14px;
  color: var(--muted);
  font-size: 0.78rem;
  line-height: 1.55;
}

.collection {
  scroll-margin-top: 92px;
  padding-top: 82px;
}

.section-heading {
  max-width: 600px;
}

.section-heading h2 {
  margin: 0;
  font-size: clamp(2rem, 3vw, 2.65rem);
  line-height: 1.05;
  letter-spacing: -0.045em;
}

.section-heading p {
  margin: 12px 0 0;
  color: var(--muted);
  line-height: 1.55;
}

.toolbar {
  margin: 30px 0 32px;
  display: grid;
  grid-template-columns: minmax(220px, 1fr) auto auto;
  gap: 12px;
  align-items: center;
}

.search input,
.sort-label select {
  width: 100%;
  border: 1px solid #c5ccd7;
  border-radius: var(--radius-control);
  background: var(--surface);
  color: var(--ink);
}

.search input {
  padding: 13px 15px;
  box-shadow: inset 0 1px 2px rgba(31,48,75,.04);
}

.search input::placeholder {
  color: var(--muted);
  opacity: 0.9;
}

.sort-label {
  display: flex;
  align-items: center;
  gap: 9px;
  color: var(--muted);
  font-size: 0.82rem;
}

.sort-label select {
  width: auto;
  min-width: 156px;
  padding: 12px 34px 12px 12px;
}

.product-grid {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 34px 18px;
}

.feedback,
.empty-copy {
  min-height: 220px;
  padding: 44px;
  display: grid;
  place-content: center;
  justify-items: center;
  border: 1px solid var(--line);
  border-radius: var(--radius);
  background: var(--surface);
  text-align: center;
}

.feedback {
  color: var(--muted);
}

.feedback p {
  margin: 0 0 18px;
}

.feedback button,
.empty-copy a {
  padding: 10px 15px;
  border: 1px solid var(--line);
  border-radius: var(--radius-control);
  background: var(--surface);
  color: var(--ink);
  font-weight: 650;
}

.empty-copy h3 {
  margin: 0;
  font-size: 1.25rem;
}

.empty-copy p {
  margin: 9px 0 20px;
  color: var(--muted);
}

.pagination {
  display: flex;
  align-items: center;
  gap: 18px;
  margin-top: 28px;
}

.pagination button {
  padding: 9px 15px;
  border: 1px solid var(--line);
  border-radius: var(--radius-control);
  background: var(--surface);
  color: var(--ink);
}

.pagination button:not(:disabled):hover {
  border-color: var(--ink);
  box-shadow: 0 3px 0 var(--ink);
}

.sell-cta {
  margin-top: 72px;
  padding: 34px 38px;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 24px;
  border-radius: var(--radius);
  background: var(--lego-blue);
  color: #fff;
  box-shadow: 0 8px 0 var(--lego-blue-dark);
}

.sell-cta h2 {
  margin: 0;
  font-size: clamp(1.5rem, 2.4vw, 2rem);
  line-height: 1.1;
}

.sell-cta p {
  margin: 10px 0 0;
  max-width: 46ch;
  color: rgba(255, 255, 255, .86);
}

.sell-cta .primary-link {
  flex: 0 0 auto;
}

.visually-hidden {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

@media (max-width: 1100px) {
  .product-grid {
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }
}

@media (max-width: 900px) {
  .intro {
    gap: 40px;
  }

  .product-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}

@media (max-width: 700px) {
  .market {
    width: calc(100% - 36px);
  }

  .intro {
    min-height: auto;
    margin-top: 14px;
    padding: 42px 24px 34px;
    grid-template-columns: 1fr;
    gap: 36px;
  }

  .intro h1 {
    font-size: clamp(2.8rem, 15vw, 4rem);
  }

  .intro-meta {
    padding: 20px;
    border: 1px solid rgba(23,35,59,.22);
  }

  .collection {
    padding-top: 52px;
  }

  .toolbar {
    grid-template-columns: 1fr;
  }

  .sort-label {
    justify-content: space-between;
  }

  .sort-label select {
    width: auto;
  }

  .product-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 24px 12px;
  }

  .sell-cta {
    margin-top: 52px;
    padding: 26px 22px;
    align-items: stretch;
    flex-direction: column;
  }

  .sell-cta .primary-link {
    text-align: center;
  }
}
</style>
