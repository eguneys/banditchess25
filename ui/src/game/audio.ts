async function load_audio(ctx: AudioContext, src: string) {
    const buffer = await fetch(src).then(_ => _.arrayBuffer())
    const audio_buffer = await ctx.decodeAudioData(buffer)
    return audio_buffer
}

export type AudioContent = {
    load: () => Promise<void>
    play: (name: string, loop?: boolean, volume?: number) => void
    buffers: Record<string, AudioBuffer>
}

export function AudioContent(): AudioContent {

    let ctx = new AudioContext()

    let buffers: Record<string, AudioBuffer> = { }

    async function load() {
        buffers['hit0'] = await load_audio(ctx, './audio/hit0.mp3')
        buffers['hit3'] = await load_audio(ctx, './audio/hit3.mp3')
        buffers['hit6'] = await load_audio(ctx, './audio/hit6.wav')
        buffers['hit5'] = await load_audio(ctx, './audio/hit5.wav')
    }

    function play(music: string, loop: boolean = false, volume: number = 0.5) {
        let buffer = buffers[music]
        const source = ctx.createBufferSource()
        source.buffer = buffer

        let gain = ctx.createGain()
        gain.gain.value = volume


        gain.connect(ctx.destination)
        source.connect(gain)
        source.loop = loop

        source.start()

        return () => {
            source.stop()
        }
    }

    return {
        load,
        play,
        buffers
    }
}