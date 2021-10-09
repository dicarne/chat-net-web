<script setup lang="ts">
import { ref } from 'vue'
// ES6 import or TypeScript
import { io } from "socket.io-client";
const socket = io("http://127.0.0.1:8882", {
  transports: ['websocket']
})

socket.on("connect_error", (err) => {
  console.error(err)
});

const click = () => {
  socket.emit("message", { type: "text", payload: 'Hello world' })
}

socket.on('connect', function () {
  console.log(`链接成功 ${socket.id}`);

  // 发射
  socket.emit('control', {
    type: 'e',
    payload: 'control',

  });
});


socket.on('disconnect', function () {
  console.log('离线');
});

socket.on('message', function (d) {
  console.log(d)
})

defineProps<{ msg: string }>()

</script>

<template>
  <h1>{{ msg }}</h1>

  <p>
    Recommended IDE setup:
    <a href="https://code.visualstudio.com/" target="_blank">VSCode</a>
    +
    <a href="https://github.com/johnsoncodehk/volar" target="_blank">Volar</a>
  </p>

  <p>
    See
    <code>README.md</code> for more information.
  </p>

  <p>
    <a href="https://vitejs.dev/guide/features.html" target="_blank">Vite Docs</a>
    |
    <a href="https://v3.vuejs.org/" target="_blank">Vue 3 Docs</a>
  </p>

  <button type="button" @click="click()">Connect</button>
  <p>
    Edit
    <code>components/HelloWorld.vue</code> to test hot module replacement.
  </p>
</template>

<style scoped>
a {
  color: #42b983;
}

label {
  margin: 0 0.5em;
  font-weight: bold;
}

code {
  background-color: #eee;
  padding: 2px 4px;
  border-radius: 4px;
  color: #304455;
}
</style>
