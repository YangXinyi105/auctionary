<template>
  <section class="questions">
    <h2>{{ $t('Questions & answers', '问答') }}</h2>
    <GooLoader v-if="loading" compact :label="$t('Loading questions...', '正在加载问题…')" />
    <p v-if="error" role="alert">{{ error }} <button type="button" @click="load">{{ $t('Retry', '重试') }}</button></p>
    <p v-if="!loading && !error && !questions.length">{{ $t('No questions yet.', '暂无问题。') }}</p>
    <article v-for="question in questions" :key="question.question_id">
      <header class="question-author">
        <router-link :to="`/users/${question.asked_by}`"><img :src="question.avatar_url || defaultAvatar(question.asked_by)" :alt="`${question.first_name} ${question.last_name}`" /></router-link>
        <div>
          <router-link class="author-name" :to="`/users/${question.asked_by}`">{{ question.first_name }} {{ question.last_name }}</router-link>
          <small>{{ $t('Collector', '收藏者') }}<span v-if="question.muted_until && question.muted_until * 1000 > Date.now()"> · {{ $t('Muted', '已禁言') }}</span></small>
        </div>
      </header>
      <h3>{{ question.question_text }}</h3>
      <p v-if="question.answer_text"><strong>{{ $t('Seller:', '卖家：') }}</strong> {{ question.answer_text }}</p>
      <p v-else>{{ $t("Awaiting the seller's reply.", '等待卖家回复。') }}</p>
      <form v-if="isSeller" @submit.prevent="answer(question)">
        <label :for="`answer-${question.question_id}`">{{ question.answer_text ? $t('Update your answer', '更新回答') : $t('Your answer', '你的回答') }}</label>
        <textarea :id="`answer-${question.question_id}`" v-model.trim="answers[question.question_id]" required maxlength="2000" rows="2"></textarea>
        <button :disabled="busy">{{ busy ? $t('Saving...', '保存中…') : $t('Save answer', '保存回答') }}</button>
      </form>
      <div v-if="isAdmin || question.asked_by === currentUserId" class="moderation">
        <button type="button" :disabled="busy" @click="removeQuestion(question)">{{ $t('Delete question', '删除问题') }}</button>
        <button v-if="isAdmin && !(question.muted_until && question.muted_until * 1000 > Date.now())" type="button" :disabled="busy || question.asked_by === currentUserId" @click="mute(question, 24)">{{ $t('Mute for 24 hours', '禁言 24 小时') }}</button>
        <button v-else-if="isAdmin" type="button" :disabled="busy" @click="mute(question, 0)">{{ $t('Unmute user', '解除禁言') }}</button>
      </div>
    </article>
    <form v-if="signedIn && !isSeller" @submit.prevent="ask">
      <label for="new-question">{{ $t('Ask the seller', '向卖家提问') }}</label>
      <textarea id="new-question" v-model.trim="questionText" required maxlength="2000" rows="3" :placeholder="$t('Ask about the set’s condition, box or missing pieces.', '询问套装成色、包装盒或缺失零件。')"></textarea>
      <button :disabled="busy">{{ busy ? $t('Sending...', '发送中…') : $t('Send question', '发送问题') }}</button>
    </form>
    <router-link v-else-if="!signedIn" to="/login">{{ $t('Sign in to ask a question', '登录后提问') }}</router-link>
    <p v-if="message" role="status">{{ message }}</p>
  </section>
</template>
<script>
import axios from 'axios';
import GooLoader from './GooLoader.vue';
import { API, apiUrl } from '../services/api';
export default {
  components: { GooLoader },
  props: { itemId: Number, isSeller: Boolean },
  data: () => ({ questions: [], answers: {}, questionText: '', loading: true, error: '', message: '', busy: false, signedIn: !!localStorage.getItem('session_token'), isAdmin: false, currentUserId: null }),
  mounted() { this.refreshAuth(); this.load(); window.addEventListener('auth-change', this.refreshAuth); },
  beforeUnmount() { window.removeEventListener('auth-change', this.refreshAuth); },
  methods: {
    defaultAvatar(id) { return apiUrl(`/uploads/${['lego-10698.jpg', 'lego-60367.jpg', 'lego-10303.jpg'][Number(id || 0) % 3]}`); },
    async refreshAuth() {
      this.signedIn = !!localStorage.getItem('session_token'); this.isAdmin = false; this.currentUserId = null;
      if (!this.signedIn) return;
      try { const { data } = await axios.get(`${API}/users/me`, this.options()); this.isAdmin = !!data.is_admin; this.currentUserId = data.user_id; } catch { /* Public questions remain available. */ }
    },
    options() { return { headers: { 'X-Authorization': localStorage.getItem('session_token') }, timeout: 10000 }; },
    async load() {
      this.loading = true; this.error = '';
      try { this.questions = (await axios.get(`${API}/item/${this.itemId}/question`, { timeout: 10000 })).data; this.questions.forEach(q => { this.answers[q.question_id] = q.answer_text || ''; }); }
      catch { this.error = this.$t('Could not load questions.', '无法加载问题。'); }
      finally { this.loading = false; }
    },
    async send(path, body) {
      if (this.busy) return false;
      this.busy = true; this.message = '';
      try { await axios.post(`${API}${path}`, body, this.options()); await this.load(); this.message = this.$t('Saved successfully.', '保存成功。'); return true; }
      catch (error) { this.message = error.response?.data?.error_message || this.$t('Could not save. Please retry.', '无法保存，请重试。'); return false; }
      finally { this.busy = false; }
    },
    async ask() { if (await this.send(`/item/${this.itemId}/question`, { question_text: this.questionText })) this.questionText = ''; },
    answer(question) { return this.send(`/question/${question.question_id}`, { answer_text: this.answers[question.question_id] }); },
    async removeQuestion(question) {
      if (!window.confirm(this.$t('Delete this question?', '确定删除这个问题吗？'))) return;
      this.busy = true; this.message = '';
      try { await axios.delete(`${API}/question/${question.question_id}`, this.options()); await this.load(); this.message = this.$t('Question deleted.', '问题已删除。'); }
      catch (error) { this.message = error.response?.data?.error_message || this.$t('Could not delete the question.', '无法删除问题。'); }
      finally { this.busy = false; }
    },
    async mute(question, hours) {
      this.busy = true; this.message = '';
      try { await axios.put(`${API}/admin/users/${question.asked_by}/mute`, { hours }, this.options()); await this.load(); this.message = hours ? this.$t('User muted for 24 hours.', '用户已禁言 24 小时。') : this.$t('User unmuted.', '已解除用户禁言。'); }
      catch (error) { this.message = error.response?.data?.error_message || this.$t('Could not update this user.', '无法更新该用户。'); }
      finally { this.busy = false; }
    }
  }
};
</script>
<style scoped>
.questions { margin-top: 36px; border-top: 2px solid var(--line); padding-top: 20px; }
h2 { font-size: 1.35rem; } h3 { font-size: 1rem; margin: 0; overflow-wrap: anywhere; }
article { padding: 20px 0; border-bottom: 1px solid var(--line); }
.question-author { display: flex; align-items: center; gap: 10px; margin-bottom: 13px; }
.question-author img { width: 38px; height: 38px; border: 1px solid var(--ink); border-radius: var(--radius-control); object-fit: cover; background: var(--surface); }
.question-author div { display: grid; gap: 2px; }
.question-author small { color: var(--muted); }
.author-name { color: var(--ink); font-weight: 750; text-decoration: none; }
.author-name:hover { color: var(--accent); text-decoration: underline; }
p { line-height: 1.6; color: var(--muted); white-space: pre-wrap; overflow-wrap: anywhere; }
form { display: grid; gap: 10px; margin-top: 20px; }
textarea { width: 100%; padding: 12px; background: var(--surface); color: var(--ink); resize: vertical; border: 1px solid var(--line); }
button { justify-self: start; padding: 10px 16px; border: 2px solid var(--ink); background: var(--accent); color: white; }
.moderation { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 14px; padding: 12px; border-left: 4px solid var(--lego-yellow); background: var(--surface-muted); }
.moderation button { padding: 8px 11px; border-width: 1px; }
a { color: var(--accent); text-decoration: underline; }
</style>
