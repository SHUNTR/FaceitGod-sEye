<template>
  <div class="search__container">
    <input
      v-model="query"
      @keyup.enter="doSearch"
      type="text"
      class="search__input"
      placeholder="STEAM_ID / FACEIT NICKNAME..."
      :disabled="loading"
    />
    <button
      @click="doSearch"
      :disabled="loading || !query.trim()"
      class="search__btn"
    >
      {{ loading ? "..." : "FIND" }}
    </button>
  </div>
</template>

<script setup>
import axios from "axios";
import { inject, defineEmits } from "vue";
import { searchUser } from "@api/searchUser";

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
      errorMsg.value = "Faceit not found";
    } else {
      errorMsg.value = e.message || "Error";
    }
    console.error(e);
  } finally {
    loading.value = false;
  }
}
</script>

<style></style>
