<template>
  <div class="lvl-badge" :class="'lvl-' + props.level">
    <svg class="badge__icon">
      <circle class="path" cx="25" cy="25" r="20" fill="none"></circle>
      <circle class="progress" cx="25" cy="25" r="20" fill="none"></circle>

      <text x="24" y="25" text-anchor="middle" dominant-baseline="middle">
        {{ displayLevel() }}
      </text>
    </svg>
  </div>
</template>

<script setup>
const props = defineProps({level:{
  type:Number|String,
  required:true,
  default:"uknown"
}})

const displayLevel = ()=>{
  return props.level == "uknown"?`?`:props.level
}
</script>