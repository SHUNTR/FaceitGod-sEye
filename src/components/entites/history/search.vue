<template>
  <div class="search__container">
    <input
      v-model="query"
      @keyup.enter="doSearch"
      type="text"
      class="search__input"
      :placeholder="t('searchInput')"
      :disabled="loading"
    />
    <button
      @click="doSearch"
      :disabled="loading || !query.trim()"
      class="search__btn"
    >
      {{ loading ? t('loading') : t('findBtn') }}
    </button>
  </div>
</template>

<script setup>
import axios from "axios";
import { inject, defineEmits } from "vue";
import { searchUser } from "@api/searchUser";
import { t } from "@/utils/i18n";

const emit = defineEmits(["profile-found"]);
const loading = inject("loading");
const errorMsg = inject("errorMsg");
const query = inject("query");
const addToHistory = inject("addToHistory");

async function doSearch(text) {
  if (!query.value.trim()) return;
  loading.value = true;
  errorMsg.value = null;

  try {
    const p = await searchUser(query.value.trim(), true);
    
    emit("profile-found", p);
    addToHistory(p);
  } catch (e) {
    if (e.status == 404) {
      errorMsg.value = t('profileNotFound');
    } else {
      errorMsg.value = e.message || t('searchError');
    }
    console.error(e);
  } finally {
    loading.value = false;
  }
}
</script>

<style></style>
