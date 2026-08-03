import { useEffect, useState } from 'react';

const HOVER_MEDIA_QUERY = '(hover: hover) and (pointer: fine)';

/**
 * True on desktop browsers with a precise pointing device (mouse/trackpad).
 * False on touch-first devices such as phone PWAs, where hover tooltips stick
 * awkwardly after tap.
 */
export function useSupportsHover() {
    const [supportsHover, setSupportsHover] = useState(false);

    useEffect(() => {
        const mediaQuery = window.matchMedia(HOVER_MEDIA_QUERY);
        const update = () => setSupportsHover(mediaQuery.matches);
        update();
        mediaQuery.addEventListener('change', update);
        return () => mediaQuery.removeEventListener('change', update);
    }, []);

    return supportsHover;
}
