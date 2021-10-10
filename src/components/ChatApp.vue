<script setup lang="ts">
import { reactive, ref } from 'vue'
import { NButton, NInput, useMessage } from "naive-ui"
import { io } from "socket.io-client";
import { ControlConnect, ControlData, ControlEnterRoom, MessageData, TextMessage } from '../interface';
import { useInputValue } from '../lib/useInputValue';

const message = useMessage()
const prop = defineProps<{
  host: string
}>()

const my_info = reactive({
  id: '',
  name: '',
  room: ''
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
  login_success.value = false
});

const messages = ref<{ name: string, text: string, time: Date }[]>([])
socket.on('message', function (d: MessageData) {
  switch (d.type) {
    case 'text':
      {
        const msg = d as TextMessage
        messages.value.push({
          name: msg.name,
          text: msg.data.text,
          time: new Date(msg.time)
        })
      }
      break;
    default:
      break;
  }
})

const login_success = ref(false)
socket.on('control', (d: ControlData) => {
  switch (d.action) {
    case 'login_success':
      {
        message.success("登陆成功")
        login_success.value = true
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
      room: my_info.room,
      text: input_value.value
    }
  } as TextMessage)
  input_value.value = ""
}

const _id = useInputValue("")
const _name = useInputValue("")
const _room = useInputValue("")
const _comfirm_id_name = () => {
  my_info.id = _id.value
  my_info.name = _name.value
  my_info.room = _room.value
  // 发射
  socket.emit('control', {
    action: 'connect',
    id: my_info.id,
    name: my_info.name
  } as ControlConnect);
  socket.emit('control', {
    action: 'enter_room',
    room: _room.value,
    id: my_info.id
  } as ControlEnterRoom)
}
</script>

<template>
  <n-input
    :value="_id.value"
    :onUpdate:value="_id.onChange"
    placeholder="ID"
    :disabled="login_success"
  />
  <n-input
    :value="_name.value"
    :onUpdate:value="_name.onChange"
    placeholder="NAME"
    :disabled="login_success"
  />
  <n-input
    :value="_room.value"
    :onUpdate:value="_room.onChange"
    placeholder="ROOM"
    :disabled="login_success"
  />
  <n-button @click="_comfirm_id_name" :disabled="login_success">OK</n-button>

  <p>消息:</p>
  <p v-for="msg in messages">{{ `[${msg.time.toTimeString()}] [${msg.name}]: ${msg.text}` }}</p>
  <p>输入:</p>
  <n-input :value="input_value" :onUpdate:value="handle_input" />
  <n-button @click="send" :disabled="!login_success">发送</n-button>
</template>
