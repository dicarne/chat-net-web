import { io, Socket } from "socket.io-client"
import { ref } from "vue"
import { ControlData, MessageData } from "../interface"

class Session {
    socket: Socket
    room: string
    constructor(s: Socket, r: string) {
        this.socket = s
        this.room = r
    }
}
const sessions = new Map<string, Session>()

export const useChat = () => {
    const login_success = ref(false)
    let _room = ""
    let _host = ""
    let session: Session | null = null

    const get_socket = (host: string, room: string) => {
        _host = host
        _room = room
        if (sessions.has(`${_room}@${host}`))
            return { o: true, s: sessions.get(`${_room}@${host}`)! }
        const s = new Session(io(host, {
            transports: ['websocket']
        }), room)
        sessions.set(`${_room}@${host}`, s)
        return { o: false, s: s }
    }
    let f_msg: ((d: MessageData) => void) | null = null
    let f_ctl: ((d: ControlData) => void) | null = null
    let f_disc: (() => void) | null = null
    const getInstance = (host: string, room: string) => {

        const s = get_socket(host, room)
        session = s.s
        if (s.o) { 
            return s.s 
        }

        session.socket.on("connect_error", (err) => {
            console.error(err)
        });

        session.socket.on('connect', function () {
            console.log(`链接成功 ${session!.socket!.id}`);
        });

        session.socket.on('control', (d: ControlData) => {
            if (d.room === _room) {
                f_ctl?.(d)
            }
        })
        session.socket.on('message', (d: MessageData) => {
            if (d.room === _room) {
                f_msg?.(d)
            }
        })
        session.socket.on('disconnect', () => {
            f_disc?.()
        })

        return session
    }

    const dispose = () => {
        sessions.forEach(so => so.socket.disconnect())
        sessions.clear()
    }

    const onMessage = (f: (d: MessageData) => void) => {
        f_msg = f
    }
    const onControl = (f: (d: ControlData) => void) => {
        f_ctl = f
    }
    const onDisconnect = (f: () => void) => {
        f_disc = f
    }
    const release = () => {
        session?.socket.disconnect()
        sessions.delete(`${_room}@${_host}`)
    }

    const current = () => session
    return { getInstance, current, dispose, onMessage, onControl, onDisconnect, release }
}