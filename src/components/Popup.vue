<template>

  <div class="wrapper">

    <div class="wrapper__head">
      <input type="text" class="wrapper__input" placeholder="STEAM LINK">
    </div>

  </div>

</template>

<script setup>
import { ref, onMounted } from 'vue';

const active = ref(true);
const list = ref("example.com");

const icons = {
  active: "images/icon-48x48.png",
  inactive: "images/icon-48x48-off.png"
};
onMounted(() => {
  chrome.runtime.sendMessage({ action: "getState" }, (response) => {
    if (response) {
      active.value = response.active;
      list.value = response.list;
    }
  });
});

const setActive = (val) => {
  active.value = val;
  chrome.runtime.sendMessage({ 
    action: "setActive", 
    active: val,
    icon: icons[val ? "active" : "inactive"]
  });
  chrome.storage.sync.set({ toggleSitesActive: val });
};

const saveList = () => {
  chrome.storage.sync.set({ toggleSitesList: list.value });
};
</script>
