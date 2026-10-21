import { createApp } from 'vue';
import ElementPlus from 'element-plus';
import zhCn from 'element-plus/es/locale/lang/zh-cn';
import * as ElementPlusIconsVue from '@element-plus/icons-vue';
import 'element-plus/dist/index.css';

import App from './App.vue';
import './styles/index.css';
import { pinia } from './stores';
import { router } from './router';
import { onUnauthorized } from './api/client';
import { useAuthStore } from './stores/auth';
import { vPerm } from './directives/perm';

const app = createApp(App);

app.use(pinia);
app.use(ElementPlus, { locale: zhCn });

// 全局注册 Element Plus 图标，供菜单 icon 字段动态渲染
for (const [name, component] of Object.entries(ElementPlusIconsVue)) {
  app.component(name, component);
}

app.directive('perm', vPerm);

onUnauthorized(() => {
  useAuthStore(pinia).clear();
  void router.replace({ name: 'login' });
});

app.use(router);
app.mount('#app');
