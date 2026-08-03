const PHONE_MEDIA_QUERY = '(hover: none) and (pointer: coarse)';

/** True when the app is installed to the home screen on a touch-first phone browser. */
export function isPhonePwa() {
    if (typeof window === 'undefined') return false;

    const navigatorWithStandalone = window.navigator as Navigator & { standalone?: boolean };
    const isStandalone =
        window.matchMedia('(display-mode: standalone)').matches ||
        window.matchMedia('(display-mode: fullscreen)').matches ||
        navigatorWithStandalone.standalone === true;

    return isStandalone && window.matchMedia(PHONE_MEDIA_QUERY).matches;
}
