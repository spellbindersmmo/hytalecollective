import './app.css'
import { mount } from 'svelte'
import { inject } from '@vercel/analytics'
import App from './App.svelte'

// Initialize Vercel Analytics
inject()

const app = mount(App, {
  target: document.getElementById('app'),
})

export default app
