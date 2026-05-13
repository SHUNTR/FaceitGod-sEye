<template>
  <div class="shutter">
    <div ref="shTop" class="shutter__line shutter__line--top">
      <div class="shutter__text">INITIATING PHASE SHIFT</div>
    </div>

    <div ref="shContent" class="shutter__content">
      <slot></slot>
    </div>
    <div ref="shBottom" class="shutter__line shutter__line--bottom">
      <div class="shutter__text">CALIBRATING VISUAL_HUD</div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import gsap from 'gsap';

const shTop = ref(null);
const shBottom = ref(null);
const shContent = ref(null);

const playShatter = (changeThemeFn) => {
  const tl = gsap.timeline();

  tl.fromTo(shContent.value,
    { scale: 1, opacity: 1 },
    { scale: 0.8, opacity: 0, duration: 0.4 },
  ).to([shTop.value, shBottom.value], {
    y: "0%",
    duration: 0.4,
    ease: "expo.inOut"
  }, "-=0.4")
  .call(() => {
    if (changeThemeFn) changeThemeFn();
  })
  .to(shTop.value, {
    y: "-100%",
    duration: 0.5,
    ease: "expo.inOut"
  }, "+=0.1")
  .to(shBottom.value, {
    y: "100%",
    duration: 0.5,
    ease: "expo.inOut"
  }, "-=0.5")
  .fromTo(shContent.value,
    { scale: 0.95, opacity: 0 },
    { scale: 1, opacity: 1, duration: 0.4 },
    "-=0.3"
  );
};

const fromClosedShutter = (changeThemeFn) => {
  const tl = gsap.timeline();
  tl.fromTo(shTop.value,
    { y: "0%" },
    {
      y: "-100%",
      duration: 0.5,
      ease: "expo.inOut"
    },
    "+=0.1"
  )
  .fromTo(shBottom.value,
    { y: "0%" },
    {
      y: "100%",
      duration: 0.5,
      ease: "expo.inOut"
    },
    "<"
  )
  .fromTo(shContent.value,
    { scale: 0.95, opacity: 0 },
    {
      scale: 1,
      opacity: 1,
      duration: 0.4,
      clearProps: "all"
    },
    "-=0.2"
  );
};
defineExpose({ playShatter,fromClosedShutter });
</script>
