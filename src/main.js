// The Vue build version to load with the `import` command
// (runtime-only or standalone) has been set in webpack.base.conf with an alias.
import Vue from 'vue'
import App from './App'
import router from './router'

import messageUI from './assets/js/message';

Vue.config.productionTip = false
Vue.prototype.$message = messageUI;

new Vue({
  el: '#app',
  router,
  components: { App },
  template: '<App/>'
})
