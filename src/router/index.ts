import { createRouter, createWebHashHistory } from "vue-router";
import TabSheet from "../views/TabSheet.vue";

const router = createRouter({
  history: createWebHashHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: "/",
      name: "home",
      component: TabSheet,
    },
  ],
});

export default router;
