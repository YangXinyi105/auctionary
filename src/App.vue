<template>
  <div class="app">
    <header class="site-header">
      <router-link class="logo" to="/" :aria-label="zh ? 'Auctionary 首页' : 'Auctionary home'">
        <b aria-hidden="true"></b>
      <span>auctionary</span>
      </router-link>

      <nav :aria-label="zh ? '主导航' : 'Main navigation'">
        <router-link to="/">{{ zh ? '拍卖市场' : 'Marketplace' }}</router-link>
        <router-link to="/#sell">{{ zh ? '发布套装' : 'Sell a set' }}</router-link>
      </nav>

      <div class="header-actions">
        <button class="lang" type="button" @click="toggle">{{ zh ? 'EN' : '中文' }}</button>
        <router-link v-if="!loggedIn" class="signin" to="/login">
          {{ zh ? '登录 / 注册' : 'Sign in' }}
        </router-link>

        <div v-else class="profile">
          <router-link class="avatar-button" to="/account">
            <img :src="avatar" :alt="zh ? '账户头像' : 'Profile avatar'" />
            <span>{{ zh ? '我的账户' : 'My account' }}</span>
          </router-link>
          <button
            class="menu-toggle"
            type="button"
            :aria-label="zh ? '账户选项' : 'Account options'"
            :aria-expanded="menu"
            @click="menu = !menu"
          >
            <span aria-hidden="true">⌄</span>
          </button>

          <div v-if="menu" class="profile-menu">
            <p v-if="avatarError" class="menu-error" role="alert">{{ avatarError }}</p>
            <label class="upload">
              {{ zh ? '上传头像' : 'Upload avatar' }}
              <input type="file" accept="image/*" @change="uploadAvatar" />
            </label>
            <button type="button" @click="randomAvatar">{{ zh ? '随机积木头像' : 'Random brick avatar' }}</button>
            <button type="button" @click="logout">{{ zh ? '退出登录' : 'Sign out' }}</button>
          </div>
        </div>
      </div>
    </header>

    <router-view />

    <footer class="site-footer">
      <strong>auctionary.</strong>
      <span>{{ zh ? '乐高收藏品拍卖市场' : 'LEGO collection auctions' }}</span>
    </footer>
  </div>
</template>

<script>
import axios from 'axios';
import { uploadAvatarFile, saveAvatar } from './services/avatar';
import { apiUrl } from './services/api';

const brickAvatars = [
  apiUrl('/uploads/lego-10698.jpg'),
  apiUrl('/uploads/lego-60367.jpg'),
  apiUrl('/uploads/lego-10303.jpg')
];

function initialAvatar() {
  const stored = localStorage.getItem('avatar');
  if (stored && !stored.includes('images.pokemontcg.io')) return stored;
  return brickAvatars[Math.floor(Math.random() * brickAvatars.length)];
}

export default {
  data: () => ({
    zh: localStorage.getItem('lang') === 'zh',
    loggedIn: Boolean(localStorage.getItem('session_token')),
    avatar: initialAvatar(),
    avatarError: '',
    menu: false
  }),
  mounted() {
    window.addEventListener('auth-change', this.refresh);
    window.addEventListener('session-expired', this.refresh);
    window.addEventListener('avatar-change', this.refresh);
  },
  beforeUnmount() {
    window.removeEventListener('auth-change', this.refresh);
    window.removeEventListener('session-expired', this.refresh);
    window.removeEventListener('avatar-change', this.refresh);
  },
  methods: {
    refresh() {
      this.loggedIn = Boolean(localStorage.getItem('session_token'));
      this.avatar = localStorage.getItem('avatar') || this.avatar;
    },
    toggle() {
      this.zh = !this.zh;
      localStorage.setItem('lang', this.zh ? 'zh' : 'en');
      window.dispatchEvent(new Event('language-change'));
    },
    randomAvatar() {
      this.avatarError = '';
      this.avatar = brickAvatars[Math.floor(Math.random() * brickAvatars.length)];
      saveAvatar(this.avatar);
    },
    async uploadAvatar(event) {
      const file = event.target.files[0];
      if (!file) return;
      this.avatarError = '';
      try {
        await uploadAvatarFile(file);
        this.menu = false;
      } catch (error) {
        this.avatarError = error.message;
      } finally {
        event.target.value = '';
      }
    },
    async logout() {
      try {
        await axios.post(apiUrl('/logout'), {}, { headers: { 'X-Authorization': localStorage.getItem('session_token') }, timeout: 10000 });
      } catch (error) {
        if (error.response?.status !== 401) { this.avatarError = this.$t('Sign out failed. Please retry.', '退出失败，请重试。'); return; }
      }
      localStorage.removeItem('session_token');
      localStorage.removeItem('user_id');
      this.menu = false;
      window.dispatchEvent(new Event('auth-change'));
      this.$router.push('/login');
    }
  }
};
</script>

<style>
:root {
  color-scheme: light;
  font-family: "Segoe UI Variable", "Segoe UI", "Microsoft YaHei", Arial, sans-serif;
  font-size: 15px;
  font-synthesis: none;
  color: #17233b;
  background: #f3f5f8;
  --page: #f3f5f8;
  --surface: #ffffff;
  --surface-muted: #e9edf3;
  --ink: #17233b;
  --muted: #596579;
  --line: #cbd2dd;
  --accent: #d92d36;
  --accent-hover: #b41f2a;
  --accent-soft: #fbe9eb;
  --danger: #b4232e;
  --lego-yellow: #ffd84d;
  --lego-blue: #1769aa;
  --shadow: 0 12px 30px rgba(31, 48, 75, .11);
  --radius: 8px;
  --radius-control: 6px;
  --pixel-font: 'Segoe UI', 'Microsoft YaHei', Arial, sans-serif;
}

* {
  box-sizing: border-box;
}

html {
  scroll-behavior: smooth;
}

body {
  margin: 0;
  min-width: 320px;
  background: var(--page);
}

button,
input,
textarea,
select {
  font: inherit;
}

button,
a,
input,
select,
textarea {
  -webkit-tap-highlight-color: transparent;
}

a {
  color: inherit;
  text-decoration: none;
}

button {
  cursor: pointer;
  transition: transform 130ms ease, background-color 130ms ease, border-color 130ms ease, box-shadow 130ms ease;
}

button:active:not(:disabled),
a.primary-link:active {
  transform: translateY(1px) scale(.985);
}

button:disabled {
  cursor: wait;
  opacity: 0.62;
}

button:focus-visible,
a:focus-visible,
input:focus-visible,
textarea:focus-visible,
select:focus-visible {
  outline: 3px solid var(--accent);
  outline-offset: 3px;
}

.app {
  min-height: 100dvh;
  background: var(--page);
  color: var(--ink);
}

.site-header {
  position: sticky;
  top: 0;
  z-index: 20;
  height: 72px;
  padding-inline: max(24px, calc((100vw - 1344px) / 2));
  display: flex;
  align-items: center;
  gap: 46px;
  border-bottom: 1px solid #d7dce5;
  background: rgba(255, 255, 255, .94);
  backdrop-filter: blur(16px) saturate(140%);
  box-shadow: 0 3px 16px rgba(26, 39, 64, .05);
}

.logo {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-shrink: 0;
  font-size: 1.24rem;
  font-weight: 800;
  letter-spacing: -0.04em;
}

.logo > b {
  position: relative;
  width: 30px;
  height: 30px;
  flex: 0 0 30px;
  border: 2px solid #971923;
  border-radius: 5px;
  background: var(--accent);
  box-shadow: inset 0 2px 0 rgba(255,255,255,.28), 0 3px 0 #971923;
}

.logo > b::before,
.logo > b::after {
  content: "";
  position: absolute;
  top: 5px;
  left: 5px;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #fff8f5;
  box-shadow: 10px 0 #fff8f5;
}

.logo > b::after {
  top: auto;
  bottom: 5px;
  left: 10px;
  box-shadow: none;
}

.site-header nav {
  display: flex;
  align-items: center;
  gap: 28px;
  color: var(--muted);
  font-size: 0.88rem;
}

.site-header nav a {
  padding-block: 8px;
  border-bottom: 2px solid transparent;
}

.site-header nav a:hover,
.site-header nav a.router-link-exact-active {
  color: var(--ink);
  border-bottom-color: var(--accent);
}

.header-actions {
  margin-left: auto;
  display: flex;
  align-items: center;
  gap: 14px;
}

.lang {
  padding: 8px 10px;
  border: 0;
  border-radius: var(--radius-control);
  background: transparent;
  color: var(--muted);
  font-size: 0.82rem;
}

.lang:hover {
  background: var(--surface-muted);
  color: var(--ink);
}

.signin {
  padding: 10px 16px;
  border-radius: var(--radius-control);
  background: var(--accent);
  color: #fff8f5;
  font-size: 0.84rem;
  font-weight: 650;
  box-shadow: 0 3px 0 #971923;
}

.signin:hover {
  background: var(--accent-hover);
}

.profile {
  position: relative;
  display: flex;
  align-items: center;
}

.avatar-button {
  display: flex;
  align-items: center;
  gap: 9px;
  font-size: 0.84rem;
  font-weight: 600;
}

.avatar-button img {
  width: 32px;
  height: 32px;
  object-fit: cover;
  border: 2px solid var(--surface);
  border-radius: var(--radius-control);
  background: var(--surface-muted);
  box-shadow: 0 0 0 1px var(--line), 0 3px 8px rgba(31,48,75,.12);
}

.menu-toggle {
  width: 34px;
  height: 34px;
  border: 0;
  border-radius: var(--radius-control);
  background: transparent;
  color: var(--muted);
}

.menu-toggle:hover {
  background: var(--surface-muted);
  color: var(--ink);
}

.profile-menu {
  position: absolute;
  top: 44px;
  right: 0;
  z-index: 30;
  width: 190px;
  padding: 7px;
  border: 1px solid var(--line);
  border-radius: var(--radius);
  background: var(--surface);
  box-shadow: var(--shadow);
}

.profile-menu button,
.profile-menu .upload {
  display: block;
  width: 100%;
  padding: 11px 12px;
  border: 0;
  border-radius: 7px;
  background: transparent;
  color: var(--ink);
  text-align: left;
  font-size: 0.84rem;
  cursor: pointer;
}

.profile-menu button:hover,
.profile-menu .upload:hover {
  background: var(--surface-muted);
}

.profile-menu .upload input {
  display: none;
}

.menu-error {
  margin: 4px 6px 8px;
  color: var(--danger);
  font-size: 0.76rem;
  line-height: 1.4;
}

.site-footer {
  width: min(calc(100% - 48px), 1344px);
  margin: 72px auto 0;
  padding: 25px 0 30px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-top: 1px solid var(--line);
  color: var(--muted);
  font-size: 0.8rem;
}

.site-footer strong {
  color: var(--ink);
  font-size: 1rem;
  letter-spacing: -0.025em;
}

@media (max-width: 760px) {
  .site-header {
    height: 66px;
    padding-inline: 18px;
    gap: 12px;
  }

  .site-header nav {
    display: none;
  }

  .header-actions {
    gap: 6px;
  }

  .avatar-button span {
    display: none;
  }

  .site-footer {
    width: calc(100% - 36px);
    margin-top: 48px;
  }
}

@media (prefers-reduced-motion: reduce) {
  html {
    scroll-behavior: auto;
  }

  *,
  *::before,
  *::after {
    transition: none !important;
    animation: none !important;
  }
}
</style>
