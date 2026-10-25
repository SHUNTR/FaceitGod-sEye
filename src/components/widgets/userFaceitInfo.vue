<template>
  <div class="UserFaceitInfo">
    <header class="UserFaceitInfo__header">
      <h2>FACEIT <span>GOD'S EYE</span></h2>
    </header>
    <main class="UserFaceitInfo__body">
      <widgetProfileCard v-if="!loading && user" :profile="user" />
      <template v-else-if="!loading && !user && error">
        <div class="UserFaceitInfo--empty">
          <h3>{{ t('faceitNotFound') }}</h3>
        </div>
      </template>
      <profileSkeleton v-else-if="loading" />
    </main>
  </div>
</template>

<script setup>
import { ref, onMounted } from "vue";
import { searchUser } from "@api/searchUser";

import widgetProfileCard from "@entites/profile/widgetProfileCard.vue";
import profileSkeleton from "@entites/profile/profileSkeleton.vue";
import { t } from "@/utils/i18n";

const user = ref();
const loading = ref(true);
const error = ref(false);
const getUser = async () => {
  loading.value = true;
  try {
    const profile = await searchUser(window.location.href, true);
    loading.value = false;
    user.value = profile;
  } catch (e) {
    console.log(e);
    ((error.value = true), (user.value = null));
    loading.value = false;
  }
};

onMounted(() => {
  loading.value = true;
  getUser();
});
</script>

<style lang="scss" src="../../sass/widgets/user-faceit-info.scss"></style>
