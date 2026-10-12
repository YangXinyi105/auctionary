<template>
  <main class="profile-page">
    <router-link to="/">← {{ $t('Back to auctions', '返回拍卖市场') }}</router-link>
    <p v-if="loading" role="status">{{ $t('Loading profile...', '正在加载主页…') }}</p>
    <p v-else-if="error" role="alert">{{ error }} <button @click="load">{{ $t('Retry', '重试') }}</button></p>
    <template v-else>
      <h1>{{ profile.first_name }} {{ profile.last_name }}</h1>
      <section v-for="group in groups" :key="group.key">
        <h2>{{ $t(group.title, group.zh) }}</h2>
        <p v-if="!profile[group.key]?.length">{{ $t('No auctions to show.', '暂无可显示的拍卖。') }}</p>
        <div class="grid"><ItemCard v-for="item in profile[group.key]" :key="item.item_id" :item="item" /></div>
      </section>
    </template>
  </main>
</template>
<script>
import axios from 'axios';
import ItemCard from '../../components/ItemCard.vue';
export default {
  components: { ItemCard },
  data: () => ({ loading: true, error: '', profile: {}, groups: [{ key: 'selling', title: 'Selling', zh: '正在出售' }, { key: 'bidding_on', title: 'Bidding on', zh: '参与竞价' }, { key: 'auctions_ended', title: 'Ended auctions', zh: '已结束拍卖' }] }),
  mounted() { this.load(); },
  watch: { '$route.params.id'() { this.load(); } },
  methods: { async load() {
    this.loading = true; this.error = '';
    try { this.profile = (await axios.get(`http://localhost:3334/users/${this.$route.params.id}`, { timeout: 10000 })).data; }
    catch (error) { this.error = error.response?.status === 404 ? this.$t('User not found.', '未找到该用户。') : this.$t('Could not load profile.', '无法加载个人主页。'); }
    finally { this.loading = false; }
  } }
};
</script>
<style scoped>
.profile-page { max-width: 1180px; width: calc(100% - 40px); margin: 40px auto; min-height: 65vh; }
section { margin: 36px 0; } .grid { display: grid; grid-template-columns: repeat(5,minmax(0,1fr)); gap: 24px; }
@media(max-width: 800px) { .grid { grid-template-columns: repeat(2,minmax(0,1fr)); } }
</style>
