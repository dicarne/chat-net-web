import { reactive, ref, UnwrapRef } from "vue";

export function useInputValue(initv: string) {
    const r = reactive({
        value: initv,
        onChange: (newvalue: string) => {
            r.value = newvalue
        }
    })
    return r
}