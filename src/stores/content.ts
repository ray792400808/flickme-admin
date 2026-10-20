import { defineStore } from 'pinia';
import { ref } from 'vue';
import { dramaSeeds, characterSeeds } from '../mocks/content';
export const useContentStore = defineStore('content', () => {
  const dramas = ref(structuredClone(dramaSeeds));
  const characters = ref(structuredClone(characterSeeds));
  function reset() {
    dramas.value = structuredClone(dramaSeeds);
    characters.value = structuredClone(characterSeeds);
  }
  return { dramas, characters, reset };
});
