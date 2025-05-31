import { createContext, type JSX, useContext } from "solid-js"
import { AudioContent } from "../game/audio"

export function AudioProvider(props: { children: JSX.Element }) {

    let audio = AudioContent()

    audio.load()

    return (<AudioContext.Provider value={audio}>
        {props.children}
    </AudioContext.Provider>)
}

const AudioContext = createContext<AudioContent>()

export function useAudio() {
    return useContext(AudioContext)!
}