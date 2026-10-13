<template>
  <main class="market">
    <router-link class="back" to="/">← {{ $t('Back to auctions', '返回拍卖市场') }}</router-link>

    <section class="studio" aria-labelledby="sell-heading">
      <div class="section-heading">
        <h2 id="sell-heading">{{ $t('Create a listing', '发布商品') }}</h2>
        <p>{{ $t('Add one clear photo and the information a bidder needs.', '添加清晰照片和竞拍者需要的信息。') }}</p>
      </div>

      <div v-if="!signedIn" class="feedback" role="alert">
        <p>{{ $t('Sign in to publish an auction.', '请先登录再发布拍卖。') }}</p>
        <router-link class="primary-button" to="/login">{{ $t('Sign in', '登录') }}</router-link>
      </div>

      <form v-else class="listing-form" @submit.prevent="createListing">
        <label class="dropzone" :class="{ selected: preview }">
          <input ref="file" type="file" accept="image/png,image/jpeg,image/webp" @change="selectImage" />
          <img v-if="preview" :src="preview" alt="Preview of your uploaded LEGO set" />
          <template v-else>
            <span class="upload-mark" aria-hidden="true">+</span>
            <strong>{{ $t('Add a set photo', '添加套装照片') }}</strong>
            <span class="upload-copy">{{ $t('Choose a clear, well-lit image.', '选择清晰且光线充足的图片。') }}</span>
            <span class="choose-file">{{ $t('Choose file', '选择文件') }}</span>
            <small>{{ $t('JPG, PNG or WEBP. Max 6 MB.', '支持 JPG、PNG 或 WEBP，最大 6 MB。') }}</small>
          </template>
          <span v-if="preview" class="change-photo">{{ $t('Change photo', '更换照片') }}</span>
        </label>

        <div class="fields">
          <label>
            <span>{{ $t('Set name', '套装名称') }}</span>
            <input v-model.trim="form.name" :placeholder="$t('What set are you listing?', '你要发布哪个套装？')" required maxlength="90" />
          </label>

          <label>
            <span>{{ $t('The details', '商品详情') }} <small>{{ $t('Theme, condition, box and completeness', '主题、成色、包装盒和完整度') }}</small></span>
            <textarea
              v-model.trim="form.description"
              :placeholder="$t('Tell bidders what they should know about the set', '填写竞拍者需要了解的套装信息')"
              rows="3"
              required
              maxlength="600"
            ></textarea>
          </label>
          <fieldset class="categories-field">
            <legend>{{ $t('LEGO themes', '乐高主题') }}</legend>
            <label v-for="category in categories" :key="category.category_id" class="category-option">
              <input v-model="form.category_ids" type="checkbox" :value="category.category_id" />
              <span>{{ category.name }}</span>
            </label>
            <label v-if="otherSelected" class="custom-theme">
              <span>{{ $t('Custom theme name', '自定义主题名称') }}</span>
              <input v-model.trim="form.custom_category" maxlength="40" :placeholder="$t('e.g. Architecture', '例如：建筑')" required />
            </label>
          </fieldset>

          <div class="field-row">
            <label>
              <span>{{ $t('Starting price', '起拍价格') }}</span>
              <div class="price-input">
                <b>£</b>
                <input
                  v-model.number="form.starting_bid"
                  aria-label="Starting price in pounds"
                  type="number"
                  min="1"
                  step="1"
                  placeholder="0"
                  required
                />
              </div>
            </label>

            <label>
              <span>{{ $t('Auction duration', '拍卖时长') }}</span>
              <select v-model="duration">
                <option :value="86400">{{ $t('24 hours', '24 小时') }}</option>
                <option :value="259200">{{ $t('3 days', '3 天') }}</option>
                <option :value="604800">{{ $t('7 days', '7 天') }}</option>
                <option :value="1209600">{{ $t('14 days', '14 天') }}</option>
                <option value="custom">{{ $t('Custom duration', '自定义时长') }}</option>
              </select>
              <span v-if="duration === 'custom'" class="custom-duration">
                <span><small>{{ $t('Days', '天') }}</small><input v-model.number="customDays" type="number" min="0" max="365" step="1" inputmode="numeric" /></span>
                <span><small>{{ $t('Hours', '小时') }}</small><input v-model.number="customHours" type="number" min="0" max="23" step="1" inputmode="numeric" /></span>
              </span>
            </label>
          </div>

          <div class="publish-row">
            <p>{{ $t('Your listing becomes visible as soon as it is published.', '发布后商品会立即显示在市场中。') }}</p>
            <div class="listing-actions">
              <button type="button" class="draft-button" @click="saveDraft">{{ $t('Save draft', '保存草稿') }}</button>
              <button class="publish" :disabled="submitting">
                {{ submitting ? $t('Publishing...', '发布中…') : $t('Publish auction', '发布拍卖') }}
              </button>
            </div>
          </div>
          <p v-if="formMessage" role="status" class="form-message" :class="{ error: formError }">
            {{ formMessage }}
          </p>
        </div>
      </form>
    </section>

    <section class="drafts" aria-labelledby="drafts-title">
      <h3 id="drafts-title">{{ $t('Saved drafts', '已保存的草稿') }} <small>({{ drafts.length }})</small></h3>
      <p v-if="!drafts.length">{{ $t('No saved drafts.', '暂无草稿。') }}</p>
      <article v-for="draft in drafts" :key="draft.id">
        <span><strong>{{ draft.name || $t('Untitled set', '未命名套装') }}</strong><small>{{ formatDraftDate(draft.updated_at) }}</small></span>
        <div><button type="button" @click="editDraft(draft)">{{ $t('Edit', '编辑') }}</button><button type="button" @click="deleteDraft(draft.id)">{{ $t('Delete', '删除') }}</button></div>
      </article>
    </section>
  </main>
</template>

<script>
import axios from 'axios';
import { API } from '../../services/api';

export default {
  name: 'Sell',
  data: () => ({
    signedIn: Boolean(localStorage.getItem('session_token')),
    categories: [],
    drafts: [],
    editingDraftId: null,
    preview: '',
    imageData: '',
    duration: 604800,
    customDays: 1,
    customHours: 0,
    submitting: false,
    formMessage: '',
    formError: false,
    form: {
      name: '',
      description: '',
      starting_bid: null,
      category_ids: [],
      custom_category: ''
    }
  }),
  computed: {
    otherCategory() { return this.categories.find(category => category.name === 'Other'); },
    otherSelected() { return !!this.otherCategory && this.form.category_ids.includes(this.otherCategory.category_id); },
    auctionDuration() {
      if (this.duration !== 'custom') return Number(this.duration);
      return (Number(this.customDays) || 0) * 86400 + (Number(this.customHours) || 0) * 3600;
    }
  },
  mounted() {
    window.addEventListener('auth-change', this.refreshAuth);
    this.loadCategories();
    this.loadDrafts();
  },
  beforeUnmount() { window.removeEventListener('auth-change', this.refreshAuth); },
  methods: {
    refreshAuth() { this.signedIn = Boolean(localStorage.getItem('session_token')); },
    async loadCategories() { try { this.categories = (await axios.get(`${API}/categories`, { timeout: 10000 })).data; } catch { this.categories = []; } },
    loadDrafts() {
      try {
        const saved = JSON.parse(localStorage.getItem('auction_drafts') || '[]');
        this.drafts = Array.isArray(saved) ? saved.filter(draft => draft && typeof draft === 'object' && typeof draft.id === 'string') : [];
      } catch { this.drafts = []; }
    },
    persistDrafts(nextDrafts) {
      try { localStorage.setItem('auction_drafts', JSON.stringify(nextDrafts)); this.drafts = nextDrafts; return true; }
      catch { this.formMessage = this.$t('Draft storage is full. Remove an old draft and retry.', '草稿存储空间已满，请删除旧草稿后重试。'); this.formError = true; return false; }
    },
    saveDraft() {
      const draft = { id: this.editingDraftId || `${Date.now()}-${Math.random().toString(16).slice(2)}`, ...this.form, category_ids: [...this.form.category_ids], imageData: this.imageData, duration: this.duration, customDays: this.customDays, customHours: this.customHours, updated_at: Date.now() };
      const index = this.drafts.findIndex(item => item.id === draft.id);
      const nextDrafts = [...this.drafts];
      if (index >= 0) nextDrafts.splice(index, 1, draft); else nextDrafts.unshift(draft);
      if (this.persistDrafts(nextDrafts)) { this.editingDraftId = draft.id; this.formMessage = this.$t('Draft and photo saved in this browser.', '草稿和照片已保存在此浏览器中。'); this.formError = false; }
    },
    editDraft(draft) {
      this.form = { name: draft.name || '', description: draft.description || '', starting_bid: draft.starting_bid ?? null, category_ids: Array.isArray(draft.category_ids) ? [...draft.category_ids] : [], custom_category: draft.custom_category || '' };
      this.duration = draft.duration || 604800;
      this.customDays = draft.customDays ?? 1;
      this.customHours = draft.customHours ?? 0;
      this.editingDraftId = draft.id;
      this.imageData = typeof draft.imageData === 'string' && /^data:image\/(png|jpeg|webp);base64,/.test(draft.imageData) ? draft.imageData : '';
      this.preview = this.imageData;
      document.getElementById('sell-heading')?.scrollIntoView();
    },
    deleteDraft(id, skipConfirm = false) { if (!skipConfirm && !window.confirm(this.$t('Delete this draft?', '确定删除这份草稿吗？'))) return; if (this.persistDrafts(this.drafts.filter(draft => draft.id !== id)) && this.editingDraftId === id) this.editingDraftId = null; },
    formatDraftDate(value) { return new Date(value).toLocaleString(); },
    selectImage(event) {
      const file = event.target.files?.[0];
      if (!file) return;
      this.formMessage = '';
      this.formError = false;
      if (file.size > 6 * 1024 * 1024) {
        this.formMessage = this.$t('Image must be smaller than 6 MB.', '图片必须小于 6 MB。');
        this.formError = true;
        event.target.value = '';
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        this.preview = reader.result;
        this.imageData = reader.result;
      };
      reader.readAsDataURL(file);
    },
    async createListing() {
      if (this.submitting) return;
      this.formMessage = '';
      this.formError = false;
      if (!localStorage.getItem('session_token')) {
        this.formMessage = this.$t('Sign in first to publish an auction.', '请先登录再发布拍卖。');
        this.formError = true;
        this.$router.push('/login');
        return;
      }
      if (!this.imageData) {
        this.formMessage = this.$t('Add a photo of your LEGO set first.', '请先添加乐高套装照片。');
        this.formError = true;
        return;
      }
      if (!Number.isInteger(this.auctionDuration) || this.auctionDuration < 3600 || this.auctionDuration > 365 * 86400) {
        this.formMessage = this.$t('Choose a duration between 1 hour and 365 days.', '请选择 1 小时到 365 天之间的拍卖时长。');
        this.formError = true;
        return;
      }

      this.submitting = true;
      try {
        const headers = { 'X-Authorization': localStorage.getItem('session_token') };
        const upload = await axios.post(`${API}/upload-card-image`, { image: this.imageData }, { headers });
        const { data: created } = await axios.post(
          `${API}/item`,
          {
            ...this.form,
            end_date: Math.floor(Date.now() / 1000) + this.auctionDuration,
            image_url: upload.data.image_url
          },
          { headers }
        );
        if (this.editingDraftId) this.deleteDraft(this.editingDraftId, true);
        this.form = { name: '', description: '', starting_bid: null, category_ids: [], custom_category: '' };
        this.editingDraftId = null;
        this.preview = '';
        this.imageData = '';
        this.$refs.file.value = '';
        this.$router.push(`/item/${created.item_id}`);
      } catch (error) {
        this.formMessage = error.response?.data?.error_message || this.$t('Could not publish this auction. Try again.', '无法发布此拍卖，请重试。');
        this.formError = true;
      } finally {
        this.submitting = false;
      }
    }
  }
};
</script>

<style scoped>
.market {
  width: min(calc(100% - 48px), 1180px);
  margin: 0 auto;
  padding: 38px 0 24px;
}

.back {
  color: var(--muted);
  font-size: 0.84rem;
}

.back:hover {
  color: var(--accent);
}

.studio {
  margin-top: 26px;
  padding: 42px;
  border: 1px solid #c5ccd8;
  border-top: 7px solid var(--accent);
  border-radius: var(--radius);
  background: var(--surface);
  box-shadow: 0 18px 44px rgba(31,48,75,.11);
}

.section-heading {
  max-width: 600px;
}

.section-heading h2 {
  margin: 0;
  font-size: clamp(2rem, 3vw, 2.65rem);
  line-height: 1.05;
}

.section-heading p {
  margin: 12px 0 0;
  color: var(--muted);
  line-height: 1.55;
}

.feedback {
  min-height: 220px;
  margin-top: 26px;
  padding: 44px;
  display: grid;
  place-content: center;
  justify-items: center;
  gap: 18px;
  border: 1px solid var(--line);
  border-radius: var(--radius);
  background: var(--surface);
  text-align: center;
  color: var(--muted);
}

.feedback p {
  margin: 0;
}

.feedback .primary-button {
  min-width: 96px;
  min-height: 44px;
  padding: 11px 22px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  white-space: nowrap;
  line-height: 1.2;
  font-size: 0.92rem;
}

.listing-form {
  margin-top: 30px;
  display: grid;
  grid-template-columns: minmax(280px, 0.84fr) minmax(0, 1.4fr);
  gap: 38px;
}

.dropzone {
  position: relative;
  min-height: 360px;
  padding: 28px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 9px;
  overflow: hidden;
  border: 2px dashed #aeb7c5;
  border-radius: var(--radius);
  background:
    radial-gradient(circle at 16px 16px, rgba(23,35,59,.055) 0 5px, transparent 5.5px) 0 0 / 32px 32px,
    #f3f5f8;
  text-align: center;
  cursor: pointer;
}

.dropzone:hover,
.dropzone:focus-within {
  border-color: var(--accent);
}

.dropzone input {
  position: absolute;
  width: 1px;
  height: 1px;
  opacity: 0;
}

.dropzone img {
  position: absolute;
  inset: 18px;
  width: calc(100% - 36px);
  height: calc(100% - 36px);
  object-fit: contain;
}

.upload-mark {
  width: 42px;
  height: 42px;
  margin-bottom: 7px;
  display: grid;
  place-items: center;
  border: 1px solid #b69200;
  border-radius: var(--radius-control);
  background: var(--lego-yellow);
  color: var(--ink);
  font-size: 1.5rem;
}

.dropzone strong {
  font-size: 0.96rem;
}

.upload-copy,
.dropzone small {
  color: var(--muted);
  font-size: 0.78rem;
}

.choose-file,
.change-photo {
  padding: 9px 13px;
  border: 1px solid var(--line);
  border-radius: var(--radius-control);
  background: var(--surface);
  color: var(--ink);
  font-size: 0.82rem;
  font-weight: 650;
}

.choose-file {
  margin: 8px 0 2px;
}

.change-photo {
  position: absolute;
  right: 14px;
  bottom: 14px;
  box-shadow: var(--shadow);
}

.fields {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.fields label {
  display: grid;
  gap: 8px;
  color: var(--ink);
  font-size: 0.84rem;
  font-weight: 650;
}

.fields label small {
  margin-left: 6px;
  color: var(--muted);
  font-size: 0.76rem;
  font-weight: 400;
}

.fields input,
.fields textarea,
.fields select {
  width: 100%;
  padding: 12px 13px;
  border: 1px solid #c5ccd7;
  border-radius: var(--radius-control);
  background: var(--surface);
  color: var(--ink);
}

.fields input::placeholder,
.fields textarea::placeholder {
  color: var(--muted);
  opacity: 0.9;
}

.fields textarea {
  min-height: 102px;
  resize: vertical;
}

.field-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 18px;
}

.categories-field {
  display: flex;
  flex-wrap: wrap;
  gap: 9px;
  margin: 0;
  padding: 18px;
  border: 1px solid #c8d0dc;
  border-radius: var(--radius);
  background: #f1f3f7;
}

.categories-field legend { padding: 0 8px; color: var(--ink); font-size: .84rem; font-weight: 700; }
.categories-field .category-option { position: relative; display: block; font-weight: 600; cursor: pointer; }
.category-option input { position: absolute; width: 1px; height: 1px; opacity: 0; pointer-events: none; }
.category-option span {
  display: block;
  padding: 9px 12px;
  border: 1px solid #a8ae9b;
  background: var(--surface);
  color: var(--ink);
  line-height: 1;
  border-radius: var(--radius-control);
  box-shadow: 0 2px 0 #b9c1ce;
}
.category-option input:checked + span { border-color: #b69200; background: var(--lego-yellow); box-shadow: 0 3px 0 #b69200; }
.category-option input:focus-visible + span { outline: 3px solid var(--accent); outline-offset: 2px; }
.category-option:hover span { border-color: var(--ink); }
.custom-theme { flex: 1 1 100%; margin-top: 7px; }
.custom-theme span { font-size: .78rem; }
.custom-theme input { width: min(100%, 420px); margin-top: 7px; padding: 10px 11px; border: 1px solid #858d78; background: var(--surface); color: var(--ink); }

.custom-duration {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
  padding: 12px;
  border: 1px solid var(--line);
  border-radius: var(--radius-control);
  background: var(--surface-muted);
}

.custom-duration > span { display: grid; gap: 6px; }
.custom-duration small { margin: 0 !important; color: var(--muted); font-weight: 650 !important; }
.custom-duration input { width: 100%; background: var(--surface); }

.price-input {
  display: flex;
  align-items: center;
  border: 1px solid var(--line);
  border-radius: var(--radius-control);
  background: var(--surface);
}

.price-input b {
  padding-left: 13px;
  color: var(--muted);
  font-weight: 500;
}

.price-input input {
  border: 0;
  box-shadow: none;
  background: transparent;
}

.publish-row {
  margin-top: 2px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 20px;
}

.publish-row p {
  max-width: 300px;
  margin: 0;
  color: var(--muted);
  font-size: 0.78rem;
  line-height: 1.5;
}

.listing-actions { display: flex; align-items: center; gap: 12px; }

.publish {
  flex: 0 0 auto;
  padding: 12px 18px;
  border: 0;
  border-radius: var(--radius-control);
  background: var(--accent);
  color: #fff;
  font-weight: 760;
  box-shadow: 0 4px 0 #971923;
}

.publish:hover {
  background: var(--accent-hover);
}

.draft-button {
  padding: 12px 17px;
  border: 1px solid var(--ink);
  border-radius: var(--radius-control);
  background: var(--surface);
  color: var(--ink);
  font-weight: 680;
  box-shadow: 0 3px 0 var(--ink);
}

.draft-button:hover { background: var(--surface-muted); }

.form-message {
  margin: 0;
  color: var(--ink);
  font-size: 0.84rem;
}

.form-message.error {
  color: var(--danger);
}

.drafts {
  margin-top: 34px;
  padding-top: 20px;
  border-top: 2px solid var(--ink);
}

.drafts h3 { margin: 0; font-size: 1.15rem; }
.drafts h3 small { color: var(--muted); font-size: .78rem; font-weight: 500; }
.drafts article { display: flex; justify-content: space-between; gap: 16px; padding: 14px 0; border-bottom: 1px solid var(--line); }
.drafts small { display: block; margin-top: 4px; color: var(--muted); }
.drafts button { margin-left: 8px; padding: 7px 10px; border: 1px solid var(--line); background: var(--surface); color: var(--ink); }

@media (max-width: 900px) {
  .listing-form { gap: 26px; }
}

@media (max-width: 700px) {
  .market { width: calc(100% - 36px); }
  .studio { padding: 26px 20px; }
  .listing-form { grid-template-columns: 1fr; }
  .dropzone { min-height: 260px; }
  .field-row { grid-template-columns: 1fr; }
  .publish-row { align-items: stretch; flex-direction: column; }
  .listing-actions { width: 100%; }
  .listing-actions button { flex: 1; }
}
</style>
