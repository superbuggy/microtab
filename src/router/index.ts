import { createRouter, createWebHashHistory } from "vue-router";
import TabSheet from "@/views/TabSheet.vue";
import WoodShed from "@/views/WoodShed.vue";

const router = createRouter({
  history: createWebHashHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: "/tab",
      name: "tab",
      component: TabSheet,
    },
    {
      path: "/",
      name: "shed",
      component: WoodShed,
    },
  ],
});

export default router;
