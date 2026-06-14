<template>
  <div v-if="profile" class="view-section">
    <button @click="backToSearch" class="view-section__back-link">
      [ BACK_TO_SEARCH ]
    </button>
    <profileCard :profile="profile" />
  </div>
</template>

<script setup>
import { defineEmits,inject,computed } from 'vue';
import profileCard from '@entites/profile/profileCard.vue';


const emit = defineEmits(['change-tab'])
const profile = inject('profile')
const errorMsg = inject('errorMsg')


function backToSearch() {
    emit('change-tab','history');
  profile.value = null;
  errorMsg.value = null;
}
</script>
