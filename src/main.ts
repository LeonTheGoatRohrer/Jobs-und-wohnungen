import { createApp } from 'vue'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import App from './App.vue'
import './styles/main.css'

createApp(App).component('FontAwesomeIcon', FontAwesomeIcon).mount('#app')
