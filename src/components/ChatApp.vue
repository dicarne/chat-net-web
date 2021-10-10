<script setup lang="ts">
import { onMounted, onUnmounted, reactive, ref, unref } from 'vue'
import { NButton, NInput, useMessage } from "naive-ui"
import { io, Socket } from "socket.io-client";
import localForage from "localforage"
import { ControlConnect, ControlData, ControlEnterRoom, ControlExitRoom, MessageData, TextMessage } from '../interface';
import { useInputValue } from '../lib/useInputValue';

const message = useMessage()

const room_storage = localForage.createInstance({ name: 'rooms' })
const user_storage = localForage.createInstance({ name: 'users' })
const message_storage = localForage.createInstance({ name: 'messages' })

const my_info = reactive({
  id: '',
  name: ''
})

const room = reactive({
  id: '',
  name: '',
  host: ''
})

const socket = ref<Socket | null>(null)
const messages = ref<{ name: string, text: string, time: Date }[]>([])
const login_success = ref(false)

const PrepareSocket = () => {
  if (socket.value) {

    socket.value.on("connect_error", (err) => {
      console.error(err)
    });

    socket.value.on('connect', function () {
      console.log(`链接成功 ${socket.value!.id}`);
    });


    socket.value.on('disconnect', function () {
      console.log('离线');
      login_success.value = false
    });

    socket.value.on('message', async (d: MessageData) => {
      switch (d.type) {
        case 'text':
          {
            const msg = d as TextMessage
            messages.value.push({
              name: msg.name,
              text: msg.data.text,
              time: new Date(msg.time)
            })
            await message_storage.setItem(new Date().getTime().toString(), {
              room: msg.data.room,
              text: msg.data.text,
              type: 'text',
              uid: my_info.id,
              time: msg.time,
              name: msg.name,
              sender: msg.id
            })
          }
          break;
        default:
          break;
      }
    })

    socket.value.on('control', async (d: ControlData) => {
      switch (d.action) {
        case 'login_success':
          {
            message.success("登陆成功")
            login_success.value = true
          }
          break;
        case 'enter_room': {
          const rr = d as ControlEnterRoom
          if (rr.id === my_info.id) {
            room.id = rr.room
            room.name = rr.room_name!
            await room_storage.setItem(rr.room + "&&" + my_info.id, { uid: my_info.id, ...unref(room) })
            await localForage.setItem('current_roomd', rr.room)
          } else {
            messages.value.push({
              name: rr.name!,
              text: `进入房间`,
              time: new Date()
            })
          }
        } break;
        case 'exit_room': {
          const rr = d as ControlExitRoom
          if (rr.id === my_info.id) {
            room.id = ''
            room.name = ''
          } else {
            messages.value.push({
              name: rr.name!,
              text: `离开房间`,
              time: new Date()
            })
          }
        } break;
        default:
          break;
      }
    })
  }
}


const input_value = ref("")
const handle_input = (newv: string) => {
  input_value.value = newv
}
const send = () => {
  //
  socket.value!.emit("message", {
    type: 'text',
    id: my_info.id,
    name: my_info.name,
    data: {
      room: room.id,
      text: input_value.value
    }
  } as TextMessage)
  input_value.value = ""
}

const _host = useInputValue(room.host)
const _id = useInputValue(my_info.id)
const _name = useInputValue(my_info.name)
const _room = useInputValue(room.id)
onMounted(async () => {
  const cur_user = await localForage.getItem<string>('current_uid')
  if (cur_user) {
    const old = await user_storage.getItem<{ id: string, name: string }>(cur_user)
    if (old) {
      my_info.id = old.id
      my_info.name = old.name
      _host.value = room.host
      _id.value = my_info.id
      _name.value = my_info.name
      _room.value = room.id
    }
  }
  const cur_room = await localForage.getItem<string>('current_roomd')
  if (cur_room) {
    const r = await room_storage.getItem<any>(cur_room + "&&" + my_info.id)
    if (r) {
      room.id = r.id
      room.name = r.name
      room.host = r.host
      _host.value = room.host
      _room.value = r.id
    }
  }
})
const _comfirm_id_name = async () => {
  my_info.id = _id.value
  my_info.name = _name.value
  room.id = _room.value
  room.host = _host.value

  await localForage.setItem("current_uid", my_info.id)
  await user_storage.setItem(my_info.id, { ...unref(my_info) })

  socket.value = io(_host.value, {
    transports: ['websocket']
  })
  PrepareSocket()
  // 发射
  socket.value.emit('control', {
    action: 'connect',
    id: my_info.id,
    name: my_info.name
  } as ControlConnect);
  socket.value.emit('control', {
    action: 'enter_room',
    room: _room.value,
    id: my_info.id
  } as ControlEnterRoom)
}
onUnmounted(() => {
  if (socket.value) {
    socket.value.disconnect()
  }
})
</script>

<template>
  <n-input
    :value="_host.value"
    :onUpdate:value="_host.onChange"
    placeholder="HOST"
    :disabled="login_success"
  />
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
  <p>Room: {{ room.name === '' ? '未连接' : room.name }}</p>
  <p v-for="msg in messages">{{ `[${msg.time.toTimeString()}] [${msg.name}]: ${msg.text}` }}</p>
  <p>输入:</p>
  <n-input :value="input_value" :onUpdate:value="handle_input" />
  <n-button @click="send" :disabled="!login_success">发送</n-button>
</template>
