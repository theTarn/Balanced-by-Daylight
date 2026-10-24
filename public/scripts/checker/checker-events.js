/*
Name:
    checker-events.js
Purpose:
    This file is designed for the purpose of handling all of the event setup for the balance checker.
    Many of the methods in this file are designed to only be called once. This is to prevent multiple event listeners from being added to the same element.
    Please see the method mapper for more information.
*/

function SetBalancingSelectButtonEvents() {
    const balancingSelectContainer = document.getElementById("balancing-select-container");
    const balanceSearchInput = document.getElementById("balancing-select-search-input");

    balanceSearchInput.addEventListener("input", function() {
        PopulateBalancingSelectMenuFromSearch(balanceSearchInput.value.toLowerCase());
    });

    document.getElementById("balancing-select-button").addEventListener("click", function() {
        OpenBalancingSelectMenu();
    });

    SetStaticDialogEvents("balancing-select-container");

    for (const tabButton of balancingSelectContainer.querySelectorAll("[data-balancing-tab]")) {
        tabButton.addEventListener("click", function() {
            ShowBalancingSelectTab(tabButton.dataset.balancingTab);
        });
    }

    document.getElementById("custom-balance-save-button").addEventListener("click", function() {
        ApplyCustomBalancing();
    });
}

/**
 * Opens the tournament dialog on its "Choose" tab.
 */
function OpenBalancingSelectMenu() {
    document.getElementById("balancing-select-container").hidden = false;

    const customBalanceInput = document.getElementById("custom-balance-select");
    const savedCustomBalancing = localStorage.getItem("currentBalancing");
    customBalanceInput.value = customBalanceOverride ?
        JSON.stringify(currentBalancing, null, 4) :
        (savedCustomBalancing ? JSON.stringify(JSON.parse(savedCustomBalancing), null, 4) : "");

    document.getElementById("custom-error").hidden = true;
    document.getElementById("custom-balance-save-button").innerText = customBalanceOverride ? "Save" : "Save & Use";

    ShowBalancingSelectTab("choose");
    PopulateBalancingSelectMenu();

    const balanceSearchInput = document.getElementById("balancing-select-search-input");
    balanceSearchInput.value = "";
    balanceSearchInput.focus();
}

/**
 * Shows the "choose" or "custom" tab of the tournament dialog.
 * @param {String} tab
 */
function ShowBalancingSelectTab(tab) {
    document.getElementById("balancing-choose-tab").hidden = tab != "choose";
    document.getElementById("balancing-custom-tab").hidden = tab != "custom";

    for (const tabButton of document.querySelectorAll("[data-balancing-tab]")) {
        tabButton.setAttribute("aria-selected", tabButton.dataset.balancingTab == tab);
    }
}

/**
 * Switches to a balancing preset (and away from a custom balancing).
 * @param {Number} presetID
 */
function SelectBalancingPreset(presetID) {
    document.getElementById("balancing-select-container").hidden = true;

    currentBalancingIndex = presetID;
    localStorage.setItem("currentBalancingIndex", currentBalancingIndex);

    customBalanceOverride = false;
    localStorage.setItem("customBalanceOverride", customBalanceOverride);

    TryLoadBalanceProfileFromPresetID(currentBalancingIndex,
        function() {
            TrySetCurrentBalancing();
        },
        function() {
            console.error("Could not set balancing!")
        }
    );

    if (!ValidateCustomBalancing(GetBalancePresetByID(currentBalancingIndex)["Balancing"])) {
        GenerateAlertModal(
            "Error",
            "This default balance profile is invalid, selecting the default balance profile. Please report this to the GitHub issues page or the Discord server.",
            function() {
                currentBalancingIndex = 0;
                localStorage.setItem("currentBalancingIndex", currentBalancingIndex);

                alert("Balance profile reset to default. Close this alert to continue.");

                // Refresh the page
                location.reload();
            }
        )
    }
    currentBalancing = GetBalancePresetByID(currentBalancingIndex)["Balancing"];

    OnBalancingChanged();
}

/**
 * Validates the JSON in the custom balancing tab and, if it is valid, checks against it from now on.
 */
function ApplyCustomBalancing() {
    const customBalanceInput = document.getElementById("custom-balance-select");
    const customError = document.getElementById("custom-error");

    let customBalanceObj = undefined;
    try {
        customBalanceObj = JSON.parse(customBalanceInput.value);
    } catch (error) {
        customError.hidden = false;
        customError.innerHTML = "The JSON used is not valid JSON. You can validate your JSON <a href='https://jsonlint.com/' target='_blank'>here</a>.";
        return;
    }

    if (!ValidateCustomBalancing(customBalanceObj)) {
        customError.hidden = false;
        customError.innerHTML = "The JSON used is valid JSON, but is not in the correct format. Please refer to the balance creator to generate the correct format.";
        return;
    }

    const wasCustom = customBalanceOverride;

    currentBalancing = customBalanceObj;
    customBalanceOverride = true;
    localStorage.setItem("customBalanceOverride", customBalanceOverride);
    localStorage.setItem("currentBalancing", JSON.stringify(currentBalancing));

    document.getElementById("balancing-select-container").hidden = true;

    OnBalancingChanged(wasCustom ? `Saved "${currentBalancing["Name"]}".` : `Saved. Checking against "${currentBalancing["Name"]}".`);
}

/**
 * Updates everything that depends on the balancing after it changed.
 * @param {String} savedMessage A notice to show (e.g. after saving a custom balancing), or undefined.
 */
function OnBalancingChanged(savedMessage = undefined) {
    if (!AreKillerAddonsValid()) {
        KillerAddons = [undefined, undefined];
    }

    UpdateBalanceSelectionUI();
    UpdateKillerSelectionUI();
    UpdateAntiFacecampUI();
    CheckForBalancingErrors();

    const killerNotice = GetKillerAvailabilityNotice();
    if (savedMessage != undefined) {
        ShowNotice(killerNotice ? `${savedMessage} ${killerNotice}` : savedMessage, killerNotice ? "error" : "success");
    } else if (killerNotice) {
        ShowNotice(killerNotice, "error");
    }
}

/**
 * Returns a notice when the selected killer is not in the balancing or is disabled in it, otherwise null.
 * @returns {String}
 */
function GetKillerAvailabilityNotice() {
    const currentName = Killers[selectedKiller].Name;
    const currentKillerOverride = currentBalancing.KillerOverride[selectedKiller];

    if (currentKillerOverride == undefined) {
        return `Killer ${currentName} not found in current balancing! Please select a different killer or change the balancing. Validation won't work.`;
    }

    if (currentKillerOverride.IsDisabled) {
        return `Killer ${currentName} is disabled in the current balancing! You may still select this killer, but they may be ineligible to play in official matches.`;
    }

    return null;
}

/**
 * Responsible for setting the event for the role swap button. As a result, should only ever be called once.
 */
function LoadRoleSwapEvents() {
    for (const roleButton of document.querySelectorAll(".rolestep [data-role]")) {
        roleButton.addEventListener("click", function() {
            let newRole = parseInt(roleButton.dataset.role);
            if (newRole == selectedRole) { return; }

            DebugLog("Commencing role swap!");

            selectedRole = newRole;

            localStorage.setItem("selectedRole", selectedRole);

            UpdateRoleSwapIcon();
            UpdateRoleSelectionHeaderUI();
            UpdatePerkUI();
            CheckForBalancingErrors();
            UpdateKillerSelectionUI();
            ShowCheckerTab("loadout");
        });
    }
}

/**
 * Sets up the event to clear a build loadout and attaches it to the clear loadout button. Should only ever be called once.
 */
function LoadClearLoadoutButton() {
    let clearLoadoutButton = document.getElementById("clear-loadout-button");

    clearLoadoutButton.addEventListener("click", function() {
        if (selectedRole == 0) {
            ClearSurvivorPerks();
            ClearSurvivorOfferings();
            ClearSurvivorItems();
            ClearSurvivorAddons();

            if (Config.saveBuilds && saveLoadoutsAndKiller) {
                localStorage.setItem("SurvivorPerks", JSON.stringify(SurvivorPerks));
                localStorage.setItem("SurvivorOfferings", JSON.stringify(SurvivorOfferings));
                localStorage.setItem("SurvivorItems", JSON.stringify(SurvivorItems));
                localStorage.setItem("SurvivorAddons", JSON.stringify(SurvivorAddons));
            }
        } else {
            ClearKillerPerks();

            KillerOffering = undefined;
            
            ClearKillerAddons();

            if (Config.saveBuilds && saveLoadoutsAndKiller) {
                localStorage.setItem("KillerPerks", JSON.stringify(KillerPerks));
                localStorage.setItem("KillerOffering", "undefined");
                localStorage.setItem("KillerAddons", JSON.stringify(KillerAddons));
            }
        }

        UpdatePerkUI();
        CheckForBalancingErrors();
    });
}

/**
 * Responsible for setting the event listeners for the import and export buttons. As a result, should only ever be called once.
 */
function LoadImportEvents() {
    let importButton = document.getElementById("import-button");
    let exportButton = document.getElementById("export-button");

    const fileInput = document.getElementById("import-image")
    const dropZone = document.getElementById("modal-import-drop-zone")


    importButton.addEventListener("click", () => {
        document.getElementById("modal-import-container").hidden = false
    })

    document.getElementById("modal-import-cancel-button").addEventListener("click", function() {
        document.getElementById("modal-import-container").hidden = true
    })

    SetStaticDialogEvents("modal-import-container")

    dropZone.addEventListener("click", () => {
        document.getElementById("import-image").click()
    })
    dropZone.addEventListener("dragover", (e) => {
        e.preventDefault()
        dropZone.classList.add("dragover")
    })
    dropZone.addEventListener("dragleave", () => {
        dropZone.classList.remove("dragover")
    })

    function getItemUrl(dataTransfer){
        const items = Array.from(dataTransfer.items)

        const plain  = items.find(item => item.type == "text/plain")
        if(plain ) return plain 

        const mozUrl = items.find(item => item.type == "text/x-moz-url")
        if(mozUrl) return mozUrl

        return items.length > 0 ? items[0] : null
    }

    dropZone.addEventListener("drop", (e) => {
        e.preventDefault()
        dropZone.classList.remove("dragover")
        
        if(e.dataTransfer.files.length > 0){
            fileInput.files = e.dataTransfer.files
            fileInput.dispatchEvent(new Event("change"))
        }else{
            const item = getItemUrl(e.dataTransfer)
            if(item.kind == "string") {
                item.getAsString(async (str) => {
                    let url = str
                    const match = str.match(/src="(.+?)"/)
                    if(match) url = match[1]

                    try {
                        const res = await fetch(`/imageProxy?url=${encodeURIComponent(url)}`)
                        const blob = await res.blob()
                        const file = new File([blob], "image.png", { type: blob.type })
                        
                        const dataTransfer = new DataTransfer()
                        dataTransfer.items.add(file)
                        fileInput.files = dataTransfer.files
                        fileInput.dispatchEvent(new Event("change"))
                    } catch (err) {
                        console.error("Error trying to get image", err)
                    }
                })
            }
        }
    })
    
    document.getElementById("import-image").addEventListener("change", async function(event){
        document.getElementById("modal-import-container").hidden = true

        const file = event.target.files[0]
        console.log("file targeting done")
        if(!file) {
            console.log("file error");
            GenerateAlertModal("Error", "An error occurred while importing your image.")
            console.error("Error importing image: " + this.status)
            return;
        }

        console.log("no error")

        GenerateAlertModal("Importing Image...", "Please wait while your loadout image is importing...", undefined, false, true);

        console.log("modal generated");
        
        const formData = new FormData()
        formData.append("image", file)

        var xhttp = new XMLHttpRequest()

        if(xhttp.readyState !== 4){
            xhttp.abort()
        }
        xhttp.responseType = "json"

        xhttp.onreadystatechange = function(){
            if(this.readyState == 4){
                document.getElementById("alert-container").hidden = true

                switch(this.status){
                    case 200:
                        const result = this.response
                        console.log("Image Extractor:", result)

                        let survCpt = 0
                        for(const loadout of result.survLoadouts){
                            let cpt = 0
                            for(const perk of loadout.perks){
                                if(perk == "blank.png"){
                                    SurvivorPerks[survCpt][cpt] = undefined
                                }else{
                                    SurvivorPerks[survCpt][cpt] = GetPerkByPNGFileName(perk)
                                }
                                cpt++
                            }

                            if(loadout.offering == "blank.png"){
                                SurvivorOfferings[survCpt] = undefined
                            }else{
                                SurvivorOfferings[survCpt] = GetOfferingByPNGFileName(loadout.offering)
                            }

                            if(loadout.item == "blank.png"){
                                SurvivorItems[survCpt] = undefined
                                SurvivorAddons[survCpt][0] = undefined
                                SurvivorAddons[survCpt][1] = undefined
                            }else{
                                SurvivorItems[survCpt] = GetItemByPNGFileName(loadout.item)

                                cpt = 0
                                for(const addon of loadout.addons){
                                    if(addon == "blank.png"){
                                        SurvivorAddons[survCpt][cpt] = undefined
                                    }else{
                                        SurvivorAddons[survCpt][cpt] = GetAddonByPNGFileName(addon, SurvivorItems[survCpt].Type)
                                    }
                                    cpt++
                                }
                            }

                            survCpt++
                        }

                        let estimatedKillerChoice = result.killer;
                        
                        let finalChoice = TryGetKillerByNameApproximation(estimatedKillerChoice);
                        
                        if (importKillerChoice) {
                            SetSelectedKillerByName(finalChoice["Name"]);
                        }



                        if (Config.saveBuilds && saveLoadoutsAndKiller) {
                            localStorage.setItem("SurvivorPerks", JSON.stringify(SurvivorPerks));
                            localStorage.setItem("SurvivorOfferings", JSON.stringify(SurvivorOfferings));
                            localStorage.setItem("SurvivorItems", JSON.stringify(SurvivorItems));
                            localStorage.setItem("SurvivorAddons", JSON.stringify(SurvivorAddons));
                        }

                        UpdatePerkUI()
                        CheckForBalancingErrors()

                        document.getElementById("import-image").value = "";
                    break
                    default:
                        GenerateAlertModal("Error", "An error occurred while importing your image.")
                        console.error("Error importing image: " + this.status)
                }
            }
        }

        xhttp.open("POST", "/image-extractor", true);
        xhttp.send(formData);
    })

    exportButton.addEventListener("click", function() {
        const compressedText = GetExportData();

        let textToCopy = compressedText;

        // Determine whether it is short enough to be a URL encoded.
        const encodedText = encodeURIComponent(compressedText);
        let isURL = false;
        if (encodedText.length < maxImportURLLength) {
            let url = window.location.href.split("?")[0] + "?loadout=" + encodedText;
            textToCopy = url;

            isURL = true;
        }

        // Copy exportData to clipboard
        var wasErr = false;
        try {
            if (isURL) {
                navigator.clipboard.writeText(textToCopy);
            } else {
                throw error;
            }
        } catch (error) {
            wasErr = true;
        }

        if (!wasErr) {
            if (isURL) {
                GenerateAlertModal(
                    "Exported as URL and Copied!",
                    `Your import code has been copied as a link to your clipboard. Share this link and others can directly import it!<br><br>Import URL:<br> <b><span class='import-code-preview'>${textToCopy}</span></b>`
                );
            }
            return;
        }

        if (isURL) {
            GenerateAlertModal(
                "Exported as URL",
                `Your import code has been generated as a URL, but copying to the clipboard was unsuccessful. Please copy the URL manually.<br><br>Import URL:<br> <b><span class='import-code-preview'>${textToCopy}</span></b>`
            );
        } else {
            GenerateAlertModal(
                "Export Unsuccessful",
                `Exporting this loadout as a URL was unsuccessful due to its size. It is likely custom balancing is enabled and causing the issue.<br><br>Please consider using an official balancing preset to use the exporting feature.`
            );
        }
    });
}

/**
 * Responsible for setting the event listener for the Generate Image button. As a result, should only ever be called once.
 */
function LoadImageGenEvents() {
    const genImgButton = document.getElementById("generate-image-button");

    genImgButton.addEventListener("click", function() {
        GenerateImageFromButtonPress();
    });
}

/**
 * Sets the character select event for every killer portrait. As a result, should only ever be called once.
 */
function SetKillerCharacterSelectEvents() {
    var GetCharacterSelectButtons = document.getElementsByClassName("character-select-button");

    for (var i = 0; i < GetCharacterSelectButtons.length; i++) {
        let newIndex = i;
        let currentButton = GetCharacterSelectButtons[newIndex];

        let currentName = Killers[newIndex].Name;
        currentButton.addEventListener("click", function() {
            let currentKlr = selectedKiller;
            DebugLog(newIndex);
            DebugLog(currentName);

            document.getElementById("balance-character-select-container").hidden = true;

            selectedKiller = newIndex;
            localStorage.setItem("selectedKiller", selectedKiller);

            if (currentKlr != selectedKiller) {
                if (selectedRole != 0) {
                    ClearKillerAddons();
                }

                const killerNotice = GetKillerAvailabilityNotice();
                if (killerNotice) {
                    ShowNotice(killerNotice, "error");
                }
            }

            if (!AreKillerAddonsValid()) {
                DebugLog("Reset killer addons as they are not valid for the selected killer.");
                KillerAddons = [undefined, undefined];
            }

            CheckIndividualKillerNotes(); // If the setting is enabled, marks new notes for the selected killer.

            CheckForBalancingErrors();
            UpdateKillerSelectionUI();
            UpdateAntiFacecampUI();
            ShowCheckerTab("loadout");
        });
    }

    document.getElementById("killer-select-button").addEventListener("click", function() {
        document.getElementById("balance-character-select-container").hidden = false;

        const killerSearchInput = document.getElementById("killer-search-input");
        killerSearchInput.value = "";
        FilterKillerPortraits("");
        killerSearchInput.focus();

        ScrollToSelectedKiller();
    });

    SetStaticDialogEvents("balance-character-select-container");

    document.getElementById("killer-search-input").addEventListener("input", function(event) {
        FilterKillerPortraits(event.target.value);
    });

    const hideDisabledCheckbox = document.getElementById("hide-disabled-killers");
    hideDisabledCheckbox.addEventListener("change", function() {
        SetHideDisabledKillers(hideDisabledCheckbox.checked);
    });
}

/**
 * Responsible for setting the events for the settings menu, including the checkboxes. As a result, should only ever be called once.
 */
function LoadSettingsEvents() {
    const settingsContainer = document.getElementById("settings-container");

    document.getElementById("settings-button").addEventListener("click", function() {
        settingsContainer.hidden = false;
        ResetClearSettingsConfirmation();
    });

    SetStaticDialogEvents("settings-container");

    const onlyNonBannedCheckbox = document.getElementById("only-non-banned");
    onlyNonBannedCheckbox.addEventListener("change", function(){
        SetOnlyShowNonBanned(onlyNonBannedCheckbox.checked);
    })

    const hideDisabledCheckbox = document.getElementById("hide-disabled-killers-setting");
    hideDisabledCheckbox.addEventListener("change", function() {
        SetHideDisabledKillers(hideDisabledCheckbox.checked);
    });

    const autoShowNotesCheckbox = document.getElementById("auto-show-notes");
    autoShowNotesCheckbox.addEventListener("change", function(){
        showNotesOnLaunch = autoShowNotesCheckbox.checked;
        localStorage.setItem("showNotesOnLaunch", showNotesOnLaunch);

        UpdateNotesTabMark();
    })

    const saveLoadoutsKillerCheckbox = document.getElementById("save-loadouts-killer");
    saveLoadoutsKillerCheckbox.addEventListener("change", function(){
        saveLoadoutsAndKiller = saveLoadoutsKillerCheckbox.checked;
        localStorage.setItem("saveLoadoutsAndKiller", saveLoadoutsAndKiller);
        
        localStorage.setItem("SurvivorPerks", JSON.stringify(SurvivorPerks));
        localStorage.setItem("selectedKiller", selectedKiller);
    })

    const loadKillerChoiceImportCheckbox = document.getElementById("import-killer-choice-input");
    loadKillerChoiceImportCheckbox.addEventListener("change", function() {
        importKillerChoice = loadKillerChoiceImportCheckbox.checked;
        localStorage.setItem("importKillerChoice", importKillerChoice);        
    })

    document.getElementById("settings-clear-confirm").addEventListener("click", function(event) {
        if (event.target.closest("#settings-clear-storage-button")) {
            event.currentTarget.innerHTML = "Are you sure you want to clear your local storage? This will delete all of your settings including saved custom balancing. " +
                "<button type='button' class='btn danger' data-clear-yes>Clear Settings</button><button type='button' class='btn' data-clear-no>Cancel</button>";
        }
        if (event.target.closest("[data-clear-no]")) {
            ResetClearSettingsConfirmation();
        }
        if (event.target.closest("[data-clear-yes]")) {
            localStorage.clear();
            location.reload();
        }
    });
}

function ResetClearSettingsConfirmation() {
    document.getElementById("settings-clear-confirm").innerHTML = "<button type='button' id='settings-clear-storage-button' class='btn danger'>Clear Settings</button>";
}

/**
 * Sets the "only show allowed" option, used by the search (also available as a checkbox in the search dialog).
 * @param {Boolean} enabled
 */
function SetOnlyShowNonBanned(enabled) {
    onlyShowNonBanned = enabled;
    localStorage.setItem("onlyShowNonBanned", onlyShowNonBanned);

    document.getElementById("only-non-banned").checked = enabled;
    document.getElementById("only-non-banned-search").checked = enabled;
}

/**
 * Sets the "hide disabled killers" option of the killer selection.
 * @param {Boolean} enabled
 */
function SetHideDisabledKillers(enabled) {
    hideDisabledKillers = enabled;
    localStorage.setItem("hideDisabledKillers", hideDisabledKillers);

    document.getElementById("hide-disabled-killers").checked = enabled;
    document.getElementById("hide-disabled-killers-setting").checked = enabled;
    document.getElementById("character-select-grid").classList.toggle("hide-disabled", enabled);
}

/**
 * Responsible for setting the events for the Survivor perks. This also includes offerings, items, and add-ons. Essentially sets it so the search window is capable of displaying the proper data.
 */
function LoadSurvivorPerkSelectionEvents() {
    // Set on-click for perk selection
    var perks = document.getElementsByClassName("perk-slot");

    for (var i = 0; i < perks.length; i++) {
        let currentPerk = perks[i];

        currentPerk.addEventListener("click", function() {
            DebugLog(`Clicked on perk ${currentPerk.dataset.perkID} for survivor ${currentPerk.dataset.survivorID}`);
            var perkSearchContainer = document.getElementById("perk-search-container");
            perkSearchContainer.hidden = false;
            perkSearchContainer.classList.add("intro-blur-animation-class-0p5s");
            
            var perkSearchModule = document.getElementById("perk-search-module-container");
            
            
            perkSearchModule.style.left = "50%";
            perkSearchModule.style.top = "50%";

            perkSearchContainer.dataset.targetSurvivor = currentPerk.dataset.survivorID;
            perkSearchContainer.dataset.targetPerk = currentPerk.dataset.perkID;
            perkSearchContainer.dataset.searchType = "perk";

            // Get perk search input
            var perkSearchInput = document.getElementById("perk-search-bar");
            perkSearchInput.value = "";
            perkSearchInput.focus();

            var perkTooltip = document.getElementById("perk-highlight-name");

            perkTooltip.innerText = "Select a Perk...";
            
            // Reset search results
            ForcePerkSearch(perkSearchInput, "");
        });
    }

    var offerings = document.getElementsByClassName("offering-slot");
    for (var i = 0; i < offerings.length; i++) {
        let currentOffering = offerings[i];

        currentOffering.addEventListener("click", function() {
            DebugLog(`Clicked on offering for survivor ${currentOffering.dataset.survivorID}`);

            var perkSearchContainer = document.getElementById("perk-search-container");
            perkSearchContainer.hidden = false;
            perkSearchContainer.classList.add("intro-blur-animation-class-0p5s");

            var perkSearchModule = document.getElementById("perk-search-module-container");
            perkSearchModule.style.left = "50%";
            perkSearchModule.style.top = "50%";

            perkSearchContainer.dataset.targetSurvivor = currentOffering.dataset.survivorID;
            perkSearchContainer.dataset.searchType = "offering";

            // Get perk search input
            var perkSearchInput = document.getElementById("perk-search-bar");
            perkSearchInput.value = "";
            perkSearchInput.focus();

            var perkTooltip = document.getElementById("perk-highlight-name");

            perkTooltip.innerText = "Select an Offering...";

            // Reset search results
            ForceOfferingSearch(perkSearchInput, "");
        });
    }

    var items = document.getElementsByClassName("item-slot");
    for (var i = 0; i < items.length; i++) {
        let currentItem = items[i];

        currentItem.addEventListener("click", function() {
            DebugLog(`Clicked on item for survivor ${currentItem.dataset.survivorID}`);

            var perkSearchContainer = document.getElementById("perk-search-container");
            perkSearchContainer.hidden = false;
            perkSearchContainer.classList.add("intro-blur-animation-class-0p5s");

            var perkSearchModule = document.getElementById("perk-search-module-container");
            perkSearchModule.style.left = "50%";
            perkSearchModule.style.top = "50%";

            perkSearchContainer.dataset.targetSurvivor = currentItem.dataset.survivorID;
            perkSearchContainer.dataset.searchType = "item";

            // Get perk search input
            var perkSearchInput = document.getElementById("perk-search-bar");
            perkSearchInput.value = "";
            perkSearchInput.focus();

            var perkTooltip = document.getElementById("perk-highlight-name");

            perkTooltip.innerText = "Select an Item...";

            // Reset search results
            ForceItemSearch(perkSearchInput, "")
        });
    }

    var addons = document.getElementsByClassName("addon-slot");
    for (var i = 0; i < addons.length; i++) {
        let currentAddon = addons[i];
        let currentAddonIndex = currentAddon.dataset.survivorID; // Get the survivor index
    
        currentAddon.addEventListener("click", function() {
            const currentSurvivorItem = SurvivorItems[currentAddonIndex];

            if (currentSurvivorItem == undefined) {
                GenerateAlertModal("No Item Selected", "Please select an item before selecting addons.");
                return;
            }
            const itemType = currentSurvivorItem["Type"];

            DebugLog(`Clicked on addon ${currentAddon.innerText} for survivor ${currentAddon.dataset.survivorID}`);

            var perkSearchContainer = document.getElementById("perk-search-container");
            perkSearchContainer.hidden = false;
            perkSearchContainer.classList.add("intro-blur-animation-class-0p5s");

            var perkSearchModule = document.getElementById("perk-search-module-container");
            perkSearchModule.style.left = "50%";
            perkSearchModule.style.top = "50%";

            perkSearchContainer.dataset.targetSurvivor = currentAddon.dataset.survivorID;
            perkSearchContainer.dataset.itemType = itemType;
            perkSearchContainer.dataset.addonSlot = currentAddon.dataset.addonSlot;
            perkSearchContainer.dataset.searchType = "addon";

            // Get perk search input
            var perkSearchInput = document.getElementById("perk-search-bar");
            perkSearchInput.value = "";
            perkSearchInput.focus();

            var perkTooltip = document.getElementById("perk-highlight-name");

            perkTooltip.innerText = "Select an Addon...";

            // Reset search results
            ForceAddonSearch(perkSearchInput, "");
        });
    }

}

/**
 * Responsible for setting the events for the Killer perks. This also includes the offering and add-ons. Essentially sets it so the search window is capable of displaying the proper data.
 */
function LoadKillerPerkSelectionEvents() {
    // Set on-click for perk selection
    var perks = document.getElementsByClassName("killer-perk-slot");

    for (var i = 0; i < perks.length; i++) {
        let currentPerk = perks[i];
        DebugLog(currentPerk);

        currentPerk.addEventListener("click", function() {
            let curKillerName = Killers[selectedKiller].Name;
            DebugLog(`Clicked on perk ${currentPerk.dataset.perkID} for killer ${curKillerName}`);
            
            var perkSearchContainer = document.getElementById("perk-search-container");
            perkSearchContainer.hidden = false;
            perkSearchContainer.classList.add("intro-blur-animation-class-0p5s");

            var perkSearchModule = document.getElementById("perk-search-module-container");

            perkSearchModule.style.left = "50%";
            perkSearchModule.style.top = "50%";

            perkSearchContainer.dataset.targetKiller = selectedKiller;
            perkSearchContainer.dataset.targetPerk = currentPerk.dataset.perkID;
            perkSearchContainer.dataset.searchType = "perk";

            // Get perk search input
            var perkSearchInput = document.getElementById("perk-search-bar");
            perkSearchInput.value = "";
            perkSearchInput.focus();

            var perkTooltip = document.getElementById("perk-highlight-name");

            perkTooltip.innerText = "Select a Perk...";

            // Reset search results
            ForcePerkSearch(perkSearchInput, "");
        });
    }

    var offering = document.getElementById("killer-offering-slot");

    offering.addEventListener("click", function() {
        DebugLog("Clicked on killer offering slot!");

        var perkSearchContainer = document.getElementById("perk-search-container");
        perkSearchContainer.hidden = false;
        perkSearchContainer.classList.add("intro-blur-animation-class-0p5s");

        var perkSearchModule = document.getElementById("perk-search-module-container");
        perkSearchModule.style.left = "50%";
        perkSearchModule.style.top = "50%";

        perkSearchContainer.dataset.targetKiller = selectedKiller;
        perkSearchContainer.dataset.searchType = "offering";

        // Get perk search input
        var perkSearchInput = document.getElementById("perk-search-bar");
        perkSearchInput.value = "";
        perkSearchInput.focus();

        var perkTooltip = document.getElementById("perk-highlight-name");

        perkTooltip.innerText = "Select an Offering...";

        // Reset search results
        ForceOfferingSearch(perkSearchInput, "");
    });

    var addons = document.getElementsByClassName("killer-addon-slot");

    if (addons.length != 2) {
        console.error("Killer addon slots != 2! This should never happen!");
        return;
    }

    for (var i = 0; i < addons.length; i++) {
        let currentAddonElement = addons[i];

        currentAddonElement.addEventListener("click", function() {
            DebugLog(`Clicked on addon ${currentAddonElement.innerText} for killer ${Killers[selectedKiller].Name}`);

            var perkSearchContainer = document.getElementById("perk-search-container");
            perkSearchContainer.hidden = false;
            perkSearchContainer.classList.add("intro-blur-animation-class-0p5s");

            var perkSearchModule = document.getElementById("perk-search-module-container");
            perkSearchModule.style.left = "50%";
            perkSearchModule.style.top = "50%";

            perkSearchContainer.dataset.targetKiller = selectedKiller;
            perkSearchContainer.dataset.addonSlot = currentAddonElement.dataset.addonSlot;
            perkSearchContainer.dataset.searchType = "killer-addon";

            // Get perk search input
            var perkSearchInput = document.getElementById("perk-search-bar");
            perkSearchInput.value = "";
            perkSearchInput.focus();

            var perkTooltip = document.getElementById("perk-highlight-name");

            perkTooltip.innerText = "Select an Addon...";

            // Reset search results
            ForceKillerAddonSearch(perkSearchInput, "");
        });
    }

}

/**
 * Sets up the events for the search menu and what will result in the window closing. This also sets up the event mainly for the search bar. As a result, should only ever be called once.
 */
function LoadPerkSearchEvents() {
    const perkSearchContainer = document.getElementById("perk-search-container");

    // Code to exit search menu: picking a result, the close button or a click outside the dialog
    perkSearchContainer.addEventListener("click", function(event) {
        if (event.target === perkSearchContainer ||
            event.target.closest("[data-close]") ||
            event.target.closest(".perk-slot-result, .item-slot-result")) {
            perkSearchContainer.hidden = true;
        }
    });
    document.addEventListener("keydown", function(event) {
        if (event.key === "Escape") { perkSearchContainer.hidden = true; }
    });

    const perkSearchBar = document.getElementById("perk-search-bar");

    // Code to start search
    perkSearchBar.addEventListener("input", function() {
        RunPerkSearch();
    });

    const onlyNonBannedCheckbox = document.getElementById("only-non-banned-search");
    onlyNonBannedCheckbox.addEventListener("change", function() {
        SetOnlyShowNonBanned(onlyNonBannedCheckbox.checked);
        RunPerkSearch();
    });
}

/**
 * Runs the search for the type of slot the search dialog was opened for.
 */
function RunPerkSearch() {
    const perkSearchContainer = document.getElementById("perk-search-container");
    const perkSearchBar = document.getElementById("perk-search-bar");

    // Get search type from dataset
    var searchType = perkSearchContainer.dataset.searchType;

    switch (searchType) {
        case "perk":
            ForcePerkSearch(perkSearchBar, perkSearchBar.value);
            break;
        case "offering":
            ForceOfferingSearch(perkSearchBar, perkSearchBar.value);
            break;
        case "item":
            ForceItemSearch(perkSearchBar, perkSearchBar.value);
            break;
        case "addon":
            ForceAddonSearch(perkSearchBar, perkSearchBar.value);
            break;
        case "killer-addon":
            ForceKillerAddonSearch(perkSearchBar, perkSearchBar.value);
            break;
    }
}

/**
 * Applies the related selection events to the option node.
 * 
 * It then returns the updated node (as JS is pass-by-value (unfortunately))
 * @param {Node} optionNode The node to have the events applied to.
 * @param {Number} presetIndex The index of the balance preset in the BalancePresets array.
 */
function ApplyBalancingOptionEvents(optionNode, presetIndex) {
    if (optionNode == undefined) { return null; }

    optionNode.addEventListener("click", function() {
        SelectBalancingPreset(optionNode.dataset.balancePresetID);
    });

    return optionNode;
}
