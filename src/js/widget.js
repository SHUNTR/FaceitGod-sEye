import { createApp } from "vue";
import widget from "@widgets/userFaceitInfo.vue";
import { WIDGET_ID } from "@constants";

let appInstance = null;

function mountWidget() {
  if (document.getElementById(WIDGET_ID)) return;

  const container = document.createElement("div");
  container.id = WIDGET_ID;
  container.className = "faceit-gods-eye-widget";
  const pageContainer = document.body.querySelector(".profile_leftcol")
  if(!pageContainer) return
  pageContainer.prepend(container);

  appInstance = createApp(widget);
  appInstance.mount(container);
}

const observer = new MutationObserver(() => {
  if (!document.getElementById(WIDGET_ID)) mountWidget();
});
observer.observe(document.body, { childList: true, subtree: true });

mountWidget();
