/*
Name:
    checker-tabs.js
Purpose:
    The tabs of the balance checker (Loadout, Notes & Maps, Bans), the cards next to the builds (match rules, maps)
    and keeping the address bar in sync with the loadout.
*/

var selectedTab = "loadout";
const SeenNotes = new Set();

const RarityNames = ["Common", "Uncommon", "Rare", "Very Rare", "Iridescent"];

/**
 * Shows a tab of the checker.
 * @param {String} tab "loadout", "rules" or "bans"
 */
function ShowCheckerTab(tab) {
    selectedTab = tab;

    for (const tabButton of document.querySelectorAll("#checker-tabs [data-tab]")) {
        tabButton.setAttribute("aria-selected", tabButton.dataset.tab == tab);
    }
    for (const panel of document.querySelectorAll("#main-balance-window [data-panel]")) {
        panel.hidden = panel.dataset.panel != tab;
    }

    document.getElementById("loadout-side").hidden = tab != "loadout";
    document.getElementById("main-balance-window").classList.toggle("full", tab != "loadout");

    if (tab == "rules") {
        UpdateNotesTabMark();
    }
}

function LoadCheckerTabEvents() {
    document.getElementById("checker-tabs").addEventListener("click", function(event) {
        const tabButton = event.target.closest("[data-tab]");
        if (tabButton) { ShowCheckerTab(tabButton.dataset.tab); }
    });

    document.getElementById("main-balance-window").addEventListener("click", function(event) {
        const tabLink = event.target.closest("[data-goto-tab]");
        if (tabLink) { ShowCheckerTab(tabLink.dataset.gotoTab); }
    });

    document.getElementById("bans-search-input").addEventListener("input", RenderBansPanel);
}

/**
 * @returns {Object} The selected killer's override, or undefined if the killer is not in the balancing.
 */
function GetSelectedKillerOverride() {
    if (currentBalancing == null) { return undefined; }
    return currentBalancing.KillerOverride[selectedKiller];
}

/**
 * The notes text (balancing and killer notes), used to tell whether there are notes the user hasn't opened yet.
 */
function GetNotesKey() {
    const currentKillerOverride = GetSelectedKillerOverride();
    return [currentBalancing?.GlobalNotes, currentKillerOverride?.KillerNotes].filter(note => note).join("\n\n");
}

function HasUnreadNotes() {
    const notesKey = GetNotesKey();
    return showNotesOnLaunch && notesKey != "" && !SeenNotes.has(notesKey);
}

/**
 * Shows "!" on the Notes & Maps tab when there are notes the user hasn't opened yet.
 */
function UpdateNotesTabMark() {
    if (currentBalancing == null) { return; }
    if (selectedTab == "rules") { SeenNotes.add(GetNotesKey()); }

    document.getElementById("rules-tab-mark").hidden = !HasUnreadNotes();
    UpdateMatchRulesUI();
}

/**
 * Strips HTML from notes (as the notes dialog did) and escapes the rest.
 * @param {String} notes
 */
function FormatNotes(notes) {
    return EscapeHTML(String(notes).replace(/<[^>]*>?/gm, ''));
}

/**
 * The perks a killer has as exceptions (whitelist) for the given role.
 * @returns {{perks: Array, combos: Array}}
 */
function GetWhitelistedPerks(killerOverride, role) {
    if (killerOverride == undefined) { return { perks: [], combos: [] }; }

    return {
        perks: (role == 0 ? killerOverride.SurvivorWhitelistedPerks : killerOverride.KillerWhitelistedPerks).map(id => parseInt(id)),
        combos: role == 0 ? killerOverride.SurvivorWhitelistedComboPerks : killerOverride.KillerWhitelistedComboPerks
    };
}

/**
 * The cards next to the builds: rules for the whole match and the killer's maps.
 */
function UpdateMatchRulesUI() {
    if (currentBalancing == null) { return; }

    const killer = Killers[selectedKiller];
    const currentKillerOverride = GetSelectedKillerOverride();
    const whitelist = GetWhitelistedPerks(currentKillerOverride, selectedRole);
    const exceptions = whitelist.perks.length + whitelist.combos.length;

    let rules = "";
    if (currentKillerOverride == undefined) {
        rules += `<li class="warn"><img src="/iconography/CriticalError.webp" alt="">${EscapeHTML(killer.Name)} isn't in this balancing</li>`;
    } else {
        if (currentKillerOverride.IsDisabled) {
            rules += `<li class="warn"><img src="/iconography/CriticalError.webp" alt="">${EscapeHTML(killer.Name)} is disabled here</li>`;
        }

        const antiFacecampAllowed = currentKillerOverride["AntiFacecampPermitted"];
        rules += `<li><img src="/iconography/${antiFacecampAllowed ? "Anticamp-Small-Colorized-Permitted" : "Anticamp-Small-Colorized-Prohibited"}.webp" alt="">` +
            `Anti-Facecamp <b>${antiFacecampAllowed ? "Permitted" : "Prohibited"}</b></li>`;
    }

    if (selectedRole == 0) {
        rules += `<li><img src="/iconography/Multiplayer.webp" alt="">Same perk max <b>${currentBalancing.MaxPerkRepetition}×</b> per team</li>`;
    }
    if (exceptions > 0) {
        rules += `<li><img src="/iconography/ui/check.webp" alt=""><button type="button" data-goto-tab="bans">${exceptions} ${exceptions == 1 ? "exception" : "exceptions"} for ${EscapeHTML(killer.Name)}</button></li>`;
    }
    if (HasUnreadNotes()) {
        rules += `<li><img class="bang" src="/iconography/ui/bang.webp" alt=""><button type="button" data-goto-tab="rules">Check the notes for this match</button></li>`;
    }

    document.getElementById("match-rules").innerHTML = `<h2>Match rules</h2><ul>${rules}</ul>`;

    const mapNames = (currentKillerOverride?.Map || []).map(id => GetMapByID(id)).filter(map => map != null).map(map => map["Name"]);
    document.getElementById("killer-maps").innerHTML = `<h2>${EscapeHTML(killer.Name)} maps</h2>` + (mapNames.length > 0 ?
        `<ul class="maplist">${mapNames.map(name => `<li>${EscapeHTML(name)}</li>`).join("")}</ul>` :
        `<p class="muted" style="margin:0">Any map</p>`);
}

/**
 * Notes & Maps tab: facts about the match and the killer's maps on the left, the notes on the right.
 */
function RenderRulesPanel() {
    if (currentBalancing == null) { return; }

    const killer = Killers[selectedKiller];
    const currentKillerOverride = GetSelectedKillerOverride();
    const preset = customBalanceOverride ? undefined : GetBalancePresetByID(currentBalancingIndex);

    const tierText = role => {
        if (currentKillerOverride == undefined) { return "—"; }
        const names = GetAppliedTierNames(currentKillerOverride, role);
        return names.length > 0 ? names.join(", ") : "General only";
    };
    const exceptionCount = role => {
        const whitelist = GetWhitelistedPerks(currentKillerOverride, role);
        return whitelist.perks.length + whitelist.combos.length;
    };

    let killerState = "";
    if (currentKillerOverride == undefined) { killerState = ` · <span class="bad">not in this balancing</span>`; }
    else if (currentKillerOverride.IsDisabled) { killerState = ` · <span class="bad">disabled</span>`; }

    let lastUpdated = "Custom balancing";
    if (preset != undefined) {
        lastUpdated = new Date(preset["LastUpdated"] * 1000).toLocaleDateString(navigator.language, { day: "numeric", month: "short", year: "numeric" });
    }

    const exceptionsText = [
        exceptionCount(0) > 0 ? `${exceptionCount(0)} for survivors` : "",
        exceptionCount(1) > 0 ? `${exceptionCount(1)} for the killer` : ""
    ].filter(text => text).join(", ");

    const maps = (currentKillerOverride?.Map || []).map(id => GetMapByID(id)).filter(map => map != null);
    const globalNotes = currentBalancing["GlobalNotes"] || "";
    const killerNotes = currentKillerOverride?.KillerNotes || "";

    document.getElementById("rules-panel").innerHTML = `<div class="twocol">
        <div>
            <section class="bansec"><h3>General</h3><dl class="kv">
                <dt>Tournament</dt><dd>${EscapeHTML(currentBalancing["Name"])}</dd>
                <dt>Last Updated</dt><dd>${EscapeHTML(lastUpdated)}</dd>
                <dt>Killer</dt><dd>${EscapeHTML(killer.Name)}${killerState}</dd>
                ${tierText(0) == tierText(1) ?
                    `<dt>Tier</dt><dd>${EscapeHTML(tierText(1))}</dd>` :
                    `<dt>Tier for killer perks</dt><dd>${EscapeHTML(tierText(1))}</dd><dt>Tier for survivor perks</dt><dd>${EscapeHTML(tierText(0))}</dd>`}
                <dt>Anti-Facecamp</dt><dd>${currentKillerOverride == undefined ? "—" : currentKillerOverride.AntiFacecampPermitted ? "Permitted" : "Prohibited"}</dd>
                <dt>Same perk per team</dt><dd>Max ${currentBalancing.MaxPerkRepetition}×</dd>
                ${exceptionsText ? `<dt>Exceptions</dt><dd><button type="button" class="linkbtn" data-goto-tab="bans">${exceptionsText}</button></dd>` : ""}
            </dl></section>
            <section class="bansec"><h3>${EscapeHTML(killer.Name)} maps <small>${maps.length > 0 ? `${maps.length} ${maps.length == 1 ? "map" : "maps"}` : "Any map"}</small></h3>
                ${maps.length > 0 ?
                    `<ul class="mapnotes">${maps.map(map => `<li>${EscapeHTML(map["Name"])} <span>${EscapeHTML(map["Realm"])}</span></li>`).join("")}</ul>` :
                    `<p class="muted">No map restriction.</p>`}
            </section>
        </div>
        <div>
            ${ContainsLink(globalNotes) || ContainsLink(killerNotes) ?
                `<p class="link-notice">Warning: This balancing preset contains a link! This link is unaffiliated with Balanced by Daylight and you are encouraged to exercise caution when clicking on unknown links.</p>` : ""}
            <section class="bansec"><h3>Global Notes</h3><p class="prose">${globalNotes ? FormatNotes(globalNotes) : "No global notes for this balancing profile."}</p></section>
            <section class="bansec"><h3>Notes for ${EscapeHTML(killer.Name)}</h3><p class="prose">${killerNotes ? FormatNotes(killerNotes) : "No special notes for this killer."}</p></section>
        </div>
    </div>`;
}

/**
 * Bans tab. Perks are banned one by one (ban lists), while items, add-ons and offerings are allowed lists.
 * The two kinds are shown as separate groups so a list's meaning never depends on a small caption.
 */
function RenderBansPanel() {
    if (currentBalancing == null || Perks == null) { return; }

    const isSurvivor = selectedRole == 0;
    const killer = Killers[selectedKiller];
    const currentKillerOverride = GetSelectedKillerOverride();
    const query = document.getElementById("bans-search-input").value.trim().toLowerCase();

    const matches = name => !query || String(name).toLowerCase().includes(query);
    const highlight = name => {
        const index = query ? name.toLowerCase().indexOf(query) : -1;
        if (index < 0) { return EscapeHTML(name); }
        return EscapeHTML(name.slice(0, index)) + "<mark>" + EscapeHTML(name.slice(index, index + query.length)) + "</mark>" + EscapeHTML(name.slice(index + query.length));
    };
    const perksOf = ids => ids.map(id => GetPerkById(parseInt(id))).filter(perk => perk != undefined);

    const whitelist = GetWhitelistedPerks(currentKillerOverride, selectedRole);
    const isWhitelisted = perk => whitelist.perks.includes(parseInt(perk.id));
    const isWhitelistedCombo = combo => whitelist.combos.some(whitelistedCombo => ComboIsEqual(perksOf(combo), whitelistedCombo));

    const okMark = `<img class="okmark" src="/iconography/ui/check.webp" alt="">`;
    const cell = (name, icon, note, allowed) => `<div class="${note ? "wl" : ""}"><span class="ic"><img src="${icon}" alt="">${allowed ? okMark : ""}</span>` +
        `<span class="nm">${note ? `<small class="al">${EscapeHTML(note)}</small>` : ""}<span class="tx">${highlight(name)}</span></span></div>`;
    const comboRow = (combo, note, allowed) => {
        const perks = perksOf(combo);
        return `<div class="${note ? "wl" : ""}">${perks.map(perk => `<img src="${perk.icon}" alt="">`).join("+")}${allowed ? okMark : ""} ` +
            `<span class="nm">${note ? `<small class="al">${EscapeHTML(note)}</small>` : ""}<span class="tx">${perks.map(perk => highlight(perk.name)).join(" + ")}</span></span></div>`;
    };

    let shown = 0;
    const section = (className, title, subtitle, perks, combos, options = {}) => {
        const shownPerks = perks.filter(perk => matches(perk.name)).sort((a, b) => a.name.localeCompare(b.name));
        const shownCombos = combos.filter(combo => !query || perksOf(combo).some(perk => matches(perk.name)));
        shown += shownPerks.length + shownCombos.length;

        if (query && shownPerks.length == 0 && shownCombos.length == 0) { return ""; }

        const note = lifted => options.tier && lifted ? `allowed for ${killer.Name}` : "";

        return `<section class="bansec ${className}"><h3>${EscapeHTML(title)} <small>${EscapeHTML(subtitle)}</small></h3>` +
            (shownPerks.length > 0 ? `${options.labels !== false ? "<h4>Perks</h4>" : ""}<div class="bans">${shownPerks.map(perk => cell(perk.name, perk.icon, note(isWhitelisted(perk)), options.allowed)).join("")}</div>` : "") +
            (shownCombos.length > 0 ? `<h4>Combinations</h4><div class="combos">${shownCombos.map(combo => comboRow(combo, note(isWhitelistedCombo(combo)), options.allowed)).join("")}</div>` : "") +
            (shownPerks.length == 0 && shownCombos.length == 0 ? `<p class="muted" style="margin:0">${options.empty || "Nothing here."}</p>` : "") +
            `</section>`;
    };

    let banned = "";
    let allowed = "";

    if (currentKillerOverride != undefined) {
        const tierIndexes = [...new Set(isSurvivor ? currentKillerOverride.SurvivorBalanceTiers : currentKillerOverride.BalanceTiers)];
        for (const tierIndex of tierIndexes) {
            const tier = currentBalancing.Tiers[tierIndex];
            if (tier == undefined) { continue; }

            const tierName = tier.Name.trim();
            const isGeneral = tierName.toLowerCase() == "general";
            banned += section("", isGeneral ? "General" : tierName,
                isGeneral ? "Every killer" : `${killer.Name} is in ${tierName} for ${isSurvivor ? "survivor" : "killer"} perks`,
                perksOf(isSurvivor ? tier.SurvivorIndvPerkBans : tier.KillerIndvPerkBans),
                isSurvivor ? tier.SurvivorComboPerkBans : tier.KillerComboPerkBans,
                { tier: true, empty: "No bans." });
        }

        banned += section("", isSurvivor ? `Only vs ${killer.Name}` : `Only as ${killer.Name}`, "Set for this killer",
            perksOf(isSurvivor ? currentKillerOverride.SurvivorIndvPerkBans : currentKillerOverride.KillerIndvPerkBans),
            isSurvivor ? currentKillerOverride.SurvivorComboPerkBans : currentKillerOverride.KillerComboPerkBans,
            { empty: "No bans." });
    }

    // Perks added after the balancing was last updated are banned by default.
    const balancingDate = currentBalancing["Version"];
    const newPerks = balancingDate == undefined ? [] :
        Perks.filter(perk => perk.survivorPerk == isSurvivor && perk.dateAdded != undefined && new Date(perk.dateAdded) > new Date(balancingDate));
    if (newPerks.length > 0) {
        banned += section("", "New perks", "Added after the balancing was last updated · banned by default", newPerks, [], { labels: false });
    }

    if (currentKillerOverride != undefined) {
        if (!isSurvivor) {
            const killerAddons = KillerAddonsList[selectedKiller]?.Addons || [];
            const bannedRarities = currentKillerOverride.AddonTiersBanned || [];
            const individualBans = currentKillerOverride.IndividualAddonBans || [];
            const bannedAddons = killerAddons
                .filter(addon => bannedRarities.includes(addon.Rarity) || individualBans.includes(addon.globalID) || individualBans.includes(addon.Name))
                .filter(addon => matches(addon.Name));
            shown += bannedAddons.length;

            if (!query || bannedAddons.length > 0) {
                banned += `<section class="bansec"><h3>${EscapeHTML(killer.Name)} add-ons <small>${bannedRarities.length > 0 ? "Rarities banned: " + bannedRarities.map(rarity => RarityNames[rarity]).join(", ") : "No rarity banned"}</small></h3>` +
                    (bannedAddons.length > 0 ?
                        `<div class="bans">${bannedAddons.map(addon => cell(addon.Name, addon.addonIcon, bannedRarities.includes(addon.Rarity) ? RarityNames[addon.Rarity] : "")).join("")}</div>` :
                        `<p class="muted" style="margin:0">No add-ons banned.</p>`) +
                    `</section>`;
            }
        }

        if (whitelist.perks.length + whitelist.combos.length > 0) {
            allowed += section("ok", "Exceptions", `Allowed for ${killer.Name} even though a tier bans them`, perksOf(whitelist.perks), whitelist.combos, { allowed: true });
        }

        const cells = entries => `<div class="bans">${entries.map(entry => cell(entry.name, entry.icon, "", true)).join("")}</div>`;

        if (isSurvivor) {
            const items = (currentKillerOverride.ItemWhitelist || []).map(id => GetItemById(id)).filter(item => item != undefined && matches(item.Name));
            shown += items.length;
            if (!query || items.length > 0) {
                allowed += `<section class="bansec ok"><h3>Items</h3>${items.length > 0 ?
                    cells(items.map(item => ({ name: item.Name, icon: item.icon }))) :
                    `<p class="muted" style="margin:0">None. Survivors bring no items.</p>`}</section>`;
            }

            for (const [itemType, addonWhitelist] of Object.entries(currentKillerOverride.AddonWhitelist || {})) {
                const addons = (addonWhitelist.Addons || []).map(id => GetAddonById(itemType, id)).filter(addon => addon != undefined && matches(addon.Name));
                shown += addons.length;
                if (addons.length > 0) {
                    allowed += `<section class="bansec ok"><h3>${EscapeHTML(itemType)} add-ons</h3>${cells(addons.map(addon => ({ name: addon.Name, icon: addon.icon })))}</section>`;
                }
            }
        }

        const offerings = (isSurvivor ? currentKillerOverride.SurvivorOfferings : currentKillerOverride.KillerOfferings)
            .map(id => GetOfferingById(id)).filter(offering => offering != undefined && matches(offering.name));
        shown += offerings.length;
        if (!query || offerings.length > 0) {
            allowed += `<section class="bansec ok"><h3>Offerings</h3>${offerings.length > 0 ?
                cells(offerings.map(offering => ({ name: offering.name, icon: offering.icon }))) :
                `<p class="muted" style="margin:0">None.</p>`}</section>`;
        }
    }

    let notice = "";
    if (currentKillerOverride == undefined) {
        notice = `<p class="muted">Killer <b>${EscapeHTML(killer.Name)}</b> not found in current balancing!</p>`;
    } else if (query && shown == 0) {
        const perks = Perks.filter(perk => perk.survivorPerk == isSurvivor && perk.name.toLowerCase().includes(query)).slice(0, 3);
        notice = perks.length > 0 ?
            perks.map(perk => `<div class="allowed"><img src="${perk.icon}" alt=""><span><b>${EscapeHTML(perk.name)}</b> isn't banned ${isSurvivor ? "vs" : "as"} ${EscapeHTML(killer.Name)}.</span></div>`).join("") :
            `<p class="muted">Nothing matches "${EscapeHTML(query)}".</p>`;
    }

    document.getElementById("bans-list").innerHTML = notice +
        (banned ? `<div class="group neg"><h2 class="grouph bad">Banned <small>Everything listed here is not allowed ${isSurvivor ? "vs" : "as"} ${EscapeHTML(killer.Name)}</small></h2>${banned}</div>` : "") +
        (allowed ? `<div class="group"><h2 class="grouph ok">Allowed <small>Items, add-ons and offerings work the other way: only what's listed here may be brought</small></h2>${allowed}</div>` : "");

    document.getElementById("bans-tab-count").innerText = CountBannedPerks(currentKillerOverride, selectedRole);
}

/**
 * The number of perks banned for the role (tiers minus exceptions, plus the killer's own bans).
 */
function CountBannedPerks(killerOverride, role) {
    if (killerOverride == undefined) { return ""; }

    const banned = new Set();
    const whitelist = GetWhitelistedPerks(killerOverride, role).perks;

    for (const tierIndex of (role == 0 ? killerOverride.SurvivorBalanceTiers : killerOverride.BalanceTiers)) {
        const tier = currentBalancing.Tiers[tierIndex];
        if (tier == undefined) { continue; }

        (role == 0 ? tier.SurvivorIndvPerkBans : tier.KillerIndvPerkBans)
            .map(id => parseInt(id)).filter(id => !whitelist.includes(id)).forEach(id => banned.add(id));
    }
    (role == 0 ? killerOverride.SurvivorIndvPerkBans : killerOverride.KillerIndvPerkBans).forEach(id => banned.add(parseInt(id)));

    return banned.size;
}

/**
 * Keeps the address bar in sync with the loadout (the same "loadout" code as Export Loadout), so the page can be
 * shared or reloaded as it is. Custom balancings don't fit in a link, so then the address has no code.
 */
function UpdateShareURL() {
    if (!shareURLReady || currentBalancing == null) { return; }

    let newUrl = window.location.pathname;

    if (!customBalanceOverride && GetSelectedKillerOverride() != undefined) {
        const encodedText = encodeURIComponent(GetExportData());
        if (encodedText.length < maxImportURLLength) {
            newUrl += "?loadout=" + encodedText;
        }
    }

    window.history.replaceState({}, document.title, newUrl);
}
