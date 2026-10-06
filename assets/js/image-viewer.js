// Progressive enhancement: keep original links usable without JS or <dialog>.
(() => {
    if (typeof HTMLDialogElement === 'undefined' || !HTMLDialogElement.prototype.showModal) return;
    const links = document.querySelectorAll('.image-fullsize');
    for (const link of links) link.setAttribute('aria-haspopup', 'dialog');

    for (const link of links) link.addEventListener('click', event => {
        if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
        if (new URL(link.href).origin !== location.origin) return;
        const original = link.querySelector('img');
        if (!original) return;

        const dialog = document.createElement('dialog');
        dialog.className = 'image-viewer';
        dialog.setAttribute('aria-labelledby', 'sttp-image-viewer-title');
        dialog.innerHTML = `
            <div class="image-viewer-toolbar">
                <h2 id="sttp-image-viewer-title"></h2>
                <button type="button" class="image-viewer-zoom" aria-label="Actual size (1:1)" aria-pressed="false" title="Toggle actual size" disabled>[1:1]</button>
                <button type="button" class="image-viewer-close" aria-label="Close image viewer" autofocus>[close]</button>
            </div>
            <p class="image-viewer-status" role="status">Loading image…</p>
            <div class="image-viewer-canvas" role="region" aria-label="Image; scroll to explore at actual size" tabindex="-1"><img decoding="async"></div>
            <a class="image-viewer-original" target="_blank" rel="noopener" hidden>Open original image in a new tab</a>`;
        const image = dialog.querySelector('img');
        const canvas = dialog.querySelector('.image-viewer-canvas');
        const status = dialog.querySelector('.image-viewer-status');
        const zoom = dialog.querySelector('.image-viewer-zoom');
        const close = dialog.querySelector('.image-viewer-close');
        const fallback = dialog.querySelector('.image-viewer-original');
        dialog.querySelector('h2').textContent = original.alt || 'Full-size image';
        image.alt = original.alt;
        fallback.href = link.href;

        const scroll = { x: window.scrollX, y: window.scrollY };
        const root = document.documentElement;
        const alreadyLocked = root.classList.contains('image-viewing');
        dialog.addEventListener('close', () => {
            if (!alreadyLocked) root.classList.remove('image-viewing');
            image.removeAttribute('src');
            dialog.remove();
            link.focus({ preventScroll: true });
            window.scrollTo(scroll.x, scroll.y);
        }, { once: true });
        close.addEventListener('click', () => dialog.close());
        // Native modality makes the background inert and handles Escape. Cycle
        // controls explicitly: Safari's default Tab settings can skip buttons.
        dialog.addEventListener('keydown', event => {
            if (event.key !== 'Tab' || event.altKey || event.ctrlKey || event.metaKey) return;
            const controls = [...dialog.querySelectorAll('button:not(:disabled), a[href]:not([hidden]), [tabindex="0"]')];
            const current = controls.indexOf(document.activeElement);
            const next = current < 0 ? (event.shiftKey ? controls.length - 1 : 0) :
                (current + (event.shiftKey ? -1 : 1) + controls.length) % controls.length;
            event.preventDefault();
            controls[next].focus({ preventScroll: true });
        });
        let pointerStart;
        dialog.addEventListener('pointerdown', event => { pointerStart = event.target; });
        dialog.addEventListener('click', event => {
            if (event.target !== pointerStart) return; // A drag is not backdrop dismissal.
            const bounds = dialog.getBoundingClientRect();
            const outside = event.clientX < bounds.left || event.clientX > bounds.right ||
                event.clientY < bounds.top || event.clientY > bounds.bottom;
            if (event.target === canvas || (event.target === dialog && outside)) dialog.close();
        });
        zoom.addEventListener('click', () => {
            const actualSize = dialog.classList.toggle('is-zoomed');
            zoom.setAttribute('aria-pressed', String(actualSize));
            canvas.tabIndex = actualSize ? 0 : -1;
            canvas.scrollTo(0, 0);
        });
        // Arrow scrolling of a focused overflow region varies between engines.
        canvas.addEventListener('keydown', event => {
            if (!dialog.classList.contains('is-zoomed') || event.target !== canvas || event.altKey || event.ctrlKey || event.metaKey) return;
            const step = { ArrowLeft: [-64, 0], ArrowRight: [64, 0], ArrowUp: [0, -64], ArrowDown: [0, 64],
                PageUp: [0, -canvas.clientHeight], PageDown: [0, canvas.clientHeight] }[event.key];
            if (step) {
                event.preventDefault();
                canvas.scrollBy(step[0], step[1]);
            }
        });
        image.addEventListener('load', () => {
            status.hidden = true;
            zoom.disabled = false;
        });
        image.addEventListener('error', () => {
            status.textContent = 'Image could not load.';
            status.hidden = false;
            fallback.hidden = false;
        });

        document.body.append(dialog);
        try {
            dialog.showModal();
        } catch {
            dialog.remove();
            return; // Unsupported/broken enhancement must not swallow navigation.
        }
        event.preventDefault();
        root.classList.add('image-viewing');
        close.focus({ preventScroll: true });
        image.src = link.href;
    });
})();
