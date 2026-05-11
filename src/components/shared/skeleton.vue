<template>
  <div ref="skeletonRef" class="skeleton" :class="`skeleton--${variant}`">
    <div ref="shimmerRef" class="skeleton__shimmer"></div>
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'
import gsap from 'gsap'

const props = defineProps({
  variant: {
    type: String,
    default: 'default',
  },
  duration: {
    type: Number,
    default: 4,
  },
})

const skeletonRef = ref(null)
const shimmerRef = ref(null)
let animation = null

onMounted(() => {
  if (!shimmerRef.value) return


  animation = gsap.to(shimmerRef.value, {
    xPercent: 200,
    duration: props.duration,
    ease: 'none',
    repeat: -1,
  })
})

onBeforeUnmount(() => {
  animation?.kill()
})
</script>
