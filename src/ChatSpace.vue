<script lang="ts" setup>
import { ref } from "vue";
import { NInput, NButton } from "naive-ui"
import ChatApp from "./components/ChatApp.vue"
const host_server = ref(window.localStorage.getItem("host"))
const _host = ref("")
const onInputHost = (a: any) => {
    _host.value = a
}
const comfirm = () => {
    window.localStorage.setItem("host", _host.value)
    host_server.value = _host.value
}
</script>

<template>
    <div v-if="host_server == null">
        <NInput :value="_host" :onUpdate:value="onInputHost"></NInput>
        <NButton @click="comfirm">确认</NButton>
    </div>
    <ChatApp v-if="host_server != null" :host="host_server" />
</template>