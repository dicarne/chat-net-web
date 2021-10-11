<script lang="ts" setup>
import { onUnmounted } from "vue";
import ChatApp from "./components/ChatApp.vue"
import { useChat } from "./lib/useChat";
const ws = useChat()
onUnmounted(() => ws.dispose())
</script>

<template>
    <ChatApp />
</template>