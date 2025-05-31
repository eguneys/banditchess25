const memoize = <T>(fn: ()=> T) => {
    let val = fn()
    return () => {
        return val
    }
}

const lowerAgent = navigator.userAgent.toLowerCase();

export const isMobile = (): boolean => isAndroid() || isIos();

export const isAndroid: () => boolean = memoize(() => lowerAgent.includes('android'));

export const isIos: () => boolean = memoize(() => /iphone|ipod/.test(lowerAgent) || isIPad());

export const isIPad = (): boolean => navigator?.maxTouchPoints > 2 && /ipad|macintosh/.test(lowerAgent);
