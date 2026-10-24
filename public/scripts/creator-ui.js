/*
Name:
    creator-ui.js
Purpose:
    The tabbed layout of the balance creator. balance-creator.js still does all the work through the same
    elements (ids) as before; this file only shows/hides parts of the form, adds read-only hints (e.g. "SAVED"
    marks) and moves Import / Export into dialogs.
*/

const CreatorView = {
    tab: "general",
    sub: { "tier-role": "surv", "killer": "rules", "kperk-role": "surv" }
};

const $id = id => document.getElementById(id);

/**
 * Shows the selected tab and sub-tabs, and the perk search column where it is needed.
 */
function UpdateCreatorLayout() {
    const root = $id("creator-root");

    root.querySelectorAll("#ctabs [data-ctab]").forEach(button => button.setAttribute("aria-selected", button.dataset.ctab === CreatorView.tab));
    root.querySelectorAll("[data-cpanel]").forEach(panel => panel.hidden = panel.dataset.cpanel !== CreatorView.tab);
    root.querySelectorAll("[data-subgroup]").forEach(group => {
        group.querySelectorAll("[data-sub]").forEach(button => button.setAttribute("aria-selected", button.dataset.sub === CreatorView.sub[group.dataset.subgroup]));
    });
    root.querySelectorAll("[data-subpanel]").forEach(panel => {
        const [group, value] = panel.dataset.subpanel.split(":");
        panel.hidden = CreatorView.sub[group] !== value;
    });

    const killerLocked = $id("killer-disabled-checkbox").checked;
    const needsSearch = CreatorView.tab === "tiers" || (CreatorView.tab === "killers" && CreatorView.sub.killer === "perks" && !killerLocked);
    $id("perk-panel").hidden = !needsSearch;
    $id("cmain").classList.toggle("full", !needsSearch);

    const survivorSearch = $id("perk-search-role-checkbox").checked;
    root.querySelectorAll("[data-searchrole]").forEach(button => button.setAttribute("aria-pressed", (button.dataset.searchrole === "survivor") === survivorSearch));
}

/**
 * Switches the perk search between killer and survivor perks through the original checkbox + search button.
 * @param {String} role "killer" or "survivor"
 */
function SetPerkSearchRole(role) {
    const checkbox = $id("perk-search-role-checkbox");

    if (checkbox.checked !== (role === "survivor")) {
        checkbox.checked = role === "survivor";
        $id("perk-search-button").click();
    }

    UpdateCreatorLayout();
}

/**
 * Asks for a tier name, then creates the tier through the original textbox + button.
 */
function ShowNewTierDialog() {
    const dialog = OpenDialog({
        title: "New tier",
        narrow: true,
        body: `<div class="field-dlg"><label for="new-tier-name">Tier name</label><input type="text" id="new-tier-name" autocomplete="off" placeholder="e.g. Tier 6"></div>
            <div class="dlg-actions"><button type="button" class="btn" data-close>Cancel</button><button type="button" class="btn primary" id="new-tier-add" disabled>Add tier</button></div>`
    });

    const input = dialog.root.querySelector("#new-tier-name");
    const addButton = dialog.root.querySelector("#new-tier-add");
    setTimeout(() => input.focus(), 0);

    const submit = () => {
        const name = input.value.trim();
        if (!name) { return; }

        $id("tier-creation-textbox").value = name;
        $id("tier-creation-button").click();

        const tierList = $id("tier-selection-dropdown");
        tierList.value = name;
        tierList.dispatchEvent(new Event("change"));

        dialog.close();
        ShowNotice(`Tier "${name}" added`, "success");
    };

    input.addEventListener("input", () => { addButton.disabled = !input.value.trim(); });
    input.addEventListener("keydown", event => { if (event.key === "Enter") { submit(); } });
    addButton.addEventListener("click", submit);
}

/**
 * The tier list is shown as a list box. Unlike a dropdown, a list box has nothing selected after the creator
 * rebuilds its options, so re-select the previous tier (or General) through the existing change handler.
 */
function WatchTierList() {
    const tierList = $id("tier-selection-dropdown");
    let lastTier = tierList.value || "General";

    const showName = () => {
        $id("creator-root").querySelectorAll("[data-tiername]").forEach(element => element.textContent = tierList.value || "—");
    };
    const ensureSelection = () => {
        if (tierList.selectedIndex === -1 && tierList.options.length) {
            tierList.value = [...tierList.options].some(option => option.value === lastTier) ? lastTier : tierList.options[0].value;
            tierList.dispatchEvent(new Event("change"));
        }
        showName();
    };

    tierList.addEventListener("change", () => { lastTier = tierList.value; showName(); });
    new MutationObserver(ensureSelection).observe(tierList, { childList: true });
    ensureSelection();
}

/**
 * @returns {Object} The balance of the killer selected in the creator, or null.
 */
function GetSelectedKillerBalance() {
    const index = GetCurrentKillerIndex();
    return index >= 0 && KillerBalance ? KillerBalance[index] : null;
}

/**
 * Marks the options that are already saved for the selected killer ("SAVED"). Selections in the lists are not saved
 * until their Save button is pressed, so this shows what will actually be exported.
 */
function MarkSavedOptions() {
    const killerBalance = GetSelectedKillerBalance();
    if (!killerBalance) { return; }

    const markByIndex = (id, list) => {
        const saved = (list || []).map(Number);
        [...$id(id).options].forEach((option, index) => option.classList.toggle("saved", saved.includes(index)));
    };
    const markByValue = (id, list) => {
        const saved = (list || []).map(String);
        [...$id(id).options].forEach(option => option.classList.toggle("saved", saved.includes(String(option.value))));
    };

    markByIndex("killer-tier-selection-dropdown", killerBalance.BalanceTiers);
    markByIndex("survivor-balance-tier-dropdown", killerBalance.SurvivorBalanceTiers);
    markByIndex("killer-offering-selection-dropdown", killerBalance.KillerOfferings);
    markByIndex("survivor-offering-selection-dropdown", killerBalance.SurvivorOfferings);
    markByValue("killer-item-selection-dropdown", killerBalance.ItemWhitelist);

    const savedItems = (killerBalance.ItemWhitelist || []).map(String);
    const typeHasSaved = type => (Items?.Items || []).some(item => item.Type === type && savedItems.includes(String(item.id))) ||
        !!(killerBalance.AddonWhitelist?.[type]?.Addons.length);
    [...$id("killer-item-type-selection-dropdown").options].forEach(option => option.classList.toggle("saved", typeHasSaved(option.value)));

    const itemType = $id("killer-item-type-selection-dropdown").value;
    markByValue("killer-item-addon-selection-dropdown", itemType && killerBalance.AddonWhitelist?.[itemType] ? killerBalance.AddonWhitelist[itemType].Addons : []);

    // Items and add-ons have their icon set as an inline background; put the mark next to it.
    [...$id("killer-item-selection-dropdown").options, ...$id("killer-item-addon-selection-dropdown").options].forEach(option => {
        if (option.dataset.icon === undefined) { option.dataset.icon = option.style.backgroundImage; }
        if (option.dataset.icon) {
            option.style.backgroundImage = option.classList.contains("saved") ? `var(--sb), ${option.dataset.icon}` : option.dataset.icon;
        }
    });
}

/*
    Maps: "available" and "maps for this killer" lists. Saving still goes through the original
    map list and its Confirm button, which stay in the page hidden.
*/
const PickedMaps = new Set();

function RenderMapLists() {
    const killerBalance = GetSelectedKillerBalance();
    if (!killerBalance || !Maps) { return; }

    const saved = new Set((killerBalance.Map || []).map(String));
    const query = $id("cmap-q").value.trim().toLowerCase();
    const realms = {};

    for (const map of Maps) {
        if (saved.has(String(map.ID))) { continue; }
        if (query && !`${map.Name} ${map.Realm}`.toLowerCase().includes(query)) { continue; }
        (realms[map.Realm] = realms[map.Realm] || []).push(map);
    }

    $id("cmap-avail").innerHTML = Object.entries(realms).map(([realm, maps]) =>
        `<optgroup label="${EscapeHTML(realm)}">${maps.map(map => `<option value="${map.ID}"${PickedMaps.has(String(map.ID)) ? " selected" : ""}>${EscapeHTML(map.Name)}</option>`).join("")}</optgroup>`
    ).join("");
    $id("cmap-saved").innerHTML = Maps.filter(map => saved.has(String(map.ID)))
        .map(map => `<option value="${map.ID}">${EscapeHTML(map.Name)} · ${EscapeHTML(map.Realm)}</option>`).join("");
}

function SaveKillerMaps(mapIds) {
    // The original list must show every map before selecting in it.
    const searchBox = $id("map-search-textbox");
    if (searchBox.value) {
        searchBox.value = "";
        UpdateMapDropdowns();
    }

    [...$id("map-selection-dropdown").options].forEach(option => option.selected = mapIds.has(String(option.value)));
    $id("map-confirmation-button").click();
    RenderMapLists();
}

function AddPickedMaps() {
    const killerBalance = GetSelectedKillerBalance();
    if (!killerBalance || !PickedMaps.size) { return; }

    const mapIds = new Set([...(killerBalance.Map || []).map(String), ...PickedMaps]);
    PickedMaps.clear();
    SaveKillerMaps(mapIds);
}

function RemoveSelectedMaps() {
    const killerBalance = GetSelectedKillerBalance();
    const removed = new Set([...$id("cmap-saved").selectedOptions].map(option => option.value));
    if (!killerBalance || !removed.size) { return; }

    SaveKillerMaps(new Set((killerBalance.Map || []).map(String).filter(id => !removed.has(id))));
}

/**
 * Greys out and locks the killer's settings while the killer is disabled.
 */
function UpdateKillerLock() {
    const disabled = $id("killer-disabled-checkbox").checked;
    const lock = $id("klock");

    lock.inert = disabled;
    lock.classList.toggle("locked", disabled);
    $id("klock-note").hidden = !disabled;
    $id("creator-root").querySelectorAll("[data-kname]").forEach(element => element.textContent = $id("killer-selection-dropdown").value);

    UpdateCreatorLayout();
}

/**
 * Shows the selected killer's portrait and name in the killer picker.
 */
function UpdateKillerPicker() {
    const name = $id("killer-selection-dropdown").value;
    const killer = (Killers || []).find(killer => killer.Name === name);

    $id("ckiller-name").textContent = name || "";
    if (killer) { $id("ckiller-portrait").src = killer.Portrait; }
}

/**
 * Opening Items: select the first item type that has something saved (or the first type).
 */
function PickItemType() {
    const typeList = $id("killer-item-type-selection-dropdown");
    if (typeList.selectedIndex !== -1 || !typeList.options.length) { return; }

    MarkSavedOptions();
    typeList.value = ([...typeList.options].find(option => option.classList.contains("saved")) || typeList.options[0]).value;
    typeList.dispatchEvent(new Event("change"));
}

function RefreshCreatorViews() {
    if (!KillerBalance) { return; }

    MarkSavedOptions();
    RenderMapLists();
    UpdateKillerLock();
    UpdateKillerPicker();
}

/*
    Import / Export dialogs. The original elements are moved into the dialog and back to #cio-holder when it
    closes. While a dialog is open, the creator's alerts show inside it instead of in a new dialog.
*/
let OpenIODialog = null;

function ShowIODialog(which) {
    const panel = $id(`cio-${which}`);
    const message = $id(which === "import" ? "cimp-msg" : "cexp-msg");
    const previousAlert = window.alert;

    message.hidden = true;
    window.alert = text => {
        message.hidden = false;
        message.innerHTML = EscapeHTML(text).replace(/\n/g, "<br>");
    };

    OpenIODialog = OpenDialog({
        title: which === "import" ? "Import balancing" : "Export balancing",
        body: `<div class="cio"></div>`,
        onClose: () => {
            window.alert = previousAlert;
            $id("cio-holder").appendChild(panel);
            OpenIODialog = null;
        }
    });
    OpenIODialog.body.querySelector(".cio").appendChild(panel);

    if (which === "export") { RefreshExportText(); }
}

/**
 * Clears the balancing by importing an empty one through the creator's own importer,
 * which re-creates every killer with the default settings.
 */
function ShowClearDialog() {
    const dialog = OpenDialog({
        title: "Clear balancing",
        narrow: true,
        body: `<p>This removes the name, notes, tiers and every killer's settings. Export first if you want to keep them.</p>
            <div class="dlg-actions"><button type="button" class="btn" data-close>Cancel</button><button type="button" class="btn danger" data-clear>Clear balancing</button></div>`
    });

    dialog.root.querySelector("[data-clear]").addEventListener("click", () => {
        const emptyBalancing = {
            Name: "",
            MaxPerkRepetition: 1,
            GlobalNotes: "",
            Tiers: [{ Name: "General", SurvivorIndvPerkBans: [], SurvivorComboPerkBans: [], KillerIndvPerkBans: [], KillerComboPerkBans: [] }],
            KillerOverride: []
        };

        const importBox = $id("balance-import-textbox");
        const keptText = importBox.value;
        importBox.value = JSON.stringify(emptyBalancing);
        ImportBalancing();
        importBox.value = keptText;

        dialog.close();
        CreatorView.tab = "general";
        UpdateCreatorLayout();
        RefreshCreatorViews();
        ShowNotice("Balancing cleared", "success");
    });
}

/*
    Import: the original button still does the work; this only notices whether it complained (an alert or an
    exception), then clears the text box and goes to General on success.
*/
const ImportWatch = {
    failed: false,
    error: null,
    previousText: null,
    alert: null,

    fail(event) {
        ImportWatch.failed = true;
        if (event && event.message) { ImportWatch.error = event.message; }
    },

    start(event) {
        const message = $id("cimp-msg");

        // Valid JSON that isn't a balancing would make the importer stop halfway and leave the editor broken.
        let parsed = null;
        try { parsed = JSON.parse($id("balance-import-textbox").value); } catch (error) { /* the importer reports invalid JSON */ }

        if (parsed && (!Array.isArray(parsed.Tiers) || !Array.isArray(parsed.KillerOverride))) {
            event.stopPropagation();
            message.hidden = false;
            message.textContent = 'The JSON is valid but has no "Tiers" or "KillerOverride". Paste a balancing exported from Create.';
            if (ImportWatch.previousText !== null) {
                $id("balance-import-textbox").value = ImportWatch.previousText;
                ImportWatch.previousText = null;
            }
            return;
        }

        ImportWatch.failed = false;
        ImportWatch.error = null;
        ImportWatch.alert = window.alert;
        message.hidden = true;

        window.alert = text => { ImportWatch.fail(); ImportWatch.alert(text); };
        window.addEventListener("error", ImportWatch.fail);
    },

    end() {
        window.alert = ImportWatch.alert;
        window.removeEventListener("error", ImportWatch.fail);

        const importBox = $id("balance-import-textbox");

        if (ImportWatch.failed) {
            if (ImportWatch.previousText !== null) { importBox.value = ImportWatch.previousText; }

            if (ImportWatch.error) {
                const message = $id("cimp-msg");
                message.hidden = false;
                message.textContent = `This doesn't look like a balancing exported from Create. (${ImportWatch.error})`;
            }
        } else {
            importBox.value = "";
            if (OpenIODialog) { OpenIODialog.close(); }
            ShowNotice(`Imported "${$id("balance-name-textbox").value}"`, "success");

            CreatorView.tab = "general";
            UpdateCreatorLayout();
            RefreshCreatorViews();
        }

        ImportWatch.previousText = null;
    }
};

function ImportFromFile(file) {
    if (!file) { return; }

    const reader = new FileReader();
    reader.onload = () => {
        ImportWatch.previousText = $id("balance-import-textbox").value;
        $id("balance-import-textbox").value = reader.result;
        $id("balance-import-button").click();
    };
    reader.readAsText(file);
}

/**
 * Rebuilds the export text from the current balancing (every time the Export dialog opens, so it is never stale).
 * If the balancing can't be exported, the reason is shown instead and the buttons are disabled
 * (downloading would otherwise produce a file containing "undefined").
 */
function RefreshExportText() {
    const exportBox = $id("balance-export-textbox");
    const message = $id("cexp-msg");
    const problems = [];
    const previousAlert = window.alert;

    window.alert = text => problems.push(String(text));
    try {
        ExportBalancing(false);
    } catch (error) {
        problems.push(String(error));
    } finally {
        window.alert = previousAlert;
    }

    message.hidden = !problems.length;
    message.innerHTML = EscapeHTML(problems.join("\n")).replace(/\n/g, "<br>");
    exportBox.hidden = !!problems.length;
    if (problems.length) { exportBox.value = ""; }

    document.querySelector("[data-cact='copy-export']").disabled = !!problems.length;
    $id("balance-export-button").disabled = !!problems.length;
}

function CopyExportText() {
    const exportBox = $id("balance-export-textbox");
    const done = () => ShowNotice("Copied to clipboard", "success");
    const fallback = () => {
        exportBox.select();
        document.execCommand("copy");
        done();
    };

    if (navigator.clipboard) {
        navigator.clipboard.writeText(exportBox.value).then(done, fallback);
    } else {
        fallback();
    }
}

function LoadCreatorUIEvents() {
    const root = $id("creator-root");

    // The creator reports problems with alert(); show them in a dialog in the site's style.
    window.alert = text => OpenDialog({
        title: "Balance Creator",
        narrow: true,
        body: `<div class="alert-body">${EscapeHTML(text).replace(/\n/g, "<br>")}</div><div class="dlg-actions"><button type="button" class="btn primary" data-close>OK</button></div>`
    });

    root.addEventListener("click", event => {
        const tab = event.target.closest("[data-ctab]");
        if (tab) {
            CreatorView.tab = tab.dataset.ctab;
            UpdateCreatorLayout();
            return;
        }

        const subTab = event.target.closest("[data-sub]");
        if (subTab) {
            const group = subTab.closest("[data-subgroup]").dataset.subgroup;
            CreatorView.sub[group] = subTab.dataset.sub;

            if (subTab.dataset.roleHint) { SetPerkSearchRole(subTab.dataset.roleHint); }
            UpdateCreatorLayout();

            if (group === "killer" && subTab.dataset.sub === "items") { PickItemType(); }
            return;
        }

        const searchRole = event.target.closest("[data-searchrole]");
        if (searchRole) { SetPerkSearchRole(searchRole.dataset.searchrole); }

        if (event.target.closest("[data-cact='new-tier']")) { ShowNewTierDialog(); }
        if (event.target.closest("[data-cact='map-add']")) { AddPickedMaps(); }
        if (event.target.closest("[data-cact='map-remove']")) { RemoveSelectedMaps(); }
        if (event.target.closest("[data-cact='enable-killer']")) { $id("killer-disabled-checkbox").click(); }
    });

    // Anything the creator does may change what is saved; refresh the read-only views afterwards.
    const refreshLater = event => {
        if (!event.target.closest("#cmap-avail, #cmap-saved, #cmap-q")) { setTimeout(RefreshCreatorViews, 0); }
    };
    root.addEventListener("click", refreshLater);
    root.addEventListener("change", refreshLater);

    root.addEventListener("change", event => {
        if (event.target.id === "cmap-avail") {
            [...event.target.options].forEach(option => option.selected ? PickedMaps.add(option.value) : PickedMaps.delete(option.value));
        }

        if (event.target.id === "killer-selection-dropdown") {
            UpdateKillerPicker();
            if (CreatorView.sub.killer !== "rules") {
                CreatorView.sub.killer = "rules";
                UpdateCreatorLayout();
            }
        }
    });
    root.addEventListener("input", event => {
        if (event.target.id === "cmap-q") { RenderMapLists(); }
    });

    let searchDelay;
    $id("perk-search-textbox").addEventListener("input", () => {
        clearTimeout(searchDelay);
        searchDelay = setTimeout(() => $id("perk-search-button").click(), 120);
    });

    $id("creator-import-button").addEventListener("click", () => ShowIODialog("import"));
    $id("creator-export-button").addEventListener("click", () => ShowIODialog("export"));
    $id("creator-clear-button").addEventListener("click", ShowClearDialog);

    // The listeners sit on the panels, which travel into the dialogs with their content.
    $id("cio-import").addEventListener("click", event => { if (event.target.closest("#balance-import-button")) { ImportWatch.start(event); } }, true);
    $id("cio-import").addEventListener("click", event => { if (event.target.closest("#balance-import-button")) { ImportWatch.end(); } });
    $id("cio-export").addEventListener("click", event => { if (event.target.closest("[data-cact='copy-export']")) { CopyExportText(); } });

    const dropZone = $id("cimp-zone");
    $id("cimp-file").addEventListener("change", event => {
        ImportFromFile(event.target.files[0]);
        event.target.value = "";
    });
    dropZone.addEventListener("dragover", event => { event.preventDefault(); dropZone.classList.add("over"); });
    dropZone.addEventListener("dragleave", () => dropZone.classList.remove("over"));
    dropZone.addEventListener("drop", event => {
        event.preventDefault();
        dropZone.classList.remove("over");
        ImportFromFile(event.dataTransfer.files[0]);
    });
}

window.addEventListener("load", function() {
    main();

    // main() lists survivor perks but leaves the role checkbox unticked; tick it so the switch shows the truth.
    $id("perk-search-role-checkbox").checked = true;

    LoadCreatorUIEvents();
    WatchTierList();

    // LoadKillerOverrideUI() rebuilds this list every time a killer is (re)loaded: a reliable "killer loaded" signal.
    new MutationObserver(RefreshCreatorViews).observe($id("killer-individual-addon-ban-dropdown"), { childList: true });
    setTimeout(RefreshCreatorViews, 300);

    UpdateCreatorLayout();
});
