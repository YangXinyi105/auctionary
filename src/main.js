import { createApp, reactive } from 'vue'
import App from './App.vue'

import router from './router'
import './assets/lego-theme.css'

const locale = reactive({ zh: localStorage.getItem('lang') === 'zh' })
window.addEventListener('language-change', () => { locale.zh = localStorage.getItem('lang') === 'zh' })
const app = createApp(App)
app.config.globalProperties.$t = (english, chinese) => locale.zh ? chinese : english
app.config.globalProperties.$isZh = locale
app.use(router).mount('#app')
