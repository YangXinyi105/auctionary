<template>
  <main class="detail">
    <router-link class="back" to="/">← {{ $t('Back to auctions', '返回拍卖市场') }}</router-link>

    <GooLoader v-if="loading" :show-label="false" :label="$t('Loading auction...', '正在加载拍卖…')" />
    <div v-else-if="error" class="notice" role="alert">
      <p>{{ error }}</p>
      <button type="button" @click="load">{{ $t('Try again', '重试') }}</button>
    </div>

    <div v-else class="layout">
      <section class="visual" aria-label="Set photo">
        <img v-if="image" :src="image" :alt="item.name" />
        <span v-else>{{ $t('No photo was provided for this set.', '此套装没有提供照片。') }}</span>
      </section>

      <section class="info">
        <div class="auction-meta">
          <span>{{ isEnded ? $t('Auction ended', '拍卖已结束') : $t('Live auction', '正在拍卖') }}</span>
          <span>{{ $t('Auction', '拍卖') }} #{{ item.item_id }}</span>
        </div>

        <h1>{{ item.name }}</h1>
        <p class="description">{{ item.description || $t('No description was provided for this set.', '此套装没有提供描述。') }}</p>
        <div v-if="item.categories?.length" class="category-list" aria-label="LEGO themes">
          <span v-for="category in item.categories" :key="category.category_id">{{ category.name }}</span>
        </div>
        <p>{{ $t('Seller:', '卖家：') }} <router-link :to="`/users/${item.creator_id}`">{{ item.first_name }} {{ item.last_name }}</router-link></p>
        <p v-if="isEnded" role="status">
          {{ item.current_bid_holder
            ? $t(`Winning bidder: ${item.current_bid_holder.first_name} ${item.current_bid_holder.last_name} · £${currentBid}`, `中标者：${item.current_bid_holder.first_name} ${item.current_bid_holder.last_name} · £${currentBid}`)
            : $t('This auction ended without bids.', '此拍卖无人出价。') }}
        </p>

        <div class="current">
          <span>{{ $t('Current highest bid', '当前最高出价') }}</span>
          <strong>£{{ currentBid }}</strong>
          <small>{{ $t(`${bids.length} ${bids.length === 1 ? 'bid' : 'bids'}`, `${bids.length} 次出价`) }}</small>
        </div>

        <div class="countdown">
          <div>
            <span>{{ $t('Auction ends in', '距离拍卖结束') }}</span>
            <strong>{{ timeLeft }}</strong>
          </div>
          <time :datetime="new Date(Number(item.end_date) * 1000).toISOString()">{{ endLabel }}</time>
        </div>

        <p v-if="isSeller">{{ $t('This is your listing. You cannot bid on it.', '这是你发布的商品，不能参与竞价。') }}</p>
        <form v-else class="bid-form" @submit.prevent="placeBid">
          <label for="bid-amount">{{ $t('Your bid in GBP', '你的出价（英镑）') }}</label>
          <div class="input-row">
            <span>£</span>
            <input
              id="bid-amount"
              v-model.number="bidAmount"
              type="number"
              :min="minimumBid"
              step="1"
              :placeholder="String(minimumBid)"
              :disabled="isEnded"
            />
            <button type="submit" :disabled="isEnded || submitting">
              {{ submitting ? $t('Submitting...', '提交中…') : isEnded ? $t('Auction ended', '拍卖已结束') : $t('Place bid', '提交出价') }}
            </button>
          </div>
          <small>{{ $t('Minimum next bid:', '最低下一次出价：') }} £{{ minimumBid }}</small>
          <p v-if="message" class="message" role="status">{{ message }}</p>
        </form>

        <section class="history" aria-labelledby="history-heading">
          <h2 id="history-heading">{{ $t('Bid history', '竞价记录') }} <span>{{ bids.length }}</span></h2>
          <p v-if="bidHistoryError" role="alert">{{ bidHistoryError }} <button @click="load">{{ $t('Retry', '重试') }}</button></p>
          <div v-else-if="!bids.length" class="empty">{{ $t('No bids yet. Be the first to bid.', '暂无出价，成为第一个竞拍者。') }}</div>
          <div v-for="(bid, index) in bids" :key="`${bid.timestamp}-${index}`" class="bid-row">
            <span class="bid-avatar" aria-hidden="true">{{ String(bid.first_name || 'C').charAt(0).toUpperCase() }}</span>
            <span>
              {{ bid.first_name || $t('Collector', '收藏者') }} {{ bid.last_name || '' }}
              <small>{{ formatDate(bid.timestamp) }}</small>
            </span>
            <b>£{{ bid.amount }}</b>
          </div>
        </section>
        <AuctionQuestions :key="item.item_id" :item-id="item.item_id" :is-seller="isSeller" />
      </section>
    </div>
  </main>
</template>

<script>
import axios from 'axios';
import AuctionQuestions from '../../components/AuctionQuestions.vue';
import GooLoader from '../../components/GooLoader.vue';
import { getItem } from '../../services/core.service';
import { API } from '../../services/api';

export default {
  name: 'SingleItem',
  components: { AuctionQuestions, GooLoader },
  data: () => ({
    item: {},
    bids: [],
    bidHistoryError: '',
    loading: true,
    error: '',
    bidAmount: null,
    message: '',
    submitting: false,
    viewerId: null,
    now: Date.now()
  }),
  computed: {
    isSeller() { return this.viewerId === this.item.creator_id; },
    image() {
      return this.item.image_url || '';
    },
    currentBid() {
      const storedBid = Number(this.item.current_bid ?? this.item.starting_bid ?? 0);
      const placedBids = this.bids.map((bid) => Number(bid.amount));
      return Math.max(storedBid, ...placedBids);
    },
    minimumBid() {
      return this.currentBid + 1;
    },
    isEnded() {
      return Number(this.item.end_date) * 1000 <= this.now;
    },
    timeLeft() {
      const remaining = Math.max(0, Number(this.item.end_date) * 1000 - this.now);
      const days = Math.floor(remaining / 86400000);
      const hours = Math.floor((remaining % 86400000) / 3600000);
      const minutes = Math.floor((remaining % 3600000) / 60000);
      const seconds = Math.floor((remaining % 60000) / 1000);
      return `${days}d ${String(hours).padStart(2, '0')}h ${String(minutes).padStart(2, '0')}m ${String(seconds).padStart(2, '0')}s`;
    },
    endLabel() {
      return new Date(Number(this.item.end_date) * 1000).toLocaleString();
    }
  },
  mounted() {
    this.load();
    this.timer = setInterval(() => {
      this.now = Date.now();
    }, 1000);
  },
  watch: { '$route.params.id'() { this.message = ''; this.load(); } },
  beforeUnmount() {
    clearInterval(this.timer);
  },
  methods: {
    async load() {
      this.loading = true;
      this.error = '';
      this.bidHistoryError = '';
      try {
        this.item = await getItem(this.$route.params.id);
        this.viewerId = null;
        if (localStorage.getItem('session_token')) {
          try { this.viewerId = (await axios.get(`${API}/users/me`, { headers: { 'X-Authorization': localStorage.getItem('session_token') } })).data.user_id; } catch { /* Public details remain available. */ }
        }
        try {
          const response = await axios.get(`${API}/item/${this.$route.params.id}/bid`);
          this.bids = response.data;
        } catch {
          this.bids = [];
          this.bidHistoryError = this.$t('Bid history could not be loaded.', '无法加载竞价记录。');
        }
      } catch {
        this.error = this.$t('Auction could not be loaded. Start the backend and try again.', '无法加载拍卖，请启动后端后重试。');
      } finally {
        this.loading = false;
      }
    },
    async placeBid() {
      this.message = '';
      if (!localStorage.getItem('session_token')) {
        this.message = this.$t('Sign in before placing a bid.', '请登录后再出价。');
        return;
      }
      if (!this.bidAmount || Number(this.bidAmount) < this.minimumBid) {
        this.message = this.$t(`Enter at least £${this.minimumBid}.`, `出价至少为 £${this.minimumBid}。`);
        return;
      }

      this.submitting = true;
      try {
        await axios.post(
          `${API}/item/${this.item.item_id}/bid`,
          { amount: Number(this.bidAmount) },
          { headers: { 'X-Authorization': localStorage.getItem('session_token') } }
        );
        this.message = this.$t('Your bid is live.', '你的出价已生效。');
        this.bidAmount = null;
        await this.load();
      } catch (error) {
        this.message = error.response?.data?.error_message || this.$t('Bid could not be placed. Please try again.', '出价失败，请重试。');
      } finally {
        this.submitting = false;
      }
    },
    formatDate(value) {
      return new Date(Number(value) * 1000).toLocaleString();
    }
  }
};
</script>

<style scoped>
.detail {
  width: min(calc(100% - 48px), 1180px);
  min-height: calc(100dvh - 160px);
  margin: 0 auto;
  padding: 38px 0 72px;
}

.back {
  color: var(--muted);
  font-size: 0.84rem;
}

.back:hover {
  color: var(--accent);
}

.layout {
  margin-top: 28px;
  display: grid;
  grid-template-columns: minmax(360px, 1.12fr) minmax(360px, 0.88fr);
  gap: 64px;
  align-items: start;
}

.visual {
  position: sticky;
  top: 100px;
  min-height: 590px;
  display: grid;
  place-items: center;
  overflow: hidden;
  border: 1px solid var(--line);
  border-radius: var(--radius);
  background: var(--surface-muted);
  color: var(--muted);
}

.visual img {
  width: 100%;
  height: 100%;
  max-height: 640px;
  padding: 32px;
  object-fit: contain;
}

.visual > span {
  padding: 28px;
  text-align: center;
}

.auction-meta {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  color: var(--muted);
  font-size: 0.78rem;
}

.auction-meta span:first-child {
  color: var(--accent);
  font-weight: 700;
}

.info h1 {
  margin: 17px 0 15px;
  font-family: "Aptos Display", "Segoe UI Variable Display", "Segoe UI", sans-serif;
  font-size: clamp(2.8rem, 5vw, 4.65rem);
  line-height: 0.98;
  letter-spacing: -0.06em;
  overflow-wrap: anywhere;
}

.description {
  margin: 0;
  color: var(--muted);
  line-height: 1.65;
}

.category-list { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 16px; }
.category-list span { padding: 5px 8px; border: 1px solid var(--ink); background: #f9dc75; font-size: .76rem; font-weight: 650; }

.current {
  margin-top: 30px;
  padding: 21px 0;
  display: grid;
  grid-template-columns: 1fr auto;
  align-items: end;
  border-top: 1px solid var(--line);
  border-bottom: 1px solid var(--line);
}

.current > span {
  grid-column: 1 / -1;
  color: var(--muted);
  font-size: 0.8rem;
}

.current strong {
  margin-top: 6px;
  color: var(--ink);
  font-size: 2.35rem;
  line-height: 1;
  letter-spacing: -0.045em;
}

.current small {
  color: var(--muted);
}

.countdown {
  padding: 20px 0;
  display: flex;
  justify-content: space-between;
  align-items: end;
  gap: 20px;
  border-bottom: 1px solid var(--line);
}

.countdown div {
  display: grid;
  gap: 5px;
}

.countdown span,
.countdown time {
  color: var(--muted);
  font-size: 0.76rem;
}

.countdown strong {
  color: var(--accent);
  font-size: 1.08rem;
}

.countdown time {
  max-width: 180px;
  text-align: right;
}

.bid-form {
  margin-top: 25px;
}

.bid-form > label {
  display: block;
  margin-bottom: 8px;
  font-size: 0.84rem;
  font-weight: 650;
}

.input-row {
  display: flex;
  align-items: center;
  overflow: hidden;
  border: 1px solid var(--line);
  border-radius: var(--radius-control);
  background: var(--surface);
}

.input-row > span {
  padding-left: 13px;
  color: var(--muted);
}

.input-row input {
  min-width: 0;
  flex: 1;
  padding: 12px 8px;
  border: 0;
  outline: 0;
  background: transparent;
  color: var(--ink);
}

.input-row button {
  align-self: stretch;
  padding: 0 17px;
  border: 0;
  background: var(--accent);
  color: #fff8f5;
  font-weight: 700;
}

.input-row button:hover:not(:disabled) {
  background: var(--accent-hover);
}

.bid-form > small {
  display: block;
  margin-top: 8px;
  color: var(--muted);
}

.message {
  margin: 12px 0 0;
  color: var(--danger);
  font-size: 0.84rem;
}

.history {
  margin-top: 34px;
}

.history h2 {
  margin: 0;
  padding-bottom: 13px;
  border-bottom: 1px solid var(--line);
  font-size: 1.14rem;
}

.history h2 span {
  margin-left: 7px;
  color: var(--muted);
  font-size: 0.78rem;
  font-weight: 500;
}

.empty {
  padding: 22px 0;
  color: var(--muted);
  font-size: 0.84rem;
}

.bid-row {
  padding: 14px 0;
  display: grid;
  grid-template-columns: 34px 1fr auto;
  gap: 11px;
  align-items: center;
  border-bottom: 1px solid var(--line);
  font-size: 0.86rem;
}

.bid-row small {
  display: block;
  margin-top: 3px;
  color: var(--muted);
  font-size: 0.72rem;
}

.bid-row > b {
  color: var(--accent);
}

.bid-avatar {
  width: 32px;
  height: 32px;
  display: grid;
  place-items: center;
  border-radius: 50%;
  background: var(--accent-soft);
  color: var(--accent);
  font-weight: 700;
}

.notice {
  min-height: 420px;
  display: grid;
  place-content: center;
  justify-items: center;
  color: var(--muted);
  text-align: center;
}

.notice p {
  margin: 0 0 18px;
}

.notice button {
  padding: 10px 15px;
  border: 1px solid var(--line);
  border-radius: var(--radius-control);
  background: var(--surface);
  color: var(--ink);
  font-weight: 650;
}

@media (max-width: 860px) {
  .layout {
    grid-template-columns: 1fr;
    gap: 38px;
  }

  .visual {
    position: static;
    min-height: 420px;
  }
}

@media (max-width: 560px) {
  .detail {
    width: calc(100% - 36px);
    padding-top: 28px;
  }

  .visual {
    min-height: 340px;
  }

  .visual img {
    padding: 20px;
  }

  .countdown {
    align-items: start;
    flex-direction: column;
  }

  .countdown time {
    text-align: left;
  }

  .input-row {
    display: grid;
    grid-template-columns: auto 1fr;
  }

  .input-row button {
    grid-column: 1 / -1;
    padding: 12px;
  }
}
</style>
