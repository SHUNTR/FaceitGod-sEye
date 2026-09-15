<template>
  <div class="UserFaceitInfo">
    <header class="UserFaceitInfo__header">
      <h2>FACEIT <span>GOD'S EYE</span></h2>
    </header>
    <main class="UserFaceitInfo__body">
      <widgetProfileCard v-if="!loading && user" :profile="user" />
      <template v-else-if="!loading && !user && error">
        <div class="UserFaceitInfo--empty">
          <h3>Faceit not found</h3>
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

<style lang="scss">
.UserFaceitInfo {
  margin: 20px 0px;
  font-family: var(--fge-font-family);

  position: relative;
  &::after,
  &::before {
    content: "";
    position: absolute;
    aspect-ratio: 1 / 1;
    height: 24px;
    border: 2px solid var(--angles__color);
  }
  &::after {
    top: 0px;
    left: 0;
    border-bottom: none;
    border-right: none;
  }
  &::before {
    bottom: 0px;
    right: 0;
    border-top: none;
    border-left: none;
  }

  &__header {
    display: flex;
    align-items: center;
    height: 40px;
    padding: 0 20px;
    background: #111111;
    border-bottom: 1px solid #222;

    h2 {
      font-size: 14px;
      font-weight: 800;
      color: #fff;
      margin: 0;
      letter-spacing: 1px;
      span {
        color: var(--red);
      }
    }
  }
  &__body {
    .skeleton {
      border-radius: 0px;
    }
    background: var(--bg);
  }
  &--empty {
    display: flex;
    align-items: center;
    height: 80px;
    justify-content: center;
    font-weight: bold;
    font-size: 24px;
    background: var(--bg);

    .UserFaceitInfo__header {
      &::after {
        width: 0;
      }
    }
  }
}
</style>
