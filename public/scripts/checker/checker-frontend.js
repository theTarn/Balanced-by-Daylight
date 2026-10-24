/*
Name:
    checker-frontend.js
Purpose:
    This file is designed for the purpose of handling all frontend changes and housing those related methods.
*/

/**
 * Updates the selected role header text depending on whether Survivor or Killer builds are selected.
 */
function UpdateRoleSelectionHeaderUI() {
    const header = document.getElementById("selected-role-header");
    header.innerText = selectedRole == 0 ? "Survivor Builds" : "Killer Build";

    const killerName = Killers[selectedKiller].Name;
    document.getElementById("selected-role-subtitle").innerText = selectedRole == 0 ? `vs ${killerName}` : killerName;
    document.getElementById("killer-build-name").innerText = killerName.replace(/^The /, "");
}

/**
 * Responsible for showing/hiding the builds container depending on the role selected and triggering their associated update methods.
 */
function UpdatePerkUI() {
    if (selectedRole == 0) {
        document.getElementById("survivor-builds-container").classList.remove("hide-component");
        document.getElementById("killer-builds-container").classList.add("hide-component");
        
        UpdateSurvivorPerkUI();
    } else {
        document.getElementById("killer-builds-container").classList.remove("hide-component");
        document.getElementById("survivor-builds-container").classList.add("hide-component");

        UpdateKillerPerkUI();
    }
}

/**
 * Responsible for building and displaying the survivor perk loadout UI. It starts by setting basic padding, then looping through all of the build component children to apply the perk icons and events (such as drag/drop). It also applies Offerings, Items, and Add-Ons. At the end it calls LoadPerkSelectionEvents().
 */
let dragTargetElement, dragSourceElement = {}
function UpdateSurvivorPerkUI() {
    // Get the build components (one per survivor)
    var children = document.querySelectorAll("#survivor-builds-container .survivor-build-component");

    // Loop through all children
    validChildI = 0;
    for (var i = 0; i < children.length; i++) {
        let currentChild = children[i];
        currentChild.innerHTML = "";

        // Get current survivor perks
        let currentSurvivorPerks = SurvivorPerks[validChildI];

        // Loop through all perks
        for (var j = 0; j < currentSurvivorPerks.length; j++) {
            let currentPerk = currentSurvivorPerks[j];

            //DebugLog(`${j}/${i} - Current Perk: ${currentPerk}`);

            ImgSrc = "";
            try {
                ImgSrc = currentPerk["icon"];
            } catch (error) {
                ImgSrc = "public/Perks/blank.webp";
            }
            
            let perkElement = document.createElement("div");
            perkElement.classList.add("perk-slot");
            perkElement.classList.add("loadout-slot");
            perkElement.classList.add("survivor-perk-slot");

            perkElement.addEventListener("dragstart", function(event) {
                event.dataTransfer.effectAllowed = "move"
                dragSourceElement, dragTargetElement = {}
                dragTargetElement.draggable = 0

                dragSourceElement.sourceSurv = event.target.parentElement.dataset.survivorID
                dragSourceElement.sourcePerkSlot = event.target.parentElement.dataset.perkID
                dragSourceElement.sourcePerkId = GetPerkIdByFileName(event.target.getAttribute("src"))
            });
            perkElement.addEventListener("dragover", function(event) {
                event.preventDefault()
                event.dataTransfer.dropEffect = "move"
            });
            perkElement.addEventListener("dragenter", function(event) {
                event.preventDefault()
                dragTargetElement.targetSurv = event.target.parentElement.dataset.survivorID
                dragTargetElement.targetPerkSlot = event.target.parentElement.dataset.perkID
                dragTargetElement.targetPerkId = GetPerkIdByFileName(event.target.getAttribute("src"))
                dragTargetElement.draggable++
            });
            perkElement.addEventListener("dragleave", function(event) {
                event.preventDefault()
                dragTargetElement.draggable--
            });
            perkElement.addEventListener("dragend", function(event) {
                event.preventDefault()

                let sourceSurv = parseInt(dragSourceElement.sourceSurv)
                let sourcePerkSlot = parseInt(dragSourceElement.sourcePerkSlot)
                let sourcePerkId = dragSourceElement.sourcePerkId

                if(dragTargetElement.draggable <= 0) { // If we're not dragging over a valid element, remove the perk
                    SurvivorPerks[sourceSurv][sourcePerkSlot] = null
                } else {
                    
                    let newSourcePerk = null;
                    if (dragTargetElement.targetPerkId != null) {
                        newSourcePerk = GetPerkById(dragTargetElement.targetPerkId)
                    }
                    SurvivorPerks[sourceSurv][sourcePerkSlot] = newSourcePerk

                    let targetSurv = parseInt(dragTargetElement.targetSurv)
                    let targetPerkSlot = parseInt(dragTargetElement.targetPerkSlot)
                    
                    let newTargetPerk = null
                    if (sourcePerkId != null) {
                        newTargetPerk = GetPerkById(sourcePerkId)
                    }
                    SurvivorPerks[targetSurv][targetPerkSlot] = newTargetPerk
                }

                if (Config.saveBuilds && saveLoadoutsAndKiller) {
                    localStorage.setItem("SurvivorPerks", JSON.stringify(SurvivorPerks));
                }
                UpdatePerkUI()
                CheckForBalancingErrors()

                event.dataTransfer.clearData();
            });

            perkElement.dataset.survivorID = validChildI;
            perkElement.dataset.perkID = j;
            perkElement.dataset.name = currentPerk ? currentPerk["name"] : "";

            let perkImg = document.createElement("img");
            perkImg.src = ImgSrc;
        
            perkElement.appendChild(perkImg);
            currentChild.appendChild(perkElement);
        }

        // Get current survivor offerings
        let currentSurvivorOffering = SurvivorOfferings[validChildI];

        // Create offering element
        let offeringElement = document.createElement("div");
        offeringElement.classList.add("offering-slot");
        offeringElement.classList.add("loadout-slot");
        
        let OffSrc = "";
        try {
            OffSrc = currentSurvivorOffering["icon"];    
        } catch (error) {
            OffSrc = "public/Offerings/blank.webp";
        }
        
        offeringElement.addEventListener("dragstart", function(event){
            event.dataTransfer.effectAllowed = "move"
            dragSourceElement, dragTargetElement = {}
            dragTargetElement.draggable = 0

            dragSourceElement.sourceSurv = event.target.parentElement.getAttribute("data-survivor-i-d")
            dragSourceElement.sourceOfferingID = GetOfferingIdByFileName(event.target.getAttribute("src"))
        });
        offeringElement.addEventListener("dragover", function(event){
            event.preventDefault()
            event.dataTransfer.dropEffect = "move"
        });
        offeringElement.addEventListener("dragenter", function(event){
            event.preventDefault()

            // Set the target survivor ID (where we're dragging to)
            dragTargetElement.targetSurv = event.target.parentElement.getAttribute("data-survivor-i-d")
            
            // Set the target offering ID (where we're dragging to)
            dragTargetElement.targetOfferingID = GetOfferingIdByFileName(event.target.getAttribute("src"))
            
            // Increment the draggable counter, this is used to check if we're dragging over a valid element
            dragTargetElement.draggable++
        });
        offeringElement.addEventListener("dragleave", function(event){
            event.preventDefault()

            // Decrement the draggable counter, this is used to check if we're dragging over a valid element
            dragTargetElement.draggable--
        });
        offeringElement.addEventListener("dragend", function(event){
            event.preventDefault()

            // Get the source survivor ID (where we're dragging from)
            const sourceSurv = parseInt(dragSourceElement.sourceSurv);

            // Get the source offering ID (where we're dragging from)
            const sourceOfferingID = parseInt(dragSourceElement.sourceOfferingID);

            if(dragTargetElement.draggable <= 0){ // If we're not dragging over a valid element, remove the offering
                SurvivorOfferings[sourceSurv] = null
            }else{ // If we are dragging over a valid element, swap the offerings

                let newSourceOffering = null;

                if (dragTargetElement.targetOfferingID != null) { // If the target offering ID is not null, get the offering by ID
                    newSourceOffering = GetOfferingById(dragTargetElement.targetOfferingID)
                }
                const targetSurv = parseInt(dragTargetElement.targetSurv)

                let newTargetOffering = null;

                if (sourceOfferingID != null) { // If the source offering ID is not null, get the offering by ID
                    newTargetOffering = GetOfferingById(sourceOfferingID)
                }
                
                SurvivorOfferings[sourceSurv] = newSourceOffering;
                SurvivorOfferings[targetSurv] = newTargetOffering;
            }

            if (Config.saveBuilds) {
                localStorage.setItem("SurvivorOfferings", JSON.stringify(SurvivorOfferings));
            }
            UpdatePerkUI();
            CheckForBalancingErrors();
        });
        
        offeringElement.dataset.survivorID = validChildI;
        offeringElement.dataset.name = currentSurvivorOffering ? currentSurvivorOffering["name"] : "";

        let offeringImg = document.createElement("img");
        offeringImg.src = OffSrc;

        offeringElement.appendChild(offeringImg);
        currentChild.appendChild(offeringElement);

        // Get current survivor item
        let currentSurvivorItem = SurvivorItems[validChildI];

        // Create item element
        let itemElement = document.createElement("div");
        itemElement.classList.add("item-slot");
        itemElement.classList.add("loadout-slot");

        let itemSrc = "";
        try {
            itemSrc = currentSurvivorItem["icon"];
        } catch (error) {
            itemSrc = "public/Items/blank.webp";
        }

        itemElement.addEventListener("dragstart", function(event){
            event.dataTransfer.effectAllowed = "move"
            dragSourceElement, dragTargetElement = {}
            dragTargetElement.draggable = 0

            dragSourceElement.sourceSurv = event.target.parentElement.getAttribute("data-survivor-i-d")
            dragSourceElement.sourceItemID = GetItemIdByFileName(event.target.getAttribute("src"))
            dragSourceElement.sourceItemAddons = SurvivorAddons[dragSourceElement.sourceSurv];
        });
        itemElement.addEventListener("dragover", function(event){
            event.preventDefault()
            event.dataTransfer.dropEffect = "move"
        });
        itemElement.addEventListener("dragenter", function(event){
            event.preventDefault()

            // Set the target survivor ID (where we're dragging to)
            dragTargetElement.targetSurv = event.target.parentElement.getAttribute("data-survivor-i-d")
            
            // Set the target item ID (where we're dragging to)
            dragTargetElement.targetItemID = GetItemIdByFileName(event.target.getAttribute("src"))
            
            // Set the target item addons (where we're dragging to)
            dragTargetElement.targetItemAddons = SurvivorAddons[dragTargetElement.targetSurv];

            // Increment the draggable counter, this is used to check if we're dragging over a valid element
            dragTargetElement.draggable++
        });
        itemElement.addEventListener("dragleave", function(event){
            event.preventDefault()

            // Decrement the draggable counter, this is used to check if we're dragging over a valid element
            dragTargetElement.draggable--
        });
        itemElement.addEventListener("dragend", function(event){
            event.preventDefault()

            // Get the source survivor ID (where we're dragging from)
            const sourceSurv = parseInt(dragSourceElement.sourceSurv);

            // Get the source item ID (where we're dragging from)
            const sourceItemID = parseInt(dragSourceElement.sourceItemID);

            // Get the source item addons (where we're dragging from)
            const sourceItemAddons = dragSourceElement.sourceItemAddons;

            if(dragTargetElement.draggable <= 0){ // If we're not dragging over a valid element, remove the item
                SurvivorItems[sourceSurv] = null;
                SurvivorAddons[sourceSurv] = [undefined, undefined];
            }else{ // If we are dragging over a valid element, swap the items

                let newSourceItem = null;
                let newSourceAddons = null;

                if (dragTargetElement.targetItemID != null) { // If the target item ID is not null, get the item by ID
                    newSourceItem = GetItemById(dragTargetElement.targetItemID)
                }
                const targetSurv = parseInt(dragTargetElement.targetSurv)

                let newTargetItem = null;

                if (sourceItemID != null) { // If the source item ID is not null, get the item by ID
                    newTargetItem = GetItemById(sourceItemID)
                }
                
                SurvivorItems[sourceSurv] = newSourceItem;
                SurvivorItems[targetSurv] = newTargetItem;

                // Swap addons
                SurvivorAddons[sourceSurv] = dragTargetElement.targetItemAddons;
                SurvivorAddons[targetSurv] = sourceItemAddons;
            }

            if (Config.saveBuilds) {
                localStorage.setItem("SurvivorItems", JSON.stringify(SurvivorItems));
                localStorage.setItem("SurvivorAddons", JSON.stringify(SurvivorAddons));
            }
            UpdatePerkUI();
            CheckForBalancingErrors();
        });

        itemElement.dataset.survivorID = validChildI;
        itemElement.dataset.name = currentSurvivorItem ? currentSurvivorItem["Name"] : "";

        let itemImg = document.createElement("img");
        itemImg.src = itemSrc;

        itemElement.appendChild(itemImg);
        currentChild.appendChild(itemElement);

        // CSS bugs out if we do this so I'm leaving it out for now.
        //if (SurvivorItems[validChildI] == undefined) { continue; }

        // Get current survivor addons
        let currentSurvivorAddons = SurvivorAddons[validChildI];

        // Create addon elements
        let addonElement1 = document.createElement("div");
        addonElement1.classList.add("addon-slot");
        addonElement1.classList.add("loadout-slot");

        let addonElement2 = document.createElement("div");
        addonElement2.classList.add("addon-slot");
        addonElement2.classList.add("loadout-slot");

        let addonSrc1 = "";
        let addonSrc2 = "";
        try {
            addonSrc1 = currentSurvivorAddons[0]["icon"];
        } catch (error) {
            addonSrc1 = "public/Addons/blank.webp";
        }
        try {
            addonSrc2 = currentSurvivorAddons[1]["icon"];
        } catch (error) {
            addonSrc2 = "public/Addons/blank.webp";
        }

        addonElement1.dataset.survivorID = validChildI;
        addonElement2.dataset.survivorID = validChildI;

        addonElement1.dataset.addonSlot = 0;
        addonElement2.dataset.addonSlot = 1;

        addonElement1.dataset.name = currentSurvivorAddons[0] ? currentSurvivorAddons[0]["Name"] : "";
        addonElement2.dataset.name = currentSurvivorAddons[1] ? currentSurvivorAddons[1]["Name"] : "";

        let addonImg1 = document.createElement("img");
        addonImg1.src = addonSrc1;
        addonImg1.draggable = false;

        let addonImg2 = document.createElement("img");
        addonImg2.src = addonSrc2;
        addonImg2.draggable = false;

        addonElement1.appendChild(addonImg1);
        addonElement2.appendChild(addonImg2);

        currentChild.appendChild(addonElement1);
        currentChild.appendChild(addonElement2);

        validChildI++;
    }

    LoadPerkSelectionEvents();
}

/**
 * Responsible for building and displaying the killer perk loadout UI. Sets basic padding and then loops through all perks to apply the perk icons and events. The same is also done to Offerings and Add-Ons. At the end it calls LoadPerkSelectionEvents().
 */
function UpdateKillerPerkUI() {
    const buildsComponent = document.getElementById("killer-build-component");
    buildsComponent.innerHTML = "";

    // Get current killer perks
    for (var i = 0; i < KillerPerks.length; i++) {
        let currentPerk = KillerPerks[i];

        ImgSrc = "";
        try {
            ImgSrc = currentPerk["icon"];
        } catch (error) {
            ImgSrc = "public/Perks/blank.webp";
        }

        let perkElement = document.createElement("div");
        perkElement.classList.add("perk-slot");
        perkElement.classList.add("loadout-slot");
        perkElement.classList.add("killer-perk-slot");

        perkElement.addEventListener("dragstart", function(event){
            event.dataTransfer.effectAllowed = "move"
            dragSourceElement, dragTargetElement = {}
            dragTargetElement.draggable = 0

            dragSourceElement.sourcePerkSlot = event.target.parentElement.dataset.perkID;
            dragSourceElement.sourcePerkId = GetPerkIdByFileName(event.target.getAttribute("src"));

        });

        perkElement.addEventListener("dragover", function(event){
            event.preventDefault()
            event.dataTransfer.dropEffect = "move"
        });

        perkElement.addEventListener("dragenter", function(event){
            event.preventDefault()
            dragTargetElement.targetPerkSlot = event.target.parentElement.dataset.perkID;
            dragTargetElement.targetPerkId = GetPerkIdByFileName(event.target.getAttribute("src"));
            dragTargetElement.draggable++
        });

        perkElement.addEventListener("dragleave", function(event){
            event.preventDefault()
            dragTargetElement.draggable--
        });

        perkElement.addEventListener("dragend", function(event){
            event.preventDefault()

            let sourcePerkSlot = parseInt(dragSourceElement.sourcePerkSlot)
            let sourcePerkId = dragSourceElement.sourcePerkId

            if(dragTargetElement.draggable <= 0) { // If we're not dragging over a valid element, remove the perk
                KillerPerks[sourcePerkSlot] = null
            } else {
                let newSourcePerk = null;
                if (dragTargetElement.targetPerkId != null) {
                    newSourcePerk = GetPerkById(dragTargetElement.targetPerkId)
                }
                KillerPerks[sourcePerkSlot] = newSourcePerk

                let targetPerkSlot = parseInt(dragTargetElement.targetPerkSlot)

                let newTargetPerk = null
                if (sourcePerkId != null) {
                    newTargetPerk = GetPerkById(sourcePerkId)
                }
                KillerPerks[targetPerkSlot] = newTargetPerk

            }

            if (Config.saveBuilds && saveLoadoutsAndKiller) {
                localStorage.setItem("KillerPerks", JSON.stringify(KillerPerks));
            }

            UpdatePerkUI()
            CheckForBalancingErrors()

            event.dataTransfer.clearData();
        });

        perkElement.dataset.perkID = i;
        perkElement.dataset.name = currentPerk ? currentPerk["name"] : "";

        let perkImg = document.createElement("img");
        perkImg.src = ImgSrc;

        perkElement.appendChild(perkImg);
        buildsComponent.appendChild(perkElement);
    }

    // Get killer offering
    let currentKillerOffering = KillerOffering;

    // Create offering element
    let offeringElement = document.createElement("div");

    offeringElement.classList.add("offering-slot");
    offeringElement.classList.add("loadout-slot");

    offeringElement.id = "killer-offering-slot";
    offeringElement.dataset.name = currentKillerOffering ? currentKillerOffering["name"] : "";

    let OffSrc = "";
    try {
        OffSrc = currentKillerOffering["icon"];    
    } catch (error) {
        OffSrc = "public/Offerings/blank.webp";
    }

    let offeringImg = document.createElement("img");
    offeringImg.src = OffSrc;

    offeringElement.appendChild(offeringImg);
    buildsComponent.appendChild(offeringElement);

    // The killer's power (display only)
    let powerElement = document.createElement("div");
    powerElement.classList.add("power-slot");
    powerElement.classList.add("loadout-slot");
    powerElement.title = "Power";

    let powerImg = document.createElement("img");
    powerImg.src = Killers[selectedKiller].PowerIcon;
    powerImg.draggable = false;

    powerElement.appendChild(powerImg);
    buildsComponent.appendChild(powerElement);

    // Get current killer addons
    let currentKillerAddons = KillerAddons;

    // Create addon elements
    let addonElement1 = document.createElement("div");
    addonElement1.classList.add("addon-slot");
    addonElement1.classList.add("loadout-slot");
    addonElement1.classList.add("killer-addon-slot");

    let addonElement2 = document.createElement("div");
    addonElement2.classList.add("addon-slot");
    addonElement2.classList.add("loadout-slot");
    addonElement2.classList.add("killer-addon-slot");

    let addonSrc1 = "";
    let addonSrc2 = "";

    try {
        addonSrc1 = currentKillerAddons[0]["addonIcon"];

        if (addonSrc1 == undefined) {
            throw "Addon 1 is undefined.";
        }
    } catch (error) {
        addonSrc1 = "public/Addons/blank.webp";
    }

    try {
        addonSrc2 = currentKillerAddons[1]["addonIcon"];

        if (addonSrc2 == undefined) {
            throw "Addon 2 is undefined.";
        }
    } catch (error) {
        addonSrc2 = "public/Addons/blank.webp";
    }

    addonElement1.dataset.addonSlot = 0;
    addonElement2.dataset.addonSlot = 1;

    addonElement1.dataset.name = currentKillerAddons[0] ? currentKillerAddons[0]["Name"] : "";
    addonElement2.dataset.name = currentKillerAddons[1] ? currentKillerAddons[1]["Name"] : "";

    let addonImg1 = document.createElement("img");
    addonImg1.src = addonSrc1;
    addonImg1.draggable = false;

    let addonImg2 = document.createElement("img");
    addonImg2.src = addonSrc2;
    addonImg2.draggable = false;

    addonElement1.appendChild(addonImg1);
    addonElement2.appendChild(addonImg2);

    buildsComponent.appendChild(addonElement1);
    buildsComponent.appendChild(addonElement2);

    LoadPerkSelectionEvents();
}

/**
 * Updates the killer picker in the top bar and marks the selected killer in the killer selection.
 */
function UpdateKillerSelectionUI() {
    const killer = Killers[selectedKiller];
    const currentKillerOverride = currentBalancing == null ? undefined : currentBalancing.KillerOverride[selectedKiller];

    document.getElementById("selected-killer-title").innerText = killer.Name;
    document.getElementById("selected-killer-portrait").src = killer.Portrait;

    let label = "Killer";
    if (currentBalancing != null) {
        if (currentKillerOverride == undefined) {
            label += " · not in balancing";
        } else if (currentKillerOverride.IsDisabled) {
            label += " · disabled";
        } else {
            const tierNames = GetAppliedTierNames(currentKillerOverride, selectedRole);
            if (tierNames.length > 0) { label += " · " + tierNames.join(", "); }
        }
    }
    document.getElementById("selected-killer-label").innerText = label;

    // Remove all character-selected classes
    if(document.querySelector(`.character-selected`)) {
        document.querySelector(`.character-selected`).classList.remove("character-selected")
    }
    
    // Add character-selected class to selected killer
    let selectedKillerElement = document.querySelector(`[data-killerid="${selectedKiller}"]`);
    selectedKillerElement.classList.add("character-selected");

    UpdateRoleSelectionHeaderUI();
    SetDisabledKillers();
}

/**
 * Returns the names of the tiers (other than General) applied to a killer for the given role.
 * @param {Object} killerOverride
 * @param {Number} role 0 = Survivor, 1 = Killer
 * @returns {Array}
 */
function GetAppliedTierNames(killerOverride, role) {
    const tierIndexes = role == 0 ? killerOverride.SurvivorBalanceTiers : killerOverride.BalanceTiers;

    return [...new Set(tierIndexes)]
        .map(index => currentBalancing.Tiers[index] ? currentBalancing.Tiers[index].Name.trim() : undefined)
        .filter(name => name != undefined && name.toLowerCase() != "general");
}

/**
 * Updates the killer selection: tiers under each killer, and marks killers that are disabled or not in the balancing.
 */
function SetDisabledKillers() {
    const selectGrid = document.getElementById("character-select-grid");

    if (currentBalancing == null) { return; }
    if (!selectGrid) { return; }

    const characterButtons = selectGrid.querySelectorAll(':scope > .character-select-button');

    characterButtons.forEach(button => {
        const killerID = button.dataset.killerid
        const killer = currentBalancing.KillerOverride[killerID];

        const unavailable = killer == undefined || killer.IsDisabled;
        button.classList.toggle("off", unavailable);
        button.querySelector(".ban-at").hidden = !unavailable;

        let tierText = "";
        if (killer == undefined) {
            tierText = "Not in this balancing";
        } else if (!killer.IsDisabled) {
            tierText = GetAppliedTierNames(killer, selectedRole).join(", ");
        }
        button.querySelector(".tier").innerText = tierText;
    })
}

/**
 * Shows only the killers whose name contains the query in the killer selection.
 * @param {String} query
 */
function FilterKillerPortraits(query) {
    const lowerQuery = query.trim().toLowerCase();

    document.querySelectorAll("#character-select-grid > .character-select-button").forEach(button => {
        const killer = Killers[button.dataset.killerid];
        const searchable = [killer.Name, ...(killer.Aliases || [])].join(" ").toLowerCase();

        button.hidden = lowerQuery != "" && !searchable.includes(lowerQuery);
    });
}

/**
 * Updates the tournament picker and everything that depends on the balancing.
 */
function UpdateBalanceSelectionUI() {
    const selectedBalanceTitle = document.getElementById("selected-balance-title");
    selectedBalanceTitle.innerText = currentBalancing["Name"];

    SetDisabledKillers();
    CheckGlobalBalanceNotes();
}

/**
 * Updates the rules that apply to the whole match (anti-facecamp, perk repetition, ...) and the killer's maps.
 */
function UpdateAntiFacecampUI() {
    UpdateMatchRulesUI();
}

/**
 * Scrolls the killer selection to make sure the currently selected killer's portrait is in view.
 */
function ScrollToSelectedKiller(){
    const selectedElement = document.querySelector(`#character-select-grid [data-killerid="${selectedKiller}"]`);
    if (selectedElement == null) { return; }

    selectedElement.scrollIntoView({ block: "nearest" });
}

/**
 * Updates the role switch. Importing an image and exporting a loadout are only available for survivors.
 */
function UpdateRoleSwapIcon() {
    for (const roleButton of document.querySelectorAll(".rolestep [data-role]")) {
        roleButton.setAttribute("aria-pressed", parseInt(roleButton.dataset.role) == selectedRole);
    }

    document.getElementById("import-button").hidden = selectedRole != 0;
    document.getElementById("export-button").hidden = selectedRole != 0;
}

/**
 * Sets the title of the search dialog and syncs its "only show allowed" checkbox.
 * @param {String} title
 */
function SetSearchTitle(title) {
    document.getElementById("perk-search-title").innerText = title;
    document.getElementById("only-non-banned-search").checked = onlyShowNonBanned;
}

/**
 * Adds the name under a search result's icon.
 * @param {Element} resultElement
 * @param {String} name
 */
function AddSearchResultName(resultElement, name) {
    let nameElement = document.createElement("span");
    nameElement.classList.add("nm");
    nameElement.innerText = name;

    resultElement.appendChild(nameElement);
}

/**
 * Searches for perks based on a search query.
 * @param {HTMLElement} perkSearchBar The perk search bar element.
 */
function ForcePerkSearch(perkSearchBar) {
    var searchResults = SearchForPerks(perkSearchBar.value, selectedRole == 0);

    perkSearchBar.placeholder = "Search Perks...";
    SetSearchTitle("Choose a perk");

    var perkSearchResultsContainer = document.getElementById("perk-search-results-module");
    perkSearchResultsContainer.classList.remove("item-gap-format");
    perkSearchResultsContainer.innerHTML = "";

    // Add a blank perk to the top of the list
    let blankPerk = document.createElement("div");
    blankPerk.classList.add("perk-slot-result");

    let blankImg = document.createElement("img");
    blankImg.draggable = false;
    blankImg.src = "public/Perks/blank.webp";

    blankPerk.appendChild(blankImg);
    AddSearchResultName(blankPerk, "Empty");
    perkSearchResultsContainer.appendChild(blankPerk);

    blankPerk.addEventListener("click", function() {
        var targetSurvivor = parseInt(perkSearchContainer.dataset.targetSurvivor);
        var targetPerk = parseInt(perkSearchContainer.dataset.targetPerk);

        if (selectedRole == 0) {
            SurvivorPerks[targetSurvivor][targetPerk] = undefined;
        } else {
            KillerPerks[targetPerk] = undefined;
        }

        UpdatePerkUI();

        perkSearchContainer.dataset.targetSurvivor = undefined;
        perkSearchContainer.dataset.targetPerk = undefined;

        CheckForBalancingErrors();

        if (Config.saveBuilds && saveLoadoutsAndKiller) {
            if (selectedRole == 0) {
                localStorage.setItem("SurvivorPerks", JSON.stringify(SurvivorPerks));
            } else {
                localStorage.setItem("KillerPerks", JSON.stringify(KillerPerks));
            }
        }
    });

    blankPerk.addEventListener("mouseover", function() {
        var perkTooltip = document.getElementById("perk-highlight-name");

        perkTooltip.innerText = "Blank Perk";
    });

    const bannedPerks = GetBannedPerks()    

    searchResults = searchResults.sort((a, b) => {
        let nameA = a["name"].toUpperCase();
        let nameB = b["name"].toUpperCase();

        if (nameA < nameB) {
            return -1;
        } else if (nameA > nameB) {
            return 1;
        }
        return 0;
    });

    for (var i = 0; i < searchResults.length; i++) {
        let currentPerk = searchResults[i];

        let isBanned = false;
        let isEquipped = false;

        let perkElement = document.createElement("div");
        perkElement.classList.add("perk-slot-result");
        
        // Check if the perk is banned.
        if(bannedPerks.includes(currentPerk["id"] + "")){
            //perkElement.classList.add("perk-slot-result-banned");
            isBanned = true;
        }

        // Check if the perk is already equipped.
        let equipCount = 0;
        if (selectedRole == 0) {
            for(const surv of SurvivorPerks){
                for(const perk of surv){
                    if(perk && perk.id == currentPerk["id"]){
                        //perkElement.classList.add("perk-slot-result-equipped");
                        equipCount++;
                    }
                }
            }
        } else {
            for(const perk of KillerPerks){
                if(perk && perk.id == currentPerk["id"]){
                    //perkElement.classList.add("perk-slot-result-equipped");
                    equipCount++;
                }
            }
        }

        // If the perk is equipped more than the max amount, it's equipped fully.
        let maxPerks = selectedRole == 0 ? currentBalancing.MaxPerkRepetition : 1;
        if (equipCount >= currentBalancing.MaxPerkRepetition) {
            isEquipped = true;
        }

        // Add classes based on perk status
        if (isBanned) {
            if (isEquipped) {
                perkElement.classList.add("perk-slot-result-banned-and-equipped");
            } else {
                perkElement.classList.add("perk-slot-result-banned");
            }
        } else if (isEquipped) {
            perkElement.classList.add("perk-slot-result-equipped");
        }

        const breaksRule = isBanned ? null : GetPerkPickRuleBreak(currentPerk);
        if (breaksRule != null) {
            perkElement.classList.add("perk-slot-result-conflict");
        }

        perkElement.dataset.perkID = currentPerk["id"];


        let perkImg = document.createElement("img");
        perkImg.draggable = false;
        perkImg.src = currentPerk["icon"];

        perkElement.appendChild(perkImg);
        AddSearchResultName(perkElement, currentPerk["name"]);
        perkSearchResultsContainer.appendChild(perkElement);

        var perkSearchContainer = document.getElementById("perk-search-container");

        perkElement.addEventListener("click", function() {
            var targetSurvivor = parseInt(perkSearchContainer.dataset.targetSurvivor);
            var targetPerk = parseInt(perkSearchContainer.dataset.targetPerk);

            if (selectedRole == 0) {
                SurvivorPerks[targetSurvivor][targetPerk] = currentPerk;
            } else {
                KillerPerks[targetPerk] = currentPerk;
            }

            UpdatePerkUI();

            perkSearchContainer.dataset.targetSurvivor = undefined;
            perkSearchContainer.dataset.targetPerk = undefined;

            CheckForBalancingErrors();
            
            if (Config.saveBuilds && saveLoadoutsAndKiller) {
                if (selectedRole == 0) {
                    localStorage.setItem("SurvivorPerks", JSON.stringify(SurvivorPerks));
                } else {
                    localStorage.setItem("KillerPerks", JSON.stringify(KillerPerks));
                }            }
        });

        perkElement.addEventListener("mouseover", function() {
            var perkTooltip = document.getElementById("perk-highlight-name");

            perkTooltip.innerHTML = currentPerk["name"];

            if (isBanned) {
                if (!isEquipped) {
                    perkTooltip.innerHTML += " <span style='color: #ff8080'>(Banned)</span>";
                } else {
                    perkTooltip.innerHTML += " <span style='color: #ffbd80'>(Equipped + Banned)</span>";
                }
            } else if (breaksRule != null) {
                perkTooltip.innerHTML += ` <span style='color: #ff8080'>(${breaksRule})</span>`;
            } else {
                if (isEquipped) {
                    perkTooltip.innerHTML += " <span style='color: #80ff80'>(Equipped)</span>";
                }
            }
        });
    }
}

/**
 * Returns the rule that picking a perk for the slot being searched would break, or null.
 * @param {Object} perk
 * @returns {String}
 */
function GetPerkPickRuleBreak(perk) {
    const perkSearchContainer = document.getElementById("perk-search-container");
    const targetSurvivor = parseInt(perkSearchContainer.dataset.targetSurvivor);
    const targetPerk = parseInt(perkSearchContainer.dataset.targetPerk);

    const targetBuild = selectedRole == 0 ? SurvivorPerks[targetSurvivor] : KillerPerks;
    if (targetBuild == undefined) { return null; }

    const inOtherSlot = targetBuild.some((buildPerk, slot) => slot != targetPerk && buildPerk && buildPerk.id == perk.id);
    if (inOtherSlot) { return "Duplicate Perk"; }

    if (selectedRole == 0) {
        // The perk would be in this build plus every other build that already has it.
        const otherBuilds = SurvivorPerks.filter((build, survivor) => survivor != targetSurvivor && BuildHasPerk(perk.id, build)).length;
        if (otherBuilds + 1 > currentBalancing.MaxPerkRepetition) { return "Perk Repetition"; }
    }

    return null;
}

/**
 * Searches for offerings based on a search query.
 * @param {HTMLElement} perkSearchBar The perk search bar element.
 */
function ForceOfferingSearch(perkSearchBar) {
    let isSurvivor = selectedRole == 0;

    perkSearchBar.placeholder = "Search Offerings...";
    SetSearchTitle("Choose an offering");

    let searchResults = SearchForOfferings(perkSearchBar.value, isSurvivor);

    let offeringSearchResultsContainer = document.getElementById("perk-search-results-module");
    offeringSearchResultsContainer.classList.remove("item-gap-format");
    offeringSearchResultsContainer.innerHTML = "";

    // Add a blank offering to the top of the list
    let blankOffering = document.createElement("div");
    blankOffering.classList.add("perk-slot-result");
    blankOffering.classList.add("offering-slot-result");

    let blankImg = document.createElement("img");
    blankImg.draggable = false;
    blankImg.src = "public/Offerings/blank.webp";

    blankOffering.appendChild(blankImg);
    AddSearchResultName(blankOffering, "Empty");
    offeringSearchResultsContainer.appendChild(blankOffering);

    let offeringSearchContainer = document.getElementById("perk-search-container");
    blankOffering.addEventListener("click", function() {
        if (selectedRole == 0) {
            let targetSurvivor = parseInt(offeringSearchContainer.dataset.targetSurvivor);

            SurvivorOfferings[targetSurvivor] = undefined;
        } else {
            KillerOffering = undefined;
        }

        UpdatePerkUI();

        offeringSearchContainer.dataset.targetSurvivor = undefined;

        CheckForBalancingErrors();

        if (Config.saveBuilds) {
            localStorage.setItem("SurvivorOfferings", JSON.stringify(SurvivorOfferings));
            localStorage.setItem("KillerOffering", JSON.stringify(KillerOffering));
        }
    });

    blankOffering.addEventListener("mouseover", function() {
        let perkTooltip = document.getElementById("perk-highlight-name");

        perkTooltip.innerText = "Blank Offering";
    });

    const bannedOfferings = GetBannedOfferings();
    const OfferingRole = isSurvivor ? "Survivor" : "Killer";
    for (var i = 0; i < searchResults.length; i++) {
        let currentOffering = searchResults[i];

        let isBanned = false;
        
        let offeringElement = document.createElement("div");
        offeringElement.classList.add("perk-slot-result");
        offeringElement.classList.add("offering-slot-result");

        DebugLog(`OfferingRole: ${OfferingRole}`)
        // Check if the offering is banned.
        if(bannedOfferings[OfferingRole].includes(currentOffering["id"])){
            DebugLog(`Banned offering: ${currentOffering["id"]}`)
            isBanned = true;
        }

        // Add classes based on offering status
        if (isBanned) {
            offeringElement.classList.add("offering-slot-result-banned");
        }

        offeringElement.dataset.offeringID = currentOffering["id"];

        let offeringImg = document.createElement("img");
        offeringImg.draggable = false;
        offeringImg.src = currentOffering["icon"];

        offeringElement.appendChild(offeringImg);
        AddSearchResultName(offeringElement, currentOffering["name"]);
        offeringSearchResultsContainer.appendChild(offeringElement);

        offeringElement.addEventListener("click", function() {
            if (selectedRole == 0) {
                let targetSurvivor = parseInt(offeringSearchContainer.dataset.targetSurvivor);
    
                SurvivorOfferings[targetSurvivor] = currentOffering;
            } else {
                KillerOffering = currentOffering;
            }

            UpdatePerkUI();
            
            offeringSearchContainer.dataset.targetSurvivor = undefined;

            CheckForBalancingErrors();

            if (Config.saveBuilds) {
                localStorage.setItem("SurvivorOfferings", JSON.stringify(SurvivorOfferings));
                localStorage.setItem("KillerOffering", JSON.stringify(KillerOffering));
            }
        });

        offeringElement.addEventListener("mouseover", function() {
            let perkTooltip = document.getElementById("perk-highlight-name");

            perkTooltip.innerHTML = currentOffering["name"];

            if (isBanned) {
                perkTooltip.innerHTML += " <span style='color: #ff8080'>(Banned)</span>";
            }
        });
    }
}

/**
 * Searches for items based on a search query.
 * @param {HTMLElement} perkSearchBar The perk search bar element.
 */
function ForceItemSearch(perkSearchBar) {
    perkSearchBar.placeholder = "Search Items...";
    SetSearchTitle("Choose an item");

    let searchResults = SearchForItems(perkSearchBar.value);

    let itemSearchResultsContainer = document.getElementById("perk-search-results-module");

    itemSearchResultsContainer.innerHTML = "";
    itemSearchResultsContainer.classList.add("item-gap-format");

    // Add a blank item to the top of the list
    let blankItem = document.createElement("div");
    blankItem.classList.add("item-slot-result");

    let blankImg = document.createElement("img");
    blankImg.draggable = false;
    blankImg.src = "public/Items/blank.webp";

    blankItem.appendChild(blankImg);
    AddSearchResultName(blankItem, "Empty");
    itemSearchResultsContainer.appendChild(blankItem);

    let itemSearchContainer = document.getElementById("perk-search-container");
    blankItem.addEventListener("click", function() {
        let targetSurvivor = parseInt(itemSearchContainer.dataset.targetSurvivor);

        SurvivorItems[targetSurvivor] = undefined;

        // Reset addons
        SurvivorAddons[targetSurvivor] = [undefined, undefined];

        UpdatePerkUI();

        itemSearchContainer.dataset.targetSurvivor = undefined;

        CheckForBalancingErrors();
        if (Config.saveBuilds) {
            localStorage.setItem("SurvivorItems", JSON.stringify(SurvivorItems));
            localStorage.setItem("SurvivorAddons", JSON.stringify(SurvivorAddons));
        }
    });

    blankItem.addEventListener("mouseover", function() {
        let perkTooltip = document.getElementById("perk-highlight-name");

        perkTooltip.innerText = "Blank Item";
    });

    const bannedItems = GetBannedItems();
    for (var i = 0; i < searchResults.length; i++) {
        let currentItem = searchResults[i];

        let isBanned = false;
        
        let itemElement = document.createElement("div");
        itemElement.classList.add("item-slot-result");

        // Check if the item is banned.
        if(bannedItems.includes(currentItem["id"])){
            isBanned = true;
        }

        // Add classes based on item status
        if (isBanned) {
            itemElement.classList.add("item-slot-result-banned");
        }

        itemElement.dataset.itemID = currentItem["id"];

        let itemImg = document.createElement("img");
        itemImg.draggable = false;
        itemImg.src = currentItem["icon"];

        itemElement.appendChild(itemImg);
        AddSearchResultName(itemElement, currentItem["Name"]);
        itemSearchResultsContainer.appendChild(itemElement);

        itemElement.addEventListener("click", function() {
            let targetSurvivor = parseInt(itemSearchContainer.dataset.targetSurvivor);

            let currentSurvivorItem = SurvivorItems[targetSurvivor];
            
            let equalItemTypes = false;
            if (currentSurvivorItem != undefined && currentItem != undefined) {
                equalItemTypes = currentSurvivorItem["Type"] == currentItem["Type"];
            }
            
            SurvivorItems[targetSurvivor] = currentItem;

            // Reset addons if the item type is different
            if (!equalItemTypes) {
                SurvivorAddons[targetSurvivor] = [undefined, undefined];
            }
            UpdatePerkUI();

            itemSearchContainer.dataset.targetSurvivor = undefined;

            CheckForBalancingErrors();

            if (Config.saveBuilds) {
                localStorage.setItem("SurvivorItems", JSON.stringify(SurvivorItems));
                localStorage.setItem("SurvivorAddons", JSON.stringify(SurvivorAddons));
            }
        });

        itemElement.addEventListener("mouseover", function() {
            let perkTooltip = document.getElementById("perk-highlight-name");

            perkTooltip.innerHTML = currentItem["Name"];

            if (isBanned) {
                perkTooltip.innerHTML += " <span style='color: #ff8080'>(Banned)</span>";
            }
        });
    }

}

/**
 * Searches for add-ons based on a search query.
 * @param {HTMLElement} perkSearchBar The perk search bar element.
 */
function ForceAddonSearch(perkSearchBar) {
    perkSearchBar.placeholder = "Search Addons...";
    SetSearchTitle("Choose an add-on");

    const perkSearchContainer = document.getElementById("perk-search-container");
    
    let filterData = {
        "itemType": perkSearchContainer.dataset.itemType,
        "addonSlot": perkSearchContainer.dataset.addonSlot
    }

    if (perkSearchContainer.dataset.itemType == undefined) { 
        GenerateAlertModal("Item Persistence Error", "There was an error finding the item type to search appropriate addons. Please try again or file an issue on the GitHub page.");
        return;
    }
    let searchResults = SearchForAddons(perkSearchBar.value, filterData["itemType"]);

    let addonSearchResultsContainer = document.getElementById("perk-search-results-module");

    addonSearchResultsContainer.innerHTML = "";
    addonSearchResultsContainer.classList.add("item-gap-format");

    // Add a blank addon to the top of the list
    let blankAddon = document.createElement("div");
    blankAddon.classList.add("item-slot-result");

    let blankImg = document.createElement("img");
    blankImg.draggable = false;
    blankImg.src = "public/Addons/blank.webp";

    blankAddon.appendChild(blankImg);
    AddSearchResultName(blankAddon, "Empty");
    addonSearchResultsContainer.appendChild(blankAddon);

    blankAddon.addEventListener("click", function() {
        let targetSurvivor = parseInt(perkSearchContainer.dataset.targetSurvivor);

        SurvivorAddons[targetSurvivor][filterData["addonSlot"]] = undefined;

        UpdatePerkUI();

        perkSearchContainer.dataset.targetSurvivor = undefined;

        CheckForBalancingErrors();
        if (Config.saveBuilds) {
            localStorage.setItem("SurvivorAddons", JSON.stringify(SurvivorAddons));
        }
    });

    blankAddon.addEventListener("mouseover", function() {
        let perkTooltip = document.getElementById("perk-highlight-name");

        perkTooltip.innerText = "Blank Addon";
    });

    const bannedAddons = GetBannedAddons(filterData["itemType"]);
    for (var i = 0; i < searchResults.length; i++) {
        let currentAddon = searchResults[i];

        let isBanned = false;

        let addonElement = document.createElement("div");
        addonElement.classList.add("item-slot-result");

        // Check if the addon is banned.
        if(bannedAddons.includes(currentAddon["id"])){
            isBanned = true;
        }

        // Add classes based on addon status
        if (isBanned) {
            addonElement.classList.add("item-slot-result-banned");
        }

        addonElement.dataset.addonID = currentAddon["id"];
        addonElement.dataset.itemType = filterData["itemType"];

        let addonImg = document.createElement("img");
        addonImg.draggable = false;
        addonImg.src = currentAddon["icon"];

        addonElement.appendChild(addonImg);
        AddSearchResultName(addonElement, currentAddon["Name"]);
        addonSearchResultsContainer.appendChild(addonElement);

        addonElement.addEventListener("click", function() {
            let targetSurvivor = parseInt(perkSearchContainer.dataset.targetSurvivor);

            SurvivorAddons[targetSurvivor][filterData["addonSlot"]] = currentAddon;

            UpdatePerkUI();

            perkSearchContainer.dataset.targetSurvivor = undefined;

            CheckForBalancingErrors();

            if (Config.saveBuilds) {
                localStorage.setItem("SurvivorAddons", JSON.stringify(SurvivorAddons));
            }
        });

        addonElement.addEventListener("mouseover", function() {
            let perkTooltip = document.getElementById("perk-highlight-name");

            perkTooltip.innerHTML = currentAddon["Name"];

            if (isBanned) {
                perkTooltip.innerHTML += " <span style='color: #ff8080'>(Banned)</span>";
            }
        });
    }
}

/**
 * Searches for killer add-ons based on a search query.
 * @param {HTMLElement} perkSearchBar The perk search bar element.
 */
function ForceKillerAddonSearch(perkSearchBar) {
    perkSearchBar.placeholder = "Search Addons...";
    SetSearchTitle("Choose an add-on");

    const perkSearchContainer = document.getElementById("perk-search-container");

    let filterData = {
        "killer": perkSearchContainer.dataset.targetKiller,
        "addonSlot": perkSearchContainer.dataset.addonSlot
    }

    if (perkSearchContainer.dataset.targetKiller == undefined) {
        GenerateAlertModal("Killer Persistence Error", "There was an error finding the killer to search appropriate addons for. Please try again or file an issue on the GitHub repo/Discord server.");
        return;
    }

    let searchResults = SearchForKillerAddons(perkSearchBar.value, filterData["killer"]);

    let addonSearchResultsContainer = document.getElementById("perk-search-results-module");

    addonSearchResultsContainer.innerHTML = "";
    addonSearchResultsContainer.classList.add("item-gap-format");

    // Add a blank addon to the top of the list
    let blankAddon = document.createElement("div");
    blankAddon.classList.add("item-slot-result");

    let blankImg = document.createElement("img");
    blankImg.draggable = false;
    blankImg.src = "public/Addons/blank.webp";

    blankAddon.appendChild(blankImg);
    AddSearchResultName(blankAddon, "Empty");
    addonSearchResultsContainer.appendChild(blankAddon);

    blankAddon.addEventListener("click", function() {
        KillerAddons[filterData["addonSlot"]] = undefined;

        UpdatePerkUI();

        perkSearchContainer.dataset.targetKiller = undefined;

        CheckForBalancingErrors();

        if (Config.saveBuilds) {
            localStorage.setItem("KillerAddons", JSON.stringify(KillerAddons));
        }
    });

    blankAddon.addEventListener("mouseover", function() {
        let perkTooltip = document.getElementById("perk-highlight-name");

        perkTooltip.innerText = "Blank Addon";
    });

    const bannedAddons = GetBannedKillerAddons();

    for (var i = 0; i < searchResults.length; i++) {
        let currentAddon = searchResults[i];

        let isBanned = false;
        let isEquipped = false;

        let addonElement = document.createElement("div");
        addonElement.classList.add("item-slot-result");

        // Check if the addon is banned.
        if(bannedAddons.includes(currentAddon)) {
            isBanned = true;
        }

        // Get current addon slot
        let currentSlot = filterData["addonSlot"];
        let targetSlot = currentSlot == 0 ? 1 : 0; // Get the other slot

        // Check if the addon is already equipped
        if (KillerAddons[targetSlot] != undefined) {
            if (KillerAddons[targetSlot]["globalID"] == currentAddon["globalID"]) {
                isEquipped = true;
            }
        }

        // Add classes based on addon status
        if (isBanned && isEquipped) {
            addonElement.classList.add("item-slot-result-banned-and-equipped");
        } else if (isBanned) {
            addonElement.classList.add("item-slot-result-banned");
        } else if (isEquipped) {
            addonElement.classList.add("item-slot-result-equipped");
        }

        addonElement.dataset.addonID = currentAddon["globalID"];
        addonElement.dataset.killer = filterData["killer"];

        let addonImg = document.createElement("img");
        addonImg.draggable = false;
        addonImg.src = currentAddon["addonIcon"];

        addonElement.appendChild(addonImg);
        AddSearchResultName(addonElement, currentAddon["Name"]);
        addonSearchResultsContainer.appendChild(addonElement);

        addonElement.addEventListener("click", function() {
            KillerAddons[filterData["addonSlot"]] = currentAddon;

            UpdatePerkUI();

            perkSearchContainer.dataset.targetKiller = undefined;

            CheckForBalancingErrors();

            if (Config.saveBuilds) {
                localStorage.setItem("KillerAddons", JSON.stringify(KillerAddons));
            }
        });

        addonElement.addEventListener("mouseover", function() {
            let perkTooltip = document.getElementById("perk-highlight-name");

            perkTooltip.innerHTML = currentAddon["Name"];

            if (isBanned) {
                if (isEquipped) {
                    perkTooltip.innerHTML += " <span style='color: #ffbd80'>(Equipped + Banned)</span>";
                } else {
                    perkTooltip.innerHTML += " <span style='color: #ff8080'>(Banned)</span>";
                }
            } else {
                if (isEquipped) {
                    perkTooltip.innerHTML += " <span style='color: #80ff80'>(Equipped)</span>";
                }
            }
        });
    }
}

/**
 * Responsible for updating the error column with the errors in the MasterErrorList. In addition to this, it also is responsible for applying the appropriate class to perk elements to highlight them as red in the loadouts page.
 *
 * Next to the rule breaks it lists warnings that are not rule breaks themselves (a disabled killer, empty perk slots).
 * They are only shown here and are not part of the MasterErrorList.
 */
function UpdateErrorUI() {
    var errorListContainer = document.getElementById("error-list-container");
    errorListContainer.innerHTML = "";

    // Remove all banned perk slot visuals on the frontend.
    document.querySelectorAll(".perk-slot-result-banned, .empty-warn").forEach(slot => slot.classList.remove("perk-slot-result-banned", "empty-warn"));
    
    let perkCpt = 0
    if (selectedRole == 0) {
        let survCpt = 0
        for(const surv of SurvivorPerks){
            for(const perk of surv){
                const survPerk = document.querySelector(`#survivor-builds-container [data-survivor-i-d="${survCpt}"][data-perk-i-d="${perkCpt}"]`)
    
                for(const error of MasterErrorList){
                    if(survPerk && survPerk.classList && perk && error.REASON.includes(perk.name)){
                        survPerk.classList.add("perk-slot-result-banned")
                        break
                    }
                }
    
                perkCpt++
            }
            perkCpt = 0
            survCpt++
        }
    } else {
        for(const perk of KillerPerks){
            const killerPerk = document.querySelector(`#killer-build-component .killer-perk-slot[data-perk-i-d="${perkCpt}"]`);

            for(const error of MasterErrorList){
                if(killerPerk && perk && error.REASON.includes(perk.name)){
                    killerPerk.classList.add("perk-slot-result-banned")
                    break
                }
            }

            perkCpt++
        }
    }

    const ruleBreaks = MasterErrorList.concat(GetKillerAvailabilityErrors());
    const warnings = GetEmptyPerkWarnings();

    ruleBreaks.forEach(error => errorListContainer.appendChild(GenerateErrorListItem(error, false)));
    warnings.forEach(warning => errorListContainer.appendChild(GenerateErrorListItem(warning, true)));

    if (ruleBreaks.length == 0 && warnings.length == 0) {
        let noErrors = document.createElement("li");
        noErrors.classList.add("none");
        noErrors.innerText = "Everything follows the rules.";
        errorListContainer.appendChild(noErrors);
    }

    const errorsWindow = document.getElementById("errors-window");
    errorsWindow.classList.toggle("clean", ruleBreaks.length == 0 && warnings.length == 0);
    errorsWindow.classList.toggle("warned", ruleBreaks.length == 0 && warnings.length > 0);

    var errorPanelTitle = document.getElementById("error-panel-title");
    errorPanelTitle.innerText = ruleBreaks.length > 0 ? `Rule breaks · ${ruleBreaks.length}` :
        warnings.length > 0 ? `Warnings · ${warnings.length}` : "No rule breaks";

    const loadoutTabMark = document.getElementById("loadout-tab-mark");
    loadoutTabMark.hidden = ruleBreaks.length == 0 && warnings.length == 0;
    loadoutTabMark.src = ruleBreaks.length > 0 ? "/iconography/ui/bang.webp" : "/iconography/ui/bang-warn.webp";

    UpdateMatchRulesUI();
    RenderRulesPanel();
    RenderBansPanel();
    UpdateShareURL();
}

/**
 * Rule breaks about the killer itself: not in the balancing, or disabled in it.
 * @returns {Array} Error objects.
 */
function GetKillerAvailabilityErrors() {
    if (currentBalancing == null) { return []; }

    const currentName = Killers[selectedKiller].Name;
    const currentKillerOverride = currentBalancing.KillerOverride[selectedKiller];

    if (currentKillerOverride == undefined) {
        return [GenerateErrorObject(
            "Killer Not Found",
            `Killer <b>${currentName}</b> not found in current balancing! Please select a different killer or change the balancing. Validation won't work.`,
            undefined,
            "iconography/CriticalError.webp",
            true
        )];
    }

    if (currentKillerOverride.IsDisabled) {
        return [GenerateErrorObject(
            "Killer Disabled",
            `Killer <b>${currentName}</b> is disabled in the current balancing! You may still select this killer, but they may be ineligible to play in official matches.`,
            undefined,
            "iconography/CriticalError.webp",
            true
        )];
    }

    return [];
}

/**
 * Warnings for builds that have some perks but not all four. Also marks the empty slots.
 * @returns {Array} Error objects.
 */
function GetEmptyPerkWarnings() {
    const builds = selectedRole == 0 ? SurvivorPerks : [KillerPerks];
    const warnings = [];

    builds.forEach((build, buildIndex) => {
        const emptySlots = [];
        build.forEach((perk, slotIndex) => {
            if (perk == undefined) { emptySlots.push(slotIndex); }
        });

        if (emptySlots.length == 0 || emptySlots.length == build.length) { return; }

        const slotElements = emptySlots.map(slotIndex => selectedRole == 0 ?
            document.querySelector(`#survivor-builds-container [data-survivor-i-d="${buildIndex}"][data-perk-i-d="${slotIndex}"]`) :
            document.querySelector(`#killer-build-component .killer-perk-slot[data-perk-i-d="${slotIndex}"]`)
        ).filter(slot => slot != null);
        slotElements.forEach(slot => slot.classList.add("empty-warn"));

        const who = selectedRole == 0 ? `Survivor #${buildIndex + 1}` : "the Killer";
        let warning = GenerateErrorObject(
            emptySlots.length == 1 ? "Empty Perk Slot" : "Empty Perk Slots",
            `${emptySlots.length == 1 ? "Slot" : "Slots"} ${emptySlots.map(slotIndex => slotIndex + 1).join(", ")} in <b>${who}</b>'s build ${emptySlots.length == 1 ? "is" : "are"} empty.`,
            undefined,
            "iconography/PerkError.webp"
        );
        warning.SLOTS = slotElements;
        warnings.push(warning);
    });

    return warnings;
}

/**
 * Generates an item of the error list. Clicking it scrolls to the slots it is about.
 * @param {Object} error
 * @param {Boolean} isWarning
 * @returns {Element}
 */
function GenerateErrorListItem(error, isWarning) {
    let item = document.createElement("li");
    if (isWarning) { item.classList.add("warn"); }

    let button = document.createElement("button");
    button.type = "button";

    let icon = document.createElement("img");
    icon.src = error["ICON"];
    icon.alt = "";

    let text = document.createElement("span");

    let title = document.createElement("span");
    title.classList.add("t");
    title.innerText = error["ERROR"];

    let description = document.createElement("span");
    description.classList.add("d");
    description.innerHTML = error["REASON"];

    text.appendChild(title);
    text.appendChild(description);
    button.appendChild(icon);
    button.appendChild(text);
    item.appendChild(button);

    button.addEventListener("click", function() {
        FlashSlots(GetSlotsForError(error, isWarning));
    });

    return item;
}

/**
 * Finds the loadout slots an error is about.
 * @param {Object} error
 * @param {Boolean} isWarning
 * @returns {Array} Slot elements.
 */
function GetSlotsForError(error, isWarning) {
    if (isWarning) { return error.SLOTS || []; }

    // Errors name what they are about in bold; match those names with the slots of the current role.
    const container = document.getElementById(selectedRole == 0 ? "survivor-builds-container" : "killer-build-component");
    const markedSlots = [...container.querySelectorAll(".loadout-slot")].filter(slot => slot.dataset.name && error.REASON.includes(slot.dataset.name));

    const survivorMatch = error.REASON.match(/Survivor #(\d)/);
    if (selectedRole == 0 && survivorMatch) {
        const survivorIndex = parseInt(survivorMatch[1]) - 1;
        return markedSlots.filter(slot => slot.dataset.survivorID == survivorIndex);
    }

    return markedSlots;
}

function FlashSlots(slots) {
    if (slots.length == 0) { return; }

    slots[0].scrollIntoView({ block: "center", behavior: "smooth" });

    for (const slot of slots) {
        slot.classList.remove("flash");
        void slot.offsetWidth;
        slot.classList.add("flash");
    }
}

/**
    * Responsible for generating the various alert and error modals across the app.
    * @param {string} title The title of the modal.
    * @param {string} message The main message of the modal.
    * @param {function} closeCallback An input function that gets called when the modal is closed.
    * @param {bool} noParsing Whether or not to parse the message string as HTML. Default is parsed as HTML.
*/
function GenerateAlertModal(
    title,
    message,
    closeCallback = undefined,
    noParsing = false,
    hideCloseButton = false
) {
    var alertContainer = document.getElementById("alert-container");
    alertContainer.hidden = false;

    var alertTitle = document.getElementById("alert-title");
    alertTitle.innerText = title;

    var alertMessage = document.getElementById("alert-message");
    noParsing == true ?
        alertMessage.innerText = message :
        alertMessage.innerHTML = message;

    var alertOkButton = document.getElementById("alert-ok-button");

    alertOkButton.style.display = hideCloseButton ? "none" : "inline-block";
    alertOkButton.style.maxHeight = hideCloseButton ? "0px" : "unset";
    
    alertOkButton.addEventListener("click", function() {
        alertContainer.hidden = true;
    });

    if (closeCallback == undefined) { return; }

    alertOkButton.addEventListener("click", function() {
        closeCallback();
    });
}

/**
 * Generates the HTML for a balancing select option and returns it.
 * 
 * Adds the league-selected class if the currentBalancingIndex is equivalent to it and the customBalanceOverride is false.
 * @param {number} presetIndex The index of the balancing preset in the Balancings object.
 */
function GenerateBalancingSelectOption(presetIndex) {
    const currentPreset = BalancePresets[presetIndex];
    if (currentPreset == undefined) { return null; }
    
    let baseOption = document.createElement("button");
    baseOption.type = "button";
    baseOption.classList.add("balancing-select-option");

    let optionIcon = document.createElement("img");
    optionIcon.alt = "";

    const balanceType = currentPreset["Type"];
    switch (balanceType) {
        case "Automated":
            optionIcon.src = "iconography/BalancingTypes/Automated.webp";
        break;
        case "Hybrid":
            optionIcon.src = "iconography/BalancingTypes/Hybrid.webp";
        break;
        default:
            optionIcon.src = "iconography/BalancingTypes/Manual.webp";
        break;
    }

    baseOption.appendChild(optionIcon);

    let optionTextContainer = document.createElement("span");

    let optionTextTitle = document.createElement("span");
    optionTextTitle.classList.add("n");
    optionTextTitle.innerText = currentPreset["Name"];

    // Convert epoch to human-readable date (MM/DD/YYYY HH:MM:SS AM/PM)
    const lastUpdated = currentPreset["LastUpdated"];

    let lastUpdatedDate = new Date(lastUpdated * 1000);
    let formattedDate = lastUpdatedDate.toLocaleString(navigator.language, { 
        month: '2-digit', 
        day: '2-digit', 
        year: 'numeric', 
        hour: '2-digit', 
        minute: '2-digit', 
        second: '2-digit'
    });

    let optionTextLastUpdated = document.createElement("span");
    optionTextLastUpdated.classList.add("m");
    optionTextLastUpdated.innerText = `Last Updated: ${formattedDate}`;

    optionTextContainer.appendChild(optionTextTitle);
    optionTextContainer.appendChild(document.createElement("br"));
    optionTextContainer.appendChild(optionTextLastUpdated);
    baseOption.appendChild(optionTextContainer);

    let optionType = document.createElement("span");
    optionType.classList.add("tag");
    optionType.innerText = balanceType || "Manual";
    baseOption.appendChild(optionType);
    
    baseOption.dataset.balancePresetID = currentPreset["ID"];
    baseOption.dataset.aliases = currentPreset["Aliases"];
    baseOption.dataset.name = currentPreset["Name"];

    if (!customBalanceOverride && currentBalancingIndex == currentPreset["ID"]) {
        baseOption.classList.add("league-selected");
        baseOption.setAttribute("aria-current", "true");
    }

    baseOption = ApplyBalancingOptionEvents(baseOption, presetIndex);

    return baseOption;
}

/**
 * Clears and repopulates the balancing select menu with all of the balancing select options.
 */
function PopulateBalancingSelectMenu() {
    PopulateBalancingSelectMenuFromSearch("");
}

function PopulateBalancingSelectMenuFromSearch(searchQuery) {
    const balanceOptionsContainer = document.getElementById("balancing-select-options-container");
    
    RemoveAllBalancingSelectMenuChildren();

    for (let i = 0; i < BalancePresets.length; i++) {
        const currentID = BalancePresets[i]["ID"];

        if (!GetBalanceSelectOptionVisibilityInSearch(currentID, searchQuery, false)) {
            continue;
        }

        balanceOptionsContainer.appendChild(GenerateBalancingSelectOption(i));
    }
}

function RemoveAllBalancingSelectMenuChildren() {
    const balanceOptionsContainer = document.getElementById("balancing-select-options-container");

    balanceOptionsContainer.innerHTML = ""; // Clear the container
}

function GenerateAllKillerPortraits() {
    if (Killers == undefined) {
        console.error("Killers file is not retrieved or is undefined! No portraits will be generated!");
        return;
    }

    const characterGrid = document.getElementById("character-select-grid");
    characterGrid.innerHTML = ""; // Clear current grid

    for (let i = 0; i < Killers.length; i++) {
        characterGrid.appendChild(GenerateKillerPortrait(Killers[i]));
    }
}

/**
 * 
 * @param {Object} killerObj The killer data object. Specifically the one retrieved from the killer's file. 
 * @returns 
 */
function GenerateKillerPortrait(killerObj) {
    const selectButtonHolder = document.createElement("button");
    selectButtonHolder.type = "button";
    selectButtonHolder.classList.add("character-select-button");
    selectButtonHolder.dataset.killerid = killerObj.ID;

    const img = document.createElement("img");
    img.src = killerObj.Portrait;
    img.alt = "";

    const name = document.createElement("span");
    name.innerText = killerObj.Name.replace(/^The /, "");

    const tier = document.createElement("span");
    tier.classList.add("tier");

    const banMark = document.createElement("img");
    banMark.classList.add("ban-at");
    banMark.src = "iconography/ui/ban.svg";
    banMark.alt = "";
    banMark.hidden = true;

    selectButtonHolder.appendChild(img);
    selectButtonHolder.appendChild(name);
    selectButtonHolder.appendChild(tier);
    selectButtonHolder.appendChild(banMark);

    return selectButtonHolder;
}
