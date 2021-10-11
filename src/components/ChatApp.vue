<script setup lang="ts">
import { onMounted, onUnmounted, reactive, ref, unref } from 'vue'
import { NButton, NInput, useMessage } from "naive-ui"
import { Socket } from "socket.io-client";
import localForage from "localforage"
import { AES, enc } from "crypto-js"
import { ControlAskOnlineUsers, ControlConnect, ControlData, ControlEnterRoom, ControlExitRoom, ControlRespOnlineUsers, MessageData, TextMessage } from '../interface';
import { useInputValue } from '../lib/useInputValue';
import { fomateTime } from "../lib/stringHelper"
import { useChat } from '../lib/useChat';
const message = useMessage()

const room_storage = localForage.createInstance({ name: 'rooms' })
const user_storage = localForage.createInstance({ name: 'users' })
const message_storage = localForage.createInstance({ name: 'messages' })
const chat = useChat()
const my_info = reactive({
  id: '',
  name: ''
})

const room = reactive({
  id: '',
  name: '',
  host: '',
  secret: ''
})

const messages = ref<{ name: string, text: string, time: Date }[]>([])
const login_success = ref(false)
const online_count = ref(0)

chat.onDisconnect(() => {
  console.log('离线');
  login_success.value = false
  setTimeout(() => {
    chat.current()?.socket.emit('control', {
      action: 'connect',
      id: my_info.id,
      name: my_info.name,
      room: room.id
    } as ControlConnect);
    chat.current()?.socket.emit('control', {
      action: 'enter_room',
      room: room.id,
      id: my_info.id
    } as ControlEnterRoom)
  }, 1000);
})

chat.onMessage(async (d) => {
  switch (d.type) {
    case 'text':
      {
        const msg = d as TextMessage
        const decode = AES.decrypt(msg.data.text, room.secret).toString(enc.Utf8)
        let realText = null
        try {
          realText = JSON.parse(decode)
          if (realText.m !== '#thisistext#') {
            realText = null
          }
        } catch (error) {

        }
        if (realText === null) {
          message.error("解码失败")
          return // 解码失败
        }
        msg.data.text = realText.t
        messages.value.push({
          name: msg.name,
          text: msg.data.text,
          time: new Date(msg.time)
        })
        await message_storage.setItem(new Date().getTime().toString(), {
          room: msg.room,
          text: msg.data.text,
          type: 'text',
          uid: my_info.id,
          time: msg.time,
          name: msg.name,
          sender: msg.id
        })
        // 在vue渲染完插入的数据后再移动到底部
        setTimeout(() => {
          scroll.value.scrollTop = scroll.value.scrollHeight;
        }, 1)
      }
      break;
    default:
      break;
  }
})

chat.onControl(async (d) => {
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
    case "resp_online_users": {
      const r = d as ControlRespOnlineUsers
      if (room.id === r.room) {
        online_count.value = r.count
      }
    } break;
    default:
      break;
  }
})

const scroll = ref()
const input_value = ref("")
const handle_input = (newv: string) => {
  input_value.value = newv
}
const send = () => {
  //
  chat.current()?.socket.emit("message", {
    type: 'text',
    id: my_info.id,
    name: my_info.name,
    room: room.id,
    data: {
      text: AES.encrypt(JSON.stringify({ t: input_value.value, m: '#thisistext#' }), room.secret).toString()
    }
  } as TextMessage)
  input_value.value = ""
}
const ask_online_count = setInterval(() => {
  if (my_info.id != "" && room.host != "" && room.id != "" && login_success.value) {
    chat.current()?.socket.emit("control", {
      room: room.id,
      action: 'ask_online_users'
    } as ControlAskOnlineUsers)
  }
}, 5000);

const _host = useInputValue(room.host)
const _id = useInputValue(my_info.id)
const _name = useInputValue(my_info.name)
const _room = useInputValue(room.id)
const _secret = useInputValue(room.secret)
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
      room.secret = r.secret
      _secret.value = r.secret
    }
  }
  if (my_info.id != "" && room.id != "" && room.host != "") {
    const s = chat.getInstance(_host.value, room.id)
    s.socket.emit('control', {
      action: 'connect',
      id: my_info.id,
      name: my_info.name
    } as ControlConnect);
    s.socket.emit('control', {
      action: 'enter_room',
      room: room.id,
      id: my_info.id
    } as ControlEnterRoom)
  }
})
const _comfirm_id_name = async () => {
  my_info.id = _id.value
  my_info.name = _name.value
  room.id = _room.value
  room.host = _host.value
  room.secret = _secret.value

  await localForage.setItem("current_uid", my_info.id)
  await user_storage.setItem(my_info.id, { ...unref(my_info) })

  const s = chat.getInstance(room.host, room.id)

  // 发射
  s.socket.emit('control', {
    action: 'connect',
    id: my_info.id,
    name: my_info.name,
    room: room.id
  } as ControlConnect);
  s.socket.emit('control', {
    action: 'enter_room',
    room: room.id,
    id: my_info.id
  } as ControlEnterRoom)
}
onUnmounted(() => {
  chat.release()
  clearInterval(ask_online_count)
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
  <n-input
    :value="_secret.value"
    :onUpdate:value="_secret.onChange"
    placeholder="SECRET"
    :disabled="login_success"
  />
  <n-button @click="_comfirm_id_name" :disabled="login_success">连接</n-button>
  <n-button @click="() => chat.release()" :disabled="!login_success">断开</n-button>
  <p>消息:</p>
  <p>Room: {{ `${room.name === '' ? '未连接' : room.name} 在线：${online_count}` }}</p>
  <div ref="scroll" :style="{ height: '200px', overflowY: 'scroll' }">
    <p v-for="msg in messages">{{ `[${fomateTime(msg.time)}] [${msg.name}]: ${msg.text}` }}</p>
  </div>

  <p>输入:</p>
  <n-input :value="input_value" :onUpdate:value="handle_input" />
  <n-button @click="send" :disabled="!login_success">发送</n-button>
</template>
