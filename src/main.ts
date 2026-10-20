import { createApp } from 'vue';
import App from './App.vue';
import './styles/index.css';
import { pinia } from './stores';
import { router } from './router';
import { onUnauthorized } from './api/client';
import { useAuthStore } from './stores/auth';

const app = createApp(App);
app.use(pinia);
onUnauthorized(() => {
  useAuthStore(pinia).clear();
  void router.replace({ name: 'login', query: { redirect: router.currentRoute.value.fullPath } });
});
app.use(router);
app.mount('#app');
