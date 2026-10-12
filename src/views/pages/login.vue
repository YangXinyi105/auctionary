<template>
  <main class="auth">
    <section class="panel" aria-labelledby="auth-title">
      <header>
        <h1 id="auth-title">{{ register ? $t('Create an account', '创建账户') : $t('Sign in', '登录') }}</h1>
        <p>{{ register ? $t('Register before listing a set or placing a bid.', '注册后即可发布套装或参与竞价。') : $t('Use your collector account to continue.', '登录收藏者账户以继续。') }}</p>
      </header>

      <form @submit.prevent="submit">
        <div v-if="register" class="row">
          <label>
            <span>{{ $t('First name', '名字') }}</span>
            <input v-model="form.first_name" autocomplete="given-name" required />
          </label>
          <label>
            <span>{{ $t('Last name', '姓氏') }}</span>
            <input v-model="form.last_name" autocomplete="family-name" required />
          </label>
        </div>

        <label>
          <span>{{ $t('Email address', '邮箱地址') }}</span>
          <input v-model="form.email" type="email" autocomplete="email" required />
        </label>
        <label>
          <span>{{ $t('Password', '密码') }}</span>
          <input
            v-model="form.password"
            type="password"
            :autocomplete="register ? 'new-password' : 'current-password'"
            required
          />
        </label>

        <button class="submit" type="submit">{{ register ? $t('Create account', '创建账户') : $t('Sign in', '登录') }}</button>
        <p v-if="message" class="message" role="status">{{ message }}</p>
      </form>

      <button class="switch" type="button" @click="register = !register; message = ''">
        {{ register ? $t('Already have an account? Sign in', '已有账户？立即登录') : $t('New here? Create an account', '还没有账户？立即注册') }}
      </button>
    </section>
  </main>
</template>

<script>
import axios from 'axios';
import { apiUrl } from '../../services/api';

export default {
  data: () => ({
    register: false,
    message: '',
    form: {
      first_name: '',
      last_name: '',
      email: '',
      password: ''
    }
  }),
  mounted() {
    if (this.$route.query.passwordChanged) this.message = this.$t('Password updated. Sign in with your new password.', '密码已更新，请使用新密码登录。');
  },
  methods: {
    async submit() {
      this.message = '';
      try {
        const url = apiUrl(this.register ? '/users' : '/login');
        const response = await axios.post(url, this.register ? this.form : { email: this.form.email, password: this.form.password });
        if (this.register) {
          this.message = this.$t('Account created. You can now sign in.', '账户已创建，现在可以登录。');
          this.register = false;
          this.form.password = '';
        } else {
          localStorage.setItem('session_token', response.data.session_token);
          localStorage.setItem('user_id', response.data.user_id);
          window.dispatchEvent(new Event('auth-change'));
          this.$router.push('/');
        }
      } catch (error) {
        this.message = error.response?.data?.error_message || this.$t('Please check your details and try again.', '请检查填写的信息后重试。');
      }
    }
  }
};
</script>

<style scoped>
.auth {
  width: min(calc(100% - 40px), 520px);
  min-height: calc(100dvh - 150px);
  margin: 0 auto;
  padding: 68px 0 80px;
}

.panel {
  padding: 38px;
  border: 1px solid var(--line);
  border-radius: var(--radius);
  background: var(--surface);
  box-shadow: var(--shadow);
}

header {
  margin-bottom: 28px;
}

h1 {
  margin: 0;
  font-family: "Aptos Display", "Segoe UI Variable Display", "Segoe UI", sans-serif;
  font-size: clamp(2.25rem, 7vw, 3.15rem);
  line-height: 1;
  letter-spacing: -0.055em;
}

header p {
  margin: 14px 0 0;
  color: var(--muted);
  line-height: 1.55;
}

form,
form label {
  display: grid;
}

form {
  gap: 16px;
}

form label {
  gap: 7px;
  color: var(--ink);
  font-size: 0.84rem;
  font-weight: 650;
}

.row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

input {
  width: 100%;
  padding: 12px 13px;
  border: 1px solid var(--line);
  border-radius: var(--radius-control);
  background: var(--page);
  color: var(--ink);
}

.submit {
  width: 100%;
  margin-top: 4px;
  padding: 12px 17px;
  border: 0;
  border-radius: var(--radius-control);
  background: var(--accent);
  color: #fff8f5;
  font-weight: 700;
}

.submit:hover {
  background: var(--accent-hover);
}

.message {
  margin: 0;
  color: var(--danger);
  font-size: 0.84rem;
  line-height: 1.5;
}

.switch {
  margin-top: 22px;
  padding: 0;
  border: 0;
  background: transparent;
  color: var(--muted);
  font-size: 0.84rem;
  text-align: left;
}

.switch:hover {
  color: var(--accent);
}

@media (max-width: 520px) {
  .auth {
    padding-top: 38px;
  }

  .panel {
    padding: 26px 22px;
  }

  .row {
    grid-template-columns: 1fr;
  }
}
</style>
