<template>
  <div class="UserFaceitInfo">
    <header class="UserFaceitInfo__header">
      <img :src="iconUrl" />
      <h2>Faceit God's Eye</h2>
    </header>
    <main class="UserFaceitInfo__body">
      <profileCard v-if="!loading && user" :profile="user" />
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

import profileCard from "@entites/profile/profileCard.vue";
import profileSkeleton from "@entites/profile/profileSkeleton.vue";

const user = ref();
const loading = ref(true);
const error = ref(false);
const iconUrl = ref("");

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
  iconUrl.value = chrome.runtime.getURL("images/icon-48x48.png");
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
    gap: 10px;
    height: 40px;
    font-size: 24px;
    padding: 8px 12px;
    background: #141414a6;
    position: relative;
   border-bottom: 1px solid var(--brd);

    &::after {
      content: "";
      position: absolute;
      bottom: -2px;
      left: 50%;
      height: 3px;
      background: var(--angles__color);
      transform: translateX(-50%);
      width: 75%;
      transition: 0.2s;
    }
    img {
      height: 32px;
    }
  }
  &__body {
    .skeleton {
      border-radius: 0px;
    }
    .profile-card {
      &__header{
        height: 50px;
      }
      padding: 12px;
      background: var(--bg);
      &__nickname {
        font-size: 24px;
      }
      &__level-label {
        font-size: 14px;
        a {
          text-decoration: underline;
        }
      }
      &__elo {
        &-value {
          font-size: 32px;
        }
        &-label {
          font-size: 16px;
        }
      }
      &__stat {
        &-lbl {
          font-size: 14px;
        }
      }
    }
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
