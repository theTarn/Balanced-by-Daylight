/*
Name:
    ui-common.js
Purpose:
    Shared interface pieces for the checker and the creator: the top bar (mode menu, About), dialogs and floating notices.
*/

/**
 * Escapes text for use inside HTML.
 * @param {*} value
 * @returns {String}
 */
function EscapeHTML(value) {
    return String(value ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

/**
 * Opens a dialog in the shared dialog layer.
 * @param {Object} options
 * @param {String} options.title The dialog title.
 * @param {String} options.body The dialog body HTML.
 * @param {Boolean} options.narrow Whether to use the narrow width.
 * @param {Function} options.onClose Called before the dialog is removed.
 * @returns {{root: Element, body: Element, close: Function}}
 */
function OpenDialog({ title, body, narrow = false, onClose = null }) {
    DismissNotice();

    const layer = document.getElementById("dialog-layer");
    const scrim = document.createElement("div");
    scrim.className = "scrim";
    scrim.innerHTML = `<div class="dlg ${narrow ? "narrow" : ""}" role="dialog" aria-modal="true" aria-label="${EscapeHTML(title)}">
        <div class="dlg-head"><h2>${EscapeHTML(title)}</h2><button type="button" class="dlg-x" data-close aria-label="Close">✕</button></div>
        <div class="dlg-body">${body}</div></div>`;
    layer.appendChild(scrim);

    const keyHandler = event => { if (event.key === "Escape") { close(); } };
    const close = () => {
        if (onClose) { onClose(); }
        scrim.remove();
        document.removeEventListener("keydown", keyHandler);
    };

    document.addEventListener("keydown", keyHandler);
    scrim.addEventListener("click", event => {
        if (event.target === scrim || event.target.closest("[data-close]")) { close(); }
    });

    return { root: scrim, body: scrim.querySelector(".dlg-body"), close: close };
}

/**
 * Wires a dialog that is part of the page markup (a hidden .scrim): the close button and a click outside hide it.
 * @param {String} id The id of the .scrim element.
 * @param {Function} onClose Called instead of hiding when given (e.g. to run the dialog's own close logic).
 */
function SetStaticDialogEvents(id, onClose = undefined) {
    const scrim = document.getElementById(id);
    const close = () => { if (onClose) { onClose(); } else { scrim.hidden = true; } };

    scrim.addEventListener("click", event => {
        if (event.target === scrim || event.target.closest("[data-close]")) { close(); }
    });
    document.addEventListener("keydown", event => {
        if (event.key === "Escape" && !scrim.hidden) { close(); }
    });
}

/**
 * Removes the floating notice, if any.
 */
function DismissNotice() {
    document.querySelectorAll(".toast").forEach(notice => notice.remove());
}

/**
 * Shows a floating notice under the menu bars, or just above an open dialog.
 * @param {String} message Plain text.
 * @param {String} kind "info", "success" or "error".
 */
function ShowNotice(message, kind = "info") {
    DismissNotice();

    const icon = { info: "/iconography/Info.webp", success: "/iconography/ui/check.webp", error: "/iconography/ui/bang.webp" }[kind];
    const notice = document.createElement("div");
    notice.className = `toast ${kind}`;
    notice.setAttribute("role", kind === "error" ? "alert" : "status");
    notice.innerHTML = `<img src="${icon}" alt=""><span>${EscapeHTML(message)}</span>`;
    notice.style.visibility = "hidden";
    document.body.appendChild(notice);

    const openDialog = [...document.querySelectorAll(".scrim:not([hidden]) .dlg")].pop();
    if (openDialog) {
        // Not enough room above the dialog: move the dialog down instead of covering it.
        const room = openDialog.getBoundingClientRect().top;
        const need = notice.offsetHeight + 18;
        if (room < need) {
            const scrim = openDialog.parentElement;
            scrim.style.paddingTop = (parseFloat(getComputedStyle(scrim).paddingTop) + need - room) + "px";
        }
        notice.style.top = Math.max(6, openDialog.getBoundingClientRect().top - notice.offsetHeight - 8) + "px";
    } else {
        const barsBottom = Math.max(0, ...[".sitebar", ".subbar"].map(selector => document.querySelector(selector)?.getBoundingClientRect().bottom || 0));
        notice.style.top = Math.max(12, barsBottom + 10) + "px";
    }
    notice.style.visibility = "";

    setTimeout(() => {
        notice.classList.add("out");
        setTimeout(() => notice.remove(), 250);
    }, 3200);
}

/**
 * Shows the About dialog (contributors, links, version).
 */
function ShowAboutDialog() {
    OpenDialog({
        title: "About",
        narrow: true,
        body: `<div class="about">
            <p>Balanced by Daylight made by Kyle Starr and Contributors:</p>
            <ul>
                <li><b>SHADERS (Kyle)</b> - Started the project, and leads the development of Balanced by Daylight.</li>
                <li><b>Floliroy</b> - Assisted heavily in improvements to Perk search, import/export, added drag/drop, and SO much more...</li>
                <li><b>S1mmyy</b> - Fixed the drag/drop functionality on Firefox and made the system much easier to work with.</li>
                <li><b>Vivian Sanchez</b> - Began the work on the mobile UI for Balanced by Daylight.</li>
                <li><b>WheatDraws</b> - Created the Balanced by Daylight logo.</li>
                <li><b>MegaDirtPotato</b> - Greatly assisted in troubleshooting and diagnosing bugs with the project.</li>
            </ul>
            <p style="margin-top:14px">This project is open source, and contributions are welcome. If you would like to contribute, please visit the <a target="_blank" rel="noopener" href="https://github.com/kylestarrtech/DBD-Balance-Checker">GitHub</a>.</p>
            <div class="links">
                <a class="btn" href="https://discord.gg/E6zfpwvCce" target="_blank" rel="noopener"><img src="/iconography/Discord.webp" alt="">Join the Discord</a>
                <a class="btn" href="https://github.com/kylestarrtech/DBD-Balance-Checker/issues" target="_blank" rel="noopener">Report issues</a>
            </div>
            <p class="version">Version 1.5.0</p>
        </div>`
    });
}

/**
 * Sets up the top bar: the mode menu and the About button.
 */
function LoadTopBarEvents() {
    const modeButton = document.getElementById("mode-button");
    const modeMenu = document.getElementById("mode-menu");

    const setMenuOpen = open => {
        modeMenu.hidden = !open;
        modeButton.setAttribute("aria-expanded", open);
    };

    modeButton.addEventListener("click", () => setMenuOpen(modeMenu.hidden));
    document.addEventListener("click", event => {
        if (!modeMenu.hidden && !event.target.closest(".modewrap")) { setMenuOpen(false); }
    });
    document.addEventListener("keydown", event => {
        if (event.key !== "Escape") { return; }
        setMenuOpen(false);
        DismissNotice();
    });

    document.getElementById("info-button").addEventListener("click", ShowAboutDialog);
}

LoadTopBarEvents();
