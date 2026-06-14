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
import { ref , onMounted} from "vue";
import { searchUser } from '@api/searchUser';

import profileCard from '@entites/profile/profileCard.vue';
import profileSkeleton from '@entites/profile/profileSkeleton.vue'

const user = ref()
const loading = ref(true);
const error = ref(false);
const iconUrl = ref('');

const getUser = async ()=>{
  loading.value = true
  try{
    const profile = await searchUser(window.location.href,true)
    loading.value = false;
    user.value = profile
  }
  catch(e){
    console.log(e)
    error.value = true,
    user.value = null
    loading.value = false
  }
}

onMounted(() => {
  loading.value = true
  iconUrl.value = chrome.runtime.getURL('images/icon-48x48.png');
  getUser()
});
</script>

<style lang="scss" scoped>
.UserFaceitInfo{
  margin: 20px 0px;

    &__header{
      display: flex;
      align-items: center;
      gap: 10px;
      height: 40px;
      font-size: 24px;
      padding: 8px 12px;
      background: rgba(30, 30, 30, 0.356);
      border-top-left-radius: 20px;
      border-top-right-radius: 20px;

      img{
        height: 32px;
      }
  }
  &__body{
    .skeleton{
      border-radius: 0px 0px 20px 20px;
    }
    .profile-card{
      border-top-left-radius: 0px;
      border-top-right-radius: 0px;
    }
  }
  &--empty{
      display: flex;
      align-items: center;
      height: 80px;
      justify-content: center;
      font-weight: bold;
      font-size: 24px;
      background: rgba(30, 30, 30, 0.356);
      border-bottom-left-radius: 20px;
      border-bottom-right-radius: 20px;
  }

}
</style>
