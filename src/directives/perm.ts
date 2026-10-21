import type { Directive, DirectiveBinding } from 'vue';
import { useAuthStore } from '../stores/auth';
import { pinia } from '../stores';

/**
 * v-perm="'user.create'"
 * 无权限时隐藏元素本身（display: none）
 */
export const vPerm: Directive = {
  mounted(el: HTMLElement, binding: DirectiveBinding<string | string[]>) {
    const auth = useAuthStore(pinia);
    const codes = Array.isArray(binding.value) ? binding.value : [binding.value];

    function check() {
      const allowed = codes.every((code) => auth.can(code));
      el.style.display = allowed ? '' : 'none';
    }

    check();

    // 登录后 / 权限变更时重新检查（用轮询，因为 watch 跨 store 复杂）
    let prev = auth.user;
    const interval = setInterval(() => {
      if (auth.user !== prev) {
        prev = auth.user;
        check();
      }
    }, 300);
    (el as HTMLElement & { _permCleanup?: () => void })._permCleanup = () => clearInterval(interval);
  },
};
