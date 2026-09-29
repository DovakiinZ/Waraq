/**
 * Pre-print preparation shared by the AI summary pages.
 *
 * Two things reliably ruin a browser print if you skip them:
 *
 *  1. FONTS. IBM Plex Sans Arabic is self-hosted via @fontsource and imported
 *     at the top of index.css, but an @font-face file is only fetched when the
 *     renderer first needs that exact family+weight. Calling window.print()
 *     before the weight has loaded prints a fallback face — for Arabic that
 *     means wrong shaping and wrong metrics, not merely a different look.
 *
 *  2. IMAGES. `<img>` in lesson content carries no width/height, so an image
 *     that is still decoding contributes zero height at layout time and the
 *     paginator puts the page break in the wrong place.
 *
 * Both are awaited before printing. Everything here fails soft: a font that
 * never loads or an image that 404s must not block the print dialog.
 */

/** Weights actually used by the print pages, matching index.css's imports. */
const REQUIRED_FACES = [
    '400 1rem "IBM Plex Sans Arabic"',
    '600 1rem "IBM Plex Sans Arabic"',
    '700 1rem "IBM Plex Sans Arabic"',
];

/** Never hang the print button on a wedged network request. */
const TIMEOUT_MS = 3000;

function withTimeout<T>(promise: Promise<T>, ms = TIMEOUT_MS): Promise<T | null> {
    return Promise.race([
        promise.catch(() => null),
        new Promise<null>((resolve) => setTimeout(() => resolve(null), ms)),
    ]);
}

/**
 * Wait for fonts and images inside `root` (or the document) to be ready.
 * Resolves even when something fails — printing a slightly imperfect page
 * beats a button that does nothing.
 */
export async function preparePrint(root?: HTMLElement | null): Promise<void> {
    const scope: ParentNode = root ?? document;

    const fontsReady = (async () => {
        // document.fonts is absent in some embedded webviews.
        if (typeof document === 'undefined' || !('fonts' in document)) return;
        const fontSet = document.fonts;
        await Promise.all(REQUIRED_FACES.map((face) => withTimeout(fontSet.load(face))));
        await withTimeout(fontSet.ready);
    })();

    const imagesReady = (async () => {
        const images = Array.from(scope.querySelectorAll('img'));
        await Promise.all(
            images.map((img) => {
                if (img.complete && img.naturalWidth > 0) return Promise.resolve(null);
                // decode() rejects on a broken image; withTimeout swallows it.
                return withTimeout(img.decode());
            })
        );
    })();

    await Promise.all([fontsReady, imagesReady]);
}
