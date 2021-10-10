<script setup lang="ts">
import { reactive, ref } from 'vue'
import { NButton, NInput } from "naive-ui"
import { io } from "socket.io-client";
import { ControlConnect, ControlEnterRoom, MessageData, TextMessage } from '../interface';
import { useInputValue } from '../lib/useInputValue';

const prop = defineProps<{
  host: string
}>()

const my_info = reactive({
  id: '0000000000',
  name: 'test_user'
})

const socket = io(prop.host, {
  transports: ['websocket']
})

socket.on("connect_error", (err) => {
  console.error(err)
});

socket.on('connect', function () {
  console.log(`链接成功 ${socket.id}`);


});


socket.on('disconnect', function () {
  console.log('离线');
});

const messages = ref<{ name: string, text: string }[]>([])
socket.on('message', function (d: MessageData) {
  switch (d.type) {
    case 'text':
      {
        const msg = d as TextMessage
        messages.value.push({
          name: msg.name,
          text: msg.data.text
        })
      }
      break;

    default:
      break;
  }
})


const input_value = ref("")
const handle_input = (newv: string) => {
  input_value.value = newv
}
const send = () => {
  //
  socket.emit("message", {
    type: 'text',
    id: my_info.id,
    name: my_info.name,
    data: {
      room: 'test_room',
      text: input_value.value
    }
  } as TextMessage)
  //input_value.value = ""
}

const _id = useInputValue("")
const _name = useInputValue("")
const _comfirm_id_name = () => {
  my_info.id = _id.value
  my_info.name = _name.value
  // 发射
  socket.emit('control', {
    action: 'connect',
    id: my_info.id,
    name: my_info.name
  } as ControlConnect);
  socket.emit('control', {
    action: 'enter_room',
    room: 'test_room',
    id: my_info.id
  } as ControlEnterRoom)
}
</script>

<template>
  <n-input :value="_id.value" :onUpdate:value="_id.onChange" placeholder="ID" />
  <n-input :value="_name.value" :onUpdate:value="_name.onChange" placeholder="NAME" />
  <n-button @click="_comfirm_id_name">OK</n-button>

  <p>Message:</p>
  <p v-for="msg in messages">{{ `[${msg.name}]: ${msg.text}` }}</p>
  <p>Input:</p>
  <n-input :value="input_value" :onUpdate:value="handle_input" />
  <n-button @click="send">ClickMe</n-button>
</template>
