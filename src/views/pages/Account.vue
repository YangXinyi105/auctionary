<template>
  <main class="account">
    <router-link class="back" to="/">← {{ $t('Back to auctions', '返回拍卖市场') }}</router-link>

    <section class="panel" aria-labelledby="account-title">
      <header>
        <h1 id="account-title">{{ $t('My account', '我的账户') }}</h1>
        <p>{{ $t('Manage your profile photo and account password.', '管理头像和账户密码。') }}</p>
      </header>

      <GooLoader v-if="loading" label="Loading account..." />
      <div v-else-if="error" class="notice" role="alert">
        <p>{{ error }}</p>
        <router-link v-if="unauthorized" class="primary-button" to="/login">{{ $t('Sign in', '登录') }}</router-link>
        <button v-else class="secondary-button" type="button" @click="loadAccount">{{ $t('Retry', '重试') }}</button>
      </div>

      <template v-else>
        <div class="profile-summary">
          <div class="avatar">
            <img v-if="avatar" :src="avatar" alt="Profile avatar" />
            <span v-else aria-hidden="true">+</span>
          </div>
          <div class="identity">
            <strong>{{ user.first_name }} {{ user.last_name }}</strong>
            <span>{{ $t('Collector account', '收藏者账户') }}</span>
          </div>
          <div class="avatar-actions">
            <button
              type="button"
              class="secondary-button"
              :disabled="avatarBusy"
              @click="$refs.avatarFile.click()"
            >
              {{ avatarBusy ? $t('Uploading...', '上传中…') : $t('Upload avatar', '上传头像') }}
            </button>
            <input
              ref="avatarFile"
              class="avatar-file"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              @change="uploadAvatar"
            />
            <small v-if="avatarMessage" role="status">{{ avatarMessage }}</small>
          </div>
        </div>

        <dl class="account-fields">
          <div>
            <dt>{{ $t('Email address', '邮箱地址') }}</dt>
            <dd>{{ user.email }}</dd>
          </div>
          <div>
            <dt>{{ $t('Password', '密码') }}</dt>
            <dd class="password-value">••••••••••••</dd>
            <small>{{ $t('Verify your current password to change it.', '输入当前密码后才能修改。') }}</small>
          </div>
        </dl>
        <SetCollection :key="user.user_id" />
        <AccountAuctions :key="`auctions-${user.user_id}`" />

        <section v-if="!editing" class="password-panel verified-actions">
          <p>{{ $t('You can change your password here.', '你可以在这里修改密码。') }}</p>
          <div>
            <button class="primary-button" type="button" @click="editing = true; message = ''">{{ $t('Change password', '修改密码') }}</button>
          </div>
        </section>

        <section v-else class="password-panel" aria-labelledby="change-title">
          <h2 id="change-title">{{ $t('Change password', '修改密码') }}</h2>
          <form @submit.prevent="changePassword">
            <label><span>{{ $t('Current password', '当前密码') }}</span><input v-model="currentPassword" type="password" autocomplete="current-password" required /></label>
            <label>
              <span>{{ $t('New password', '新密码') }}</span>
              <input v-model="newPassword" type="password" autocomplete="new-password" minlength="8" required />
            </label>
            <label>
              <span>{{ $t('Confirm new password', '确认新密码') }}</span>
              <input v-model="confirmPassword" type="password" autocomplete="new-password" minlength="8" required />
            </label>
            <div class="form-actions">
              <button class="primary-button" type="submit">{{ $t('Update password', '更新密码') }}</button>
              <button
                class="secondary-button"
                type="button"
                @click="hidePassword"
              >
                {{ $t('Cancel', '取消') }}
              </button>
            </div>
          </form>
        </section>

        <p v-if="message" class="message" role="status">{{ message }}</p>
      </template>
    </section>
  </main>
</template>

<script>
import axios from 'axios';
import SetCollection from '../../components/SetCollection.vue';
import AccountAuctions from '../../components/AccountAuctions.vue';
import GooLoader from '../../components/GooLoader.vue';
import { uploadAvatarFile } from '../../services/avatar';

const API = 'http://localhost:3334';

export default {
  name: 'Account',
  components: { SetCollection, AccountAuctions, GooLoader },
  data: () => ({
    avatarBusy: false,
    avatarMessage: '',
    user: {},
    avatar: localStorage.getItem('avatar') || '',
    loading: true,
    error: '',
    unauthorized: false,
    currentPassword: '',
    editing: false,
    newPassword: '',
    confirmPassword: '',
    message: ''
  }),
  mounted() {
    this.loadAccount();
    window.addEventListener('auth-change', this.loadAccount);
    window.addEventListener('avatar-change', this.refreshAvatar);
  },
  beforeUnmount() {
    window.removeEventListener('auth-change', this.loadAccount);
    window.removeEventListener('avatar-change', this.refreshAvatar);
  },
  methods: {
    refreshAvatar() {
      this.avatar = localStorage.getItem('avatar') || '';
    },
    async uploadAvatar(event) {
      const file = event.target.files?.[0];
      if (!file) return;
      this.avatarBusy = true;
      this.avatarMessage = '';
      try {
        await uploadAvatarFile(file);
        this.avatarMessage = this.$t('Avatar updated.', '头像已更新。');
      } catch (error) {
        this.avatarMessage = error.message || this.$t('Upload failed. Please try again.', '上传失败，请重试。');
      } finally {
        this.avatarBusy = false;
        event.target.value = '';
      }
    },
    options() {
      return {
        headers: { 'X-Authorization': localStorage.getItem('session_token') },
        timeout: 10000
      };
    },
    async loadAccount() {
      this.loading = true;
      this.error = '';
      this.unauthorized = false;
      this.hidePassword();
      if (!localStorage.getItem('session_token')) {
        this.unauthorized = true;
        this.error = this.$t('Please sign in to view your account.', '请登录后查看账户。');
        this.loading = false;
        return;
      }
      try {
        const { data } = await axios.get(`${API}/users/me`, this.options());
        this.user = data;
      } catch (error) {
        const status = error.response?.status;
        if (status === 401) {
          this.unauthorized = true;
          this.error = this.$t('Your session has expired. Please sign in again.', '登录状态已过期，请重新登录。');
          localStorage.removeItem('session_token');
          window.dispatchEvent(new Event('session-expired'));
        } else if (status === 404) {
          this.error = this.$t('The running backend is out of date. Restart the backend, then retry.', '当前后端版本过旧，请重启后端后重试。');
        } else if (status >= 500) {
          this.error = this.$t('The server could not load your account. Please retry.', '服务器无法加载账户，请重试。');
        } else {
          this.error = this.$t('Cannot reach the account service. Check that the backend is running, then retry.', '无法连接账户服务，请确认后端已启动后重试。');
        }
      } finally {
        this.loading = false;
      }
    },
    hidePassword() {
      this.currentPassword = '';
      this.editing = false;
      this.newPassword = '';
      this.confirmPassword = '';
      this.message = '';
    },
    async changePassword() {
      this.message = '';
      if (this.newPassword !== this.confirmPassword) {
        this.message = this.$t('The passwords do not match.', '两次输入的密码不一致。');
        return;
      }
      try {
        await axios.put(
          `${API}/users/password`,
          { current_password: this.currentPassword, password: this.newPassword },
          this.options()
        );
        this.message = this.$t('Password updated. Please sign in again.', '密码已更新，请重新登录。');
        localStorage.removeItem('session_token');
        localStorage.removeItem('user_id');
        window.dispatchEvent(new Event('auth-change'));
        this.$router.push('/login?passwordChanged=1');
        this.newPassword = '';
        this.confirmPassword = '';
        this.currentPassword = '';
        this.editing = false;
      } catch (error) {
        this.message = error.response?.data?.error_message || this.$t('Password could not be updated.', '无法更新密码。');
      }
    }
  }
};
</script>

<style scoped>
.account {
  width: min(calc(100% - 40px), 860px);
  min-height: calc(100dvh - 170px);
  margin: 0 auto;
  padding: 42px 0 72px;
}

.back {
  color: var(--muted);
  font-size: 0.84rem;
}

.back:hover {
  color: var(--accent);
}

.panel {
  margin-top: 24px;
  padding: 38px;
  border: 1px solid var(--line);
  border-radius: var(--radius);
  background: var(--surface);
  box-shadow: var(--shadow);
}

header {
  margin-bottom: 30px;
}

h1 {
  margin: 0;
  font-family: "Aptos Display", "Segoe UI Variable Display", "Segoe UI", sans-serif;
  font-size: clamp(2.25rem, 6vw, 3.25rem);
  line-height: 1;
  letter-spacing: -0.055em;
}

header p,
.password-panel > p {
  margin: 13px 0 0;
  color: var(--muted);
  line-height: 1.55;
}

.profile-summary {
  padding: 20px 0 28px;
  display: grid;
  grid-template-columns: 64px minmax(0, 1fr) auto;
  gap: 16px;
  align-items: center;
  border-bottom: 1px solid var(--line);
}

.avatar {
  width: 64px;
  height: 64px;
  display: grid;
  place-items: center;
  overflow: hidden;
  border: 1px solid var(--line);
  border-radius: var(--radius);
  background: var(--surface-muted);
  color: var(--muted);
}

.avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.identity {
  min-width: 0;
  display: grid;
  gap: 5px;
}

.identity strong {
  overflow-wrap: anywhere;
  font-size: 1.06rem;
}

.identity span,
.avatar-actions small {
  color: var(--muted);
  font-size: 0.8rem;
}

.avatar-actions {
  display: grid;
  justify-items: end;
  gap: 7px;
}

.avatar-file {
  display: none;
}

.account-fields {
  margin: 0;
  padding: 8px 0;
}

.account-fields > div {
  padding: 19px 0;
  display: grid;
  grid-template-columns: 170px minmax(0, 1fr);
  gap: 5px 18px;
  border-bottom: 1px solid var(--line);
}

.account-fields dt {
  color: var(--muted);
  font-size: 0.82rem;
}

.account-fields dd {
  margin: 0;
  overflow-wrap: anywhere;
  font-weight: 650;
}

.account-fields small {
  grid-column: 2;
  color: var(--muted);
  font-size: 0.76rem;
}

.password-value {
  letter-spacing: 0.04em;
}

.password-panel {
  margin-top: 28px;
  padding: 22px;
  border-radius: var(--radius);
  background: var(--surface-muted);
}

.password-panel h2 {
  margin: 0;
  font-size: 1.12rem;
}

.password-panel form {
  margin-top: 18px;
  display: grid;
  gap: 13px;
}

.password-panel label {
  display: grid;
  gap: 7px;
  font-size: 0.82rem;
  font-weight: 650;
}

.password-panel input {
  width: 100%;
  padding: 12px 13px;
  border: 1px solid var(--line);
  border-radius: var(--radius-control);
  background: var(--surface);
  color: var(--ink);
}

.primary-button,
.secondary-button {
  width: fit-content;
  padding: 10px 15px;
  border-radius: var(--radius-control);
  font-size: 0.84rem;
  font-weight: 680;
}

.primary-button {
  border: 1px solid var(--accent);
  background: var(--accent);
  color: #fff8f5;
}

.primary-button:hover {
  border-color: var(--accent-hover);
  background: var(--accent-hover);
}

.secondary-button {
  border: 1px solid var(--line);
  background: var(--surface);
  color: var(--ink);
}

.secondary-button:hover {
  border-color: color-mix(in srgb, var(--accent) 50%, var(--line));
}

.verified-actions > div,
.form-actions {
  margin-top: 17px;
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.message {
  margin: 18px 0 0;
  color: var(--danger);
  font-size: 0.84rem;
  line-height: 1.5;
}

.notice {
  min-height: 180px;
  display: grid;
  place-content: center;
  justify-items: center;
  color: var(--muted);
  text-align: center;
}

.notice p {
  max-width: 520px;
  margin: 0 0 18px;
  line-height: 1.55;
}

@media (max-width: 620px) {
  .account {
    padding-top: 28px;
  }

  .panel {
    padding: 25px 21px;
  }

  .profile-summary {
    grid-template-columns: 56px minmax(0, 1fr);
  }

  .avatar {
    width: 56px;
    height: 56px;
  }

  .avatar-actions {
    grid-column: 1 / -1;
    justify-items: start;
  }

  .account-fields > div {
    grid-template-columns: 1fr;
  }

  .account-fields small {
    grid-column: 1;
  }
}
</style>
