// ==UserScript==
// @name         BLS Manager - Ultimate Auto Address Fix (Online Update Version)
// @version      56.07
// @match        https://morocco.blsportugal.com/*
// @match        https://*.blsspainmorocco.net/*
// @match        https://www.google.com/*
// @match        https://google.com/*
// ==/UserScript==

(function() {
    'use strict';

    // ⚠️ حط هنا الرابط المباشر (RAW) ديال الكود ديالك أونلاين
   // ⚠️ حط هنا الرابط المباشر (RAW) ديال الكود ديالك أونلاين
const ONLINE_SCRIPT_URL = "https://raw.githubusercontent.com/kabousa5-cmd/manage/refs/heads/main/content.js"; 

    // أولاً: التأكد واش كاين كود محدث فالمتصفح وتشغيله
    chrome.storage.local.get({ online_code: null }, function(res) {
        if (res.online_code && !window.hasExecutedOnlineCode) {
            window.hasExecutedOnlineCode = true;
            try {
                eval(res.online_code);
                return; // حبس الكود القديم حيت الجديد تلونصا بـ eval
            } catch (e) {
                console.error("خطأ في تشغيل الكود المحدث، سيتم إستعمال الكود المحلي:", e);
            }
        }
        
        // إذا لم يكن هناك كود أونلاين محفوظ، يتم تشغيل الكود العادي الحالي:
        startExtensionLogic();
    });

    function startExtensionLogic() {
        let activeFolder = localStorage.getItem("bls_active_folder") || "BOUCHAIB";
        let openedCentres = JSON.parse(localStorage.getItem("bls_opened_centres")) || [];
        let openedFamilies = JSON.parse(localStorage.getItem("bls_opened_families")) || [];
        let searchQuery = "";
        let isTyping = false;
        let currentFamilyMembers = [];

        const SELECTORS = {
            FirstName: ['input[name*="FirstName"]', '#FirstName', 'input[id*="firstname"]'],
            LastName: ['input[name*="LastName"]', '#LastName', 'input[id*="lastname"]'],
            PassportNo: ['input[name*="PassportNo"]', '#PassportNo', 'input[id*="passportno"]'],
            PlaceOfBirth: ['input[name*="PlaceOfBirth"]', '#PlaceOfBirth'],
            IssuePlace: ['input[name*="IssuePlace"]', '#IssuePlace'],
            TravelDate: ['input[name*="TravelDate"]', '#TravelDate'],
            DOB: ['input[name*="DOB"]', 'input[name*="DateOfBirth"]', '#DateOfBirth', '#DOB'],
            MaritalStatus: ['select[name*="MaritalStatus"]', '#MaritalStatus'],
            Gender: ['select[name*="Gender"]', 'input[name="Gender"]', '#Gender'],
            PassportIssueDate: ['input[name*="PassportIssueDate"]', 'input[name*="IssueDate"]', '#PassportIssueDate'],
            PassportExpiryDate: ['input[name*="PassportExpiryDate"]', 'input[name*="ExpiryDate"]', '#PassportExpiryDate'],
            HomeAddressLine1: ['textarea[name*="Address"]', 'input[name*="HomeAddressLine1"]', '#HomeAddressLine1', 'input[id*="address1"]'],
            HomeAddressCity: ['select[name*="City"]', 'select[name*="HomeAddressCity"]', '#City', 'input[name*="City"]'],
            HomeAddressPostalCode: ['input[name*="PostCode"]', 'input[name*="PostalCode"]', '#PostCode', '#HomeAddressPostalCode', 'input[name*="HomeAddressPostalCode"]']
        };

        var globalProfiles = [];

        function addFiveYears(dateString) {
            if (!dateString) return "";
            var dateObj = new Date(dateString);
            if (isNaN(dateObj.getTime())) return dateString;
            dateObj.setFullYear(dateObj.getFullYear() + 5);
            var yyyy = dateObj.getFullYear();
            var mm = String(dateObj.getMonth() + 1).padStart(2, '0');
            var dd = String(dateObj.getDate()).padStart(2, '0');
            return `${yyyy}-${mm}-${dd}`;
        }

        function getCityDefaults(centreName) {
            let cityName = "CASABLANCA"; let postalCode = "20000";
            if (centreName) {
                let upperCentre = centreName.toUpperCase();
                if (upperCentre.includes("RABAT")) { cityName = "RABAT"; postalCode = "10000"; }
                else if (upperCentre.includes("NADOR")) { cityName = "NADOR"; postalCode = "62000"; }
                else if (upperCentre.includes("TANGIER") || upperCentre.includes("TANGER")) { cityName = "TANGER"; postalCode = "90000"; }
                else if (upperCentre.includes("TETOUAN")) { cityName = "TETOUAN"; postalCode = "93000"; }
                else if (upperCentre.includes("AGADIR")) { cityName = "AGADIR"; postalCode = "80000"; }
            }
            return { address: cityName + " MOROCCO STREET 10", city: cityName, zip: postalCode };
        }

        function isCorrectPage() {
            const currentUrl = window.location.href;
            if (currentUrl.includes("google.com")) return true;
            const pageText = document.body.innerText || "";
            if (pageText.includes("Manage Applicants") && !pageText.includes("Relationship With Primary Applicant")) return false;
            return pageText.includes("Add New Member") || document.querySelector('input[name*="FirstName"]') !== null || document.querySelector('input[name*="PassportNo"]') !== null;
        }

        function simulateHumanTyping(element, value) {
            if (!element) return;
            element.focus(); element.value = "";
            element.dispatchEvent(new Event('focus', { bubbles: true }));
            for (let i = 0; i < value.length; i++) {
                let char = value[i]; let keycode = char.charCodeAt(0);
                element.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, key: char, keyCode: keycode }));
                element.dispatchEvent(new KeyboardEvent('keypress', { bubbles: true, key: char, keyCode: keycode }));
                element.value += char;
                element.dispatchEvent(new Event('input', { bubbles: true }));
                element.dispatchEvent(new KeyboardEvent('keyup', { bubbles: true, key: char, keyCode: keycode }));
            }
            element.dispatchEvent(new Event('change', { bubbles: true }));
            element.dispatchEvent(new Event('blur', { bubbles: true }));
        }

        function forceSelectDropdown(field, textValue) {
            if (!field || !textValue) return;
            field.focus(); let found = false;
            for (let i = 0; i < field.options.length; i++) {
                let optText = field.options[i].text.toUpperCase();
                let optVal = field.options[i].value.toUpperCase();
                let target = textValue.toUpperCase();
                if (optText.includes(target) || target.includes(optText) || optVal === target) { field.selectedIndex = i; found = true; break; }
            }
            if (!found && field.options.length > 1) { field.selectedIndex = 1; }
            field.dispatchEvent(new Event('change', { bubbles: true }));
            field.dispatchEvent(new Event('blur', { bubbles: true }));
        }

        function injectDataToFields(data) {
            if (!isCorrectPage()) return;
            let detectedCentre = data.Centre || data.HomeAddressCity || "CASABLANCA";
            let backupDefaults = getCityDefaults(detectedCentre);
            Object.keys(SELECTORS).forEach(function(key) {
                var possibleSelectors = SELECTORS[key]; var field = null;
                for (var j = 0; j < possibleSelectors.length; j++) { field = document.querySelector(possibleSelectors[j]); if (field) break; }
                if (field) {
                    let valToInject = data[key] ? data[key].trim() : "";
                    if (!valToInject) {
                        if (key === 'HomeAddressLine1') valToInject = backupDefaults.address;
                        if (key === 'HomeAddressCity') valToInject = backupDefaults.city;
                        if (key === 'HomeAddressPostalCode') valToInject = backupDefaults.zip;
                    }
                    if (valToInject) { if (field.tagName === 'SELECT') { forceSelectDropdown(field, valToInject); } else { simulateHumanTyping(field, valToInject); } }
                }
            });
        }

        function watchIssueDateInPage() {
            if (!isCorrectPage()) return;
            let issueField = null; for (let sel of SELECTORS.PassportIssueDate) { issueField = document.querySelector(sel); if (issueField) break; }
            let expiryField = null; for (let sel of SELECTORS.PassportExpiryDate) { expiryField = document.querySelector(sel); if (expiryField) break; }
            if (issueField && expiryField && !issueField.dataset.watched) {
                issueField.dataset.watched = "true";
                const updateAction = function() {
                    if (issueField.value) { let calculatedExpiry = addFiveYears(issueField.value); if (expiryField.value !== calculatedExpiry) { simulateHumanTyping(expiryField, calculatedExpiry); } }
                };
                issueField.addEventListener('input', updateAction); issueField.addEventListener('change', updateAction);
            }
        }

        function fetchProfilesFromServer() {
            if (!isCorrectPage() || isTyping) return;
            chrome.storage.local.get({ bls_profiles: [] }, function(result) {
                globalProfiles = result.bls_profiles;
                renderUsersButtons();
            });
        }

        function saveProfileToServer(profileObj, id = null) {
            chrome.storage.local.get({ bls_profiles: [] }, function(result) {
                let list = result.bls_profiles;
                if (id) {
                    let idx = list.findIndex(p => p.id === id);
                    if (idx !== -1) list[idx] = { id: id, ...profileObj };
                } else {
                    profileObj.id = "p_" + Date.now() + "_" + Math.floor(Math.random()*1000);
                    list.push(profileObj);
                }
                chrome.storage.local.set({ bls_profiles: list }, function() { fetchProfilesFromServer(); });
            });
        }

        function deleteProfileFromServer(id, callback = null) {
            chrome.storage.local.get({ bls_profiles: [] }, function(result) {
                let list = result.bls_profiles.filter(p => p.id !== id);
                chrome.storage.local.set({ bls_profiles: list }, function() { if(callback) callback(); else fetchProfilesFromServer(); });
            });
        }

        function deleteWholeFolder(folderName) {
            chrome.storage.local.get({ bls_profiles: [] }, function(result) {
                let list = result.bls_profiles.filter(p => (p.createdBy || "آخرون") !== folderName);
                chrome.storage.local.set({ bls_profiles: list }, function() {
                    alert(`✅ تم حذف مجلد [${folderName}] بالكامل!`);
                    if (activeFolder === folderName) { activeFolder = "BOUCHAIB"; localStorage.setItem("bls_active_folder", "BOUCHAIB"); }
                    fetchProfilesFromServer();
                });
            });
        }

        function clearAllProfilesOnServer() {
            chrome.storage.local.set({ bls_profiles: [] }, function() { fetchProfilesFromServer(); alert("🚨 تم مسح السيرفر بالكامل!"); });
        }

        function exportProfilesAsJSON() {
            if(globalProfiles.length === 0) { alert("السيرفر فارغ!"); return; }
            var dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(globalProfiles, null, 2));
            var downloadAnchor = document.createElement('a');
            downloadAnchor.setAttribute("href", dataStr);
            downloadAnchor.setAttribute("download", `BLS_Backup_${new Date().toISOString().slice(0,10)}.json`);
            document.body.appendChild(downloadAnchor); downloadAnchor.click(); downloadAnchor.remove();
        }

        function importProfilesFromJSON(event) {
            const file = event.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = function(e) {
                try {
                    const importedData = JSON.parse(e.target.result);
                    if (!Array.isArray(importedData)) { alert("❌ صيغة الملف غير صحيحة."); return; }
                    if (confirm(`🔄 هل تريد استيراد ورفع (${importedData.length}) بروفايلات؟`)) {
                        chrome.storage.local.get({ bls_profiles: [] }, function(result) {
                            let list = result.bls_profiles;
                            importedData.forEach(function(profile) {
                                list.push({
                                    id: "p_" + Date.now() + "_" + Math.floor(Math.random()*10000),
                                    name: profile.name || "بدون اسم",
                                    createdBy: profile.createdBy || "مستورد",
                                    data: profile.data || {},
                                    familyId: profile.familyId || null
                                });
                            });
                            chrome.storage.local.set({ bls_profiles: list }, function() {
                                alert(`✅ تم استيراد ورفع البروفايلات بنجاح!`);
                                fetchProfilesFromServer();
                            });
                        });
                    }
                } catch (err) { alert("❌ خطأ في قراءة ملف الـ JSON!"); }
            };
            reader.readAsText(file); event.target.value = '';
        }

        // 🌟 دالة تحديث السكريبت أونلاين عند الضغط على الزر
        function checkAndApplyOnlineUpdate() {
            const updateBtn = document.getElementById('btn-online-update');
            if(updateBtn) updateBtn.innerText = "⏳ جاري التحديث...";
            
            fetch(ONLINE_SCRIPT_URL)
                .then(response => {
                    if (!response.ok) throw new Error("تعذر الاتصال بالسيرفر");
                    return response.text();
                })
                .then(latestCode => {
                    if (latestCode.includes("BOUCHAIB") || latestCode.includes("BLS Manager")) {
                        chrome.storage.local.set({ online_code: latestCode }, function() {
                            alert("✅ تم تحديث السكريبت بنجاح! سيتم إعادة تحميل الصفحة لتطبيق التغييرات.");
                            window.location.reload();
                        });
                    } else {
                        alert("❌ خطأ: الملف الموجود أونلاين غير متوافق أو فارغ!");
                        if(updateBtn) updateBtn.innerText = "🔄 ميزاجور أونلاين";
                    }
                })
                .catch(err => {
                    alert("❌ فشل التحديث! تأكد من اتصال الإنترنت أو رابط الكود.");
                    if(updateBtn) updateBtn.innerText = "🔄 ميزاجور أونلاين";
                    console.error(err);
                });
        }

        function createNewFolder() {
            var folderName = prompt("أدخل اسم الصديق / المجلد الجديد:", "");
            if (folderName && folderName.trim() !== "") {
                folderName = folderName.trim().toUpperCase(); activeFolder = folderName;
                localStorage.setItem("bls_active_folder", folderName);
                var welcomeData = { name: "مجلد جديد فارغ", createdBy: folderName, data: { FirstName: "فارغ", LastName: "فارغ", PassportNo: "000000", Country: "", Centre: "", BookingType: "Individual" } };
                saveProfileToServer(welcomeData);
                document.getElementById('current-active-folder-lbl').innerText = folderName;
                alert(`✅ تم إنشاء مجلد باسم: ${folderName}`);
            }
        }

        function renderUsersButtons() {
            var friendsContainer = document.getElementById("friends-folders-container");
            if (!friendsContainer) return; friendsContainer.innerHTML = "";
            var searchWrapper = document.createElement('div'); searchWrapper.style.cssText = 'padding: 2px 0 8px 0; width:100%;';
            var searchInput = document.createElement('input'); searchInput.type = "text"; searchInput.id = "global-client-search-bar";
            searchInput.placeholder = "🔍 ابحث هنا عن أي كليان بالاسم أو الباسبور..."; searchInput.value = searchQuery;
            searchInput.style.cssText = 'width: 100% !important; background: #282a36 !important; border: 2px solid #50fa7b !important; color: #fff !important; padding: 7px 10px !important; border-radius: 6px !important; font-size: 12px !important; box-sizing: border-box; text-align: right; direction: rtl; font-weight: bold;';
            searchInput.onfocus = function() { isTyping = true; }; searchInput.onblur = function() { if(this.value === "") isTyping = false; };
            searchInput.oninput = function() {
                searchQuery = this.value.toUpperCase(); isTyping = (searchQuery !== ""); renderFoldersAndCentres();
                var inputEl = document.getElementById("global-client-search-bar"); if (inputEl) { inputEl.focus(); inputEl.setSelectionRange(inputEl.value.length, inputEl.value.length); }
            };
            searchWrapper.appendChild(searchInput); friendsContainer.appendChild(searchWrapper);
            renderFoldersAndCentres();
        }

        function renderFoldersAndCentres() {
            var friendsContainer = document.getElementById("friends-folders-container"); if (!friendsContainer) return;
            Array.from(friendsContainer.children).forEach(ch => { if(ch.id !== "global-client-search-bar" && !ch.contains(document.getElementById("global-client-search-bar"))) ch.remove(); });
            var grouped = {};
            globalProfiles.forEach(function(profile) { var owner = profile.createdBy || "آخرون"; if (!grouped[owner]) grouped[owner] = []; grouped[owner].push(profile); });
            if (!grouped[activeFolder]) grouped[activeFolder] = [];
            Object.keys(grouped).forEach(function(friendName) {
                var hasMatchingClient = grouped[friendName].some(function(p) { if (searchQuery === "") return false; return (p.name && p.name.includes(searchQuery)) || (p.data && p.data.PassportNo && p.data.PassportNo.includes(searchQuery)); });
                var containerDiv = document.createElement('div'); containerDiv.style.cssText = 'display: flex !important; flex-direction: column !important; margin-bottom: 6px !important; width: 100% !important; background: #212330; border-radius: 6px; overflow:hidden; border: 1px solid #44475a;';
                var rowTop = document.createElement('div'); rowTop.style.cssText = 'display: flex !important; width: 100% !important; align-items: center !important;';
                var friendBtn = document.createElement('button'); var isActive = (friendName === activeFolder) || hasMatchingClient;
                let indCount = grouped[friendName].filter(p => !p.data || p.data.BookingType !== 'Family').length;
                let uniqueFamilies = new Set(); grouped[friendName].forEach(p => { if(p.data && p.data.BookingType === 'Family') uniqueFamilies.add(p.familyId || p.data.LastName || 'Family'); });
                let famCount = uniqueFamilies.size;
                friendBtn.style.cssText = `flex: 1 !important; background: ${isActive ? 'linear-gradient(135deg, #282a36, #44475a)' : 'transparent'} !important; border: none !important; color: ${isActive ? '#50fa7b' : '#8be9fd'} !important; padding: 10px !important; font-size: 12px !important; font-weight: bold !important; text-align: right !important; cursor: pointer !important; display: flex !important; justify-content: space-between !important; align-items: center !important;`;
                friendBtn.innerHTML = `<span>👤 مجلد: ${friendName} ${(friendName === activeFolder) ? ' ⭐' : ''}</span> <span style="display:flex; gap:3px;"><span style="background:#8be9fd; color:#000; padding:1px 4px; border-radius:4px; font-size:9px; font-weight:bold;">مفرد: ${indCount}</span><span style="background:#ff79c6; color:#000; padding:1px 4px; border-radius:4px; font-size:9px; font-weight:bold;">عائلات: ${famCount}</span></span>`;
                rowTop.appendChild(friendBtn); containerDiv.appendChild(rowTop);
                var contentSubDiv = document.createElement('div'); contentSubDiv.style.cssText = 'padding: 4px; border-top: 1px dashed #44475a; display: none; background: #13141f;';
                containerDiv.appendChild(contentSubDiv); if (isActive) { contentSubDiv.style.display = "block"; buildCentresInsidePanel(contentSubDiv, grouped[friendName], friendName); }
                let folderPressTimer;
                friendBtn.addEventListener('mousedown', function(e) { if(e.button !== 0) return; folderPressTimer = setTimeout(function() { if (confirm(`🚨 حذف مجلد [${friendName}] بالكامل؟`)) deleteWholeFolder(friendName); }, 8000); });
                friendBtn.addEventListener('mouseup', function() { clearTimeout(folderPressTimer); if (friendName !== activeFolder) { activeFolder = friendName; localStorage.setItem("bls_active_folder", friendName); fetchProfilesFromServer(); } });
                friendBtn.addEventListener('mouseleave', function() { clearTimeout(folderPressTimer); });
                friendsContainer.appendChild(containerDiv);
            });
        }

        function buildCentresInsidePanel(targetContainer, clientsList, currentFolder) {
            var Structure = { "SPAIN": {}, "PORTUGAL": {}, "OTHER": {} };
            var filteredClients = clientsList.filter(function(profile) { if (searchQuery === "") return true; return (profile.name && profile.name.includes(searchQuery)) || (profile.data && profile.data.PassportNo && profile.data.PassportNo.includes(searchQuery)); });
            filteredClients.forEach(function(profile) {
                var country = (profile.data && profile.data.Country) ? profile.data.Country.toUpperCase() : "OTHER";
                var centre = (profile.data && profile.data.Centre) ? profile.data.Centre.toUpperCase() : "غير محدد";
                if (!Structure[country]) Structure[country] = {}; if (!Structure[country][centre]) Structure[country][centre] = []; Structure[country][centre].push(profile);
            });
            function renderCountrySection(countryKey, countryLabel, labelColor) {
                var centresObj = Structure[countryKey]; var centresKeys = Object.keys(centresObj); if (centresKeys.length === 0) return;
                var countryTitle = document.createElement('div'); countryTitle.style.cssText = `font-size: 10px; font-weight: bold; color: ${labelColor}; padding: 4px 2px 2px 0; border-bottom: 1px solid #44475a; margin-top: 5px; text-align: right;`;
                countryTitle.innerText = countryLabel; targetContainer.appendChild(countryTitle);
                centresKeys.sort().forEach(function(centreName) {
                    var centreWrapper = document.createElement('div'); centreWrapper.style.cssText = 'margin: 3px 0; width: 100%;';
                    var uniqueCentreKey = currentFolder + "_" + countryKey + "_" + centreName;
                    let indC = centresObj[centreName].filter(p => !p.data || p.data.BookingType !== 'Family').length;
                    let uniqueFamsInCentre = new Set(); centresObj[centreName].forEach(p => { if(p.data && p.data.BookingType === 'Family') uniqueFamsInCentre.add(p.familyId || p.data.LastName || 'Family'); });
                    let famC = uniqueFamsInCentre.size;
                    var centreHeader = document.createElement('div');
                    centreHeader.style.cssText = 'background: #282a36 !important; color: #ff79c6 !important; padding: 4px 6px !important; border-radius: 4px !important; font-size: 11px !important; font-weight: bold; display: flex; justify-content: space-between; align-items: center; cursor: pointer; border-right: 3px solid #ff79c6;';
                    centreHeader.innerHTML = `<span>📍 ${centreName}</span> <span style="display:flex; gap:3px;"><span style="background:#50fa7b; color:#000; padding:0px 4px; border-radius:4px; font-size:9px;">فردي: ${indC}</span><span style="background:#ff79c6; color:#000; padding:0px 4px; border-radius:4px; font-size:9px;">عائلات: ${famC}</span></span>`;
                    centreWrapper.appendChild(centreHeader);
                    var clientsListDiv = document.createElement('div'); clientsListDiv.style.cssText = 'padding-right: 4px; margin-top: 2px;';
                    if (searchQuery !== "" || openedCentres.includes(uniqueCentreKey)) { clientsListDiv.style.display = "block"; centreHeader.style.background = "#44475a"; } else { clientsListDiv.style.display = "none"; centreHeader.style.background = "#282a36"; }
                    var individuals = []; var familiesGrouped = {};
                    centresObj[centreName].forEach(function(profile) {
                        if (profile.data && profile.data.BookingType === 'Family') {
                            let fId = profile.familyId || profile.data.LastName || "FAMILLE_INCONNUE"; if (!familiesGrouped[fId]) familiesGrouped[fId] = []; familiesGrouped[fId].push(profile);
                        } else { individuals.push(profile); }
                    });
                    if (Object.keys(familiesGrouped).length > 0) {
                        Object.keys(familiesGrouped).forEach(function(familyId) {
                            var famMembers = familiesGrouped[familyId]; var familyBlock = document.createElement('div');
                            familyBlock.style.cssText = 'background: #212330; border: 1px solid #ff79c6; border-radius: 6px; margin-bottom: 4px; overflow: hidden;';
                            var famHeader = document.createElement('div'); famHeader.style.cssText = 'background: #2d132c; color: #ff79c6; padding: 4px 8px; font-size: 11px; font-weight: bold; cursor: pointer; display: flex; justify-content: space-between; align-items: center;';
                            let uniqueFamCollapseKey = uniqueCentreKey + "_" + familyId; let isFamOpen = openedFamilies.includes(uniqueFamCollapseKey) || searchQuery !== "";
                            famHeader.innerHTML = `<span>👨‍👩‍👧‍👦 عائلة: ${familyId}</span> <span style="background:#ff79c6; color:#000; padding:0 5px; border-radius:4px; font-size:10px;">${famMembers.length} أفراد</span>`;
                            familyBlock.appendChild(famHeader);
                            var famContent = document.createElement('div'); famContent.style.cssText = 'padding: 3px;'; famContent.style.display = isFamOpen ? "block" : "none";
                            famMembers.forEach(function(profile) { createClientRow(profile, famContent); });
                            famHeader.onclick = function() {
                                if (famContent.style.display === "none") openedFamilies.push(uniqueFamCollapseKey); else openedFamilies = openedFamilies.filter(k => k !== uniqueFamCollapseKey);
                                localStorage.setItem("bls_opened_families", JSON.stringify(openedFamilies)); renderFoldersAndCentres();
                            };
                            familyBlock.appendChild(famContent); clientsListDiv.appendChild(familyBlock);
                        });
                    }
                    if (individuals.length > 0) { individuals.forEach(function(profile) { createClientRow(profile, clientsListDiv); }); }
                    centreHeader.onclick = function() {
                        if (clientsListDiv.style.display === "none") openedCentres = [uniqueCentreKey]; else openedCentres = [];
                        localStorage.setItem("bls_opened_centres", JSON.stringify(openedCentres)); renderFoldersAndCentres();
                    };
                    centreWrapper.appendChild(clientsListDiv); targetContainer.appendChild(centreWrapper);
                });
            }
            function createClientRow(profile, container) {
                var bTypeLabel = (profile.data && profile.data.BookingType === 'Family') ? ' <span style="color:#ff79c6; font-size:9px;">[عائلة]</span>' : ' <span style="color:#50fa7b; font-size:9px;">[فردي]</span>';
                var clientRow = document.createElement('div');
                clientRow.style.cssText = 'display: flex !important; align-items: center !important; justify-content: space-between !important; background: #1e1f29 !important; padding: 6px !important; margin-bottom: 2px; border-radius: 4px !important; border: 1px solid #44475a !important; cursor:pointer; font-size:11px;';
                clientRow.innerHTML = `<div style="flex-grow:1; text-align:right;"><b>${profile.name}</b> ${bTypeLabel} <span style="color:#ffb86c; font-size:10px;">(${profile.data.PassportNo || ''})</span></div>`;
                var actions = document.createElement('div'); actions.style.cssText = 'display:flex; gap:3px;';
                var edit = document.createElement('button'); edit.innerText = "✏️"; edit.style.cssText = 'background:transparent; border:none; cursor:pointer; font-size:11px;';
                edit.onclick = function(e) { e.stopPropagation(); showProfileForm(profile.id); };
                actions.appendChild(edit); clientRow.appendChild(actions);
                let clientPressTimer;
                clientRow.addEventListener('mousedown', function(e) { if (e.target.tagName === 'BUTTON') return; clientPressTimer = setTimeout(function() { if (confirm(`حذف الكليان: ${profile.name}؟`)) deleteProfileFromServer(profile.id); }, 4000); });
                clientRow.addEventListener('mouseup', function(e) { if (e.target.tagName === 'BUTTON') return; clearTimeout(clientPressTimer); injectDataToFields(profile.data); clientRow.style.background = "#50fa7b"; setTimeout(() => { clientRow.style.background = "#1e1f29"; }, 600); });
                clientRow.addEventListener('mouseleave', function() { clearTimeout(clientPressTimer); });
                container.appendChild(clientRow);
            }
            renderCountrySection("SPAIN", "🇪🇸 إسبانيا (SPAIN)", "#ff5555");
            renderCountrySection("PORTUGAL", "🇵🇹 البرتغال (PORTUGAL)", "#50fa7b");
        }

        function showProfileForm(profileId = null) {
            currentFamilyMembers = []; var isEdit = profileId !== null; var targetProfile = isEdit ? globalProfiles.find(p => p.id === profileId) : null;
            var p = isEdit ? targetProfile.data : { FirstName:"", LastName:"", PassportNo:"", PlaceOfBirth:"CASABLANCA", IssuePlace:"CASABLANCA", TravelDate:"2026-07-30", DOB:"", MaritalStatus:"", Gender:"", PassportIssueDate:"", PassportExpiryDate:"", Country:"", Centre:"", BookingType: "Individual", HomeAddressLine1: "", HomeAddressCity: "", HomeAddressPostalCode: "" };
            var pName = isEdit ? targetProfile.name : ""; var currentFolderOfProfile = isEdit ? targetProfile.createdBy : activeFolder;
            var availableFolders = []; globalProfiles.forEach(function(prof) { var fName = prof.createdBy || "آخرون"; if (!availableFolders.includes(fName)) availableFolders.push(fName); });
            if (!availableFolders.includes(activeFolder)) availableFolders.push(activeFolder); availableFolders.sort();
            var modal = document.createElement('div'); modal.id = 'universal-form-modal';
            modal.style.cssText = 'position: fixed !important; top: 50% !important; left: 50% !important; transform: translate(-50%, -50%) !important; z-index: 2147483647 !important; background: #1e1f29 !important; border: 2px solid #50fa7b !important; border-radius: 12px !important; padding: 0 !important; width: 330px !important; max-height: 90vh !important; overflow-y: auto !important; color: #fff !important; text-align: right !important; direction:rtl; box-shadow: 0 0 30px rgba(0,0,0,0.7);';
            let folderOptionsHTML = ""; availableFolders.forEach(function(f) { folderOptionsHTML += `<option value="${f}" ${f === currentFolderOfProfile ? 'selected' : ''}>📁 ${f}</option>`; });
            var modalHeader = document.createElement('div'); modalHeader.id = 'modal-drag-handle'; modalHeader.style.cssText = 'background: #50fa7b; color: #000; font-weight: bold; font-size: 13px; padding: 10px; text-align: center; border-top-left-radius: 10px; border-top-right-radius: 10px; user-select: none;';
            modalHeader.innerText = isEdit ? '✏️ تعديل بيانات الكليان' : '➕ إضافة كليان يدوي'; modal.appendChild(modalHeader);
            var modalBody = document.createElement('div'); modalBody.style.cssText = 'padding: 15px;';
            modalBody.innerHTML = `
                <label style="font-size:11px; font-weight:bold; color:#8be9fd;">📁 حفظ داخل مجلد:</label>
                <select id="m_save_folder" style="width:100%; margin-bottom:10px; background:#282a36; border:1px solid #8be9fd; color:#fff; padding:5px; border-radius:4px; font-weight:bold;">${folderOptionsHTML}</select>
                <label style="font-size:11px; font-weight:bold; color:#ff79c6;">📦 نوع الحجز:</label>
                <select id="m_booking_type" style="width:100%; margin-bottom:10px; background:#282a36; border:1px solid #ff79c6; color:#fff; padding:5px; border-radius:4px; font-weight:bold;">
                    <option value="Individual" ${p.BookingType !== 'Family' ? 'selected' : ''}>Individual (فردي)</option>
                    <option value="Family" ${p.BookingType === 'Family' ? 'selected' : ''}>Family (عائلة)</option>
                </select>
                <label style="font-size:11px; font-weight:bold; color:#ff79c6;">🌍 الدولة:</label>
                <select id="m_country" style="width:100%; margin-bottom:6px; background:#282a36; border:1px solid #ff79c6; color:#fff; padding:5px; border-radius:4px; font-weight:bold;">
                    <option value="">-- اختر الدولة --</option>
                    <option value="SPAIN" ${p.Country === 'SPAIN' ? 'selected' : ''}>Spain (إسبانيا)</option>
                    <option value="PORTUGAL" ${p.Country === 'PORTUGAL' ? 'selected' : ''}>Portugal (البرتغال)</option>
                </select>
                <label style="font-size:11px; font-weight:bold; color:#ff79c6;">📍 المركز:</label>
                <select id="m_centre" style="width:100%; margin-bottom:10px; background:#282a36; border:1px solid #ff79c6; color:#fff; padding:5px; border-radius:4px; font-weight:bold;"><option value="">-- اختر المركز --</option></select>
                <hr style="border:0; border-top:1px dashed #44475a; margin-bottom:10px;">
                <label style="font-size:11px; color:#ff79c6; font-weight:bold;" id="lbl_m_name">اسم الملف / اللقب الموحد:</label>
                <input type="text" id="m_name" value="${isEdit ? (targetProfile.familyId || pName) : ''}" placeholder="مثال: OMAR FAMILLE" style="width:100%; margin-bottom:8px; background:#282a36; border:2px solid #ff79c6; color:#fff; padding:6px; border-radius:4px; font-weight:bold;">
                <label style="font-size:11px; color:#50fa7b; font-weight:bold;">First Name (الاسم الشخصي):</label>
                <input type="text" id="m_fname" value="${p.FirstName || ''}" style="width:100%; margin-bottom:6px; background:#282a36; border:1px solid #50fa7b; color:#fff; padding:5px; border-radius:4px; font-weight:bold;">
                <label style="font-size:11px; color:#ffb86c; font-weight:bold;">Last Name (اللقب / العائلة):</label>
                <input type="text" id="m_lname" value="${p.LastName || ''}" style="width:100%; margin-bottom:6px; background:#282a36; border:1px solid #ffb86c; color:#fff; padding:5px; border-radius:4px; font-weight:bold;">
                <label style="font-size:11px; color:#aaa; font-weight:bold;">Passport No (رقم الجواز):</label>
                <input type="text" id="m_pno" value="${p.PassportNo || ''}" style="width:100%; margin-bottom:6px; background:#282a36; border:1px solid #44475a; color:#fff; padding:5px; border-radius:4px; font-weight:bold;">
                <label style="font-size:11px; color:#aaa;">تاريخ الازدياد:</label>
                <input type="date" id="m_dob" value="${p.DOB || ''}" style="width:100%; margin-bottom:6px; background:#282a36; border:1px solid #44475a; color:#fff; padding:5px; border-radius:4px;">
                <label style="font-size:11px; color:#aaa;">الحالة العائلية:</label>
                <select id="m_marital" style="width:100%; margin-bottom:6px; background:#282a36; border:1px solid #44475a; color:#fff; padding:5px; border-radius:4px;">
                    <option value="">-- اختر --</option>
                    <option value="Single" ${p.MaritalStatus === 'Single' ? 'selected' : ''}>Single</option>
                    <option value="Married" ${p.MaritalStatus === 'Married' ? 'selected' : ''}>Married</option>
                    <option value="Divorced" ${p.MaritalStatus === 'Divorced' ? 'selected' : ''}>Divorced</option>
                    <option value="Widow" ${p.MaritalStatus === 'Widow' ? 'selected' : ''}>Widow</option>
                </select>
                <label style="font-size:11px; color:#aaa;">الجنس:</label>
                <select id="m_gender" style="width:100%; margin-bottom:6px; background:#282a36; border:1px solid #44475a; color:#fff; padding:5px; border-radius:4px;">
                    <option value="">-- اختر --</option>
                    <option value="Male" ${p.Gender === 'Male' ? 'selected' : ''}>Male</option>
                    <option value="Female" ${p.Gender === 'Female' ? 'selected' : ''}>Female</option>
                </select>
                <label style="font-size:11px; font-weight:bold; color:#50fa7b;">تاريخ إصدار الجواز:</label>
                <input type="date" id="m_issue_date" value="${p.PassportIssueDate || ''}" style="width:100%; margin-bottom:6px; background:#282a36; border:1px solid #50fa7b; color:#fff; padding:5px; border-radius:4px;">
                <label style="font-size:11px; font-weight:bold; color:#ffb86c;">تاريخ انتهاء الجواز:</label>
                <input type="date" id="m_expiry_date" value="${p.PassportExpiryDate || ''}" style="width:100%; margin-bottom:12px; background:#282a36; border:1px solid #ffb86c; color:#fff; padding:5px; border-radius:4px;">
                <button id="modal_add_member" style="width:100%; background:#ff79c6; border:none; color:#000; padding:10px; font-weight:bold; border-radius:6px; cursor:pointer; margin-bottom:8px; display:none; font-size:12px;">🔄 إضافة فرد آخر للعائلة (+)</button>
                <div style="display:flex; gap:6px;">
                    <button id="modal_save" style="flex:1; background:#50fa7b; border:none; color:#000; padding:10px; font-weight:bold; border-radius:6px; cursor:pointer;">حفظ وإنهاء</button>
                    <button id="modal_cancel" style="flex:1; background:#ff5555; border:none; color:#fff; padding:10px; font-weight:bold; border-radius:6px; cursor:pointer;">إلغاء</button>
                </div>
            `;
            modal.appendChild(modalBody); document.body.appendChild(modal); makeElementDraggable(modal, modalHeader);
            const countrySelect = document.getElementById('m_country'); const centreSelect = document.getElementById('m_centre');
            const folderSelect = document.getElementById('m_save_folder'); const bookingTypeSelect = document.getElementById('m_booking_type');
            const mIssueInput = document.getElementById('m_issue_date'); const mExpiryInput = document.getElementById('m_expiry_date');
            const mNameInput = document.getElementById('m_name'); const mFnameInput = document.getElementById('m_fname');
            const mLnameInput = document.getElementById('m_lname'); const lblName = document.getElementById('lbl_m_name');
            const mAddMemberBtn = document.getElementById('modal_add_member');
            function handleBookingTypeChange() { if (bookingTypeSelect.value === 'Family') { lblName.innerText = "اسم الملف (اسم العائلة الموحد):"; if (!isEdit) mAddMemberBtn.style.display = 'block'; } else { lblName.innerText = "اسم الملف الكامل للبحث:"; mAddMemberBtn.style.display = 'none'; } }
            bookingTypeSelect.addEventListener('change', handleBookingTypeChange); handleBookingTypeChange();
            mNameInput.addEventListener('input', function() { if (bookingTypeSelect.value === 'Individual') { let fullName = mNameInput.value.trim(); if (fullName) { let parts = fullName.split(/\s+/); if (parts.length > 0) { mFnameInput.value = parts[0].toUpperCase(); if (parts.length > 1) mLnameInput.value = parts.slice(1).join(" ").toUpperCase(); else mLnameInput.value = ""; } } } });
            mIssueInput.addEventListener('input', function() { if (this.value) { mExpiryInput.value = addFiveYears(this.value); } });
            function updateCentres(selectedCountry, currentCentreValue) {
                centreSelect.innerHTML = '<option value="">-- اختر المركز --</option>'; let centres = [];
                if (selectedCountry === "SPAIN") centres = ["CASABLANCA", "RABAT", "NADOR", "TANGIER", "TETOUAN", "AGADIR"]; else if (selectedCountry === "PORTUGAL") centres = ["CASABLANCA", "RABAT"];
                centres.forEach(function(c) { let opt = document.createElement('option'); opt.value = c; opt.innerText = c; if (c === currentCentreValue) opt.selected = true; centreSelect.appendChild(opt); });
            }
            updateCentres(p.Country, p.Centre); countrySelect.addEventListener('change', function() { updateCentres(this.value, ""); });
            mAddMemberBtn.onclick = function() {
                var familyFileId = mNameInput.value.trim().toUpperCase(); var firstNameInput = mFnameInput.value.trim().toUpperCase(); var lastNameInput = mLnameInput.value.trim().toUpperCase(); var passportNum = document.getElementById('m_pno').value.trim().toUpperCase();
                if(!familyFileId) { alert("الرجاء إدخال اسم ملف العائلة الموحد أولاً!"); return; } if(!firstNameInput || !lastNameInput || !passportNum) { alert("الرجاء إدخال بيانات الفرد الحالي!"); return; }
                let defaults = getCityDefaults(centreSelect.value);
                var memberData = { name: firstNameInput + " " + lastNameInput, createdBy: folderSelect.value, familyId: familyFileId, data: { FirstName: firstNameInput, LastName: lastNameInput, PassportNo: passportNum, PlaceOfBirth: p.PlaceOfBirth, IssuePlace: p.IssuePlace, TravelDate: p.TravelDate, DOB: document.getElementById('m_dob').value, MaritalStatus: document.getElementById('m_marital').value, Gender: document.getElementById('m_gender').value, PassportIssueDate: mIssueInput.value, PassportExpiryDate: mExpiryInput.value, Country: countrySelect.value, Centre: centreSelect.value, BookingType: "Family", HomeAddressLine1: defaults.address, HomeAddressCity: defaults.city, HomeAddressPostalCode: defaults.zip } };
                currentFamilyMembers.push(memberData); mFnameInput.value = ""; mLnameInput.value = ""; document.getElementById('m_pno').value = ""; document.getElementById('m_dob').value = ""; mIssueInput.value = ""; mExpiryInput.value = ""; mFnameInput.focus();
            };
            document.getElementById('modal_save').onclick = function() {
                var familyFileId = mNameInput.value.trim().toUpperCase(); if (!familyFileId) { alert("الرجاء إدخال اسم الملف أولاً!"); return; }
                var currentFirstName = mFnameInput.value.trim().toUpperCase(); var currentLastName = mLnameInput.value.trim().toUpperCase(); var currentPassport = document.getElementById('m_pno').value.trim().toUpperCase();
                let defaults = getCityDefaults(centreSelect.value);
                if (bookingTypeSelect.value === 'Family') {
                    if (currentFirstName && currentLastName && currentPassport) {
                        var lastMember = { name: currentFirstName + " " + currentLastName, createdBy: folderSelect.value, familyId: familyFileId, data: { FirstName: currentFirstName, LastName: currentLastName, PassportNo: currentPassport, PlaceOfBirth: p.PlaceOfBirth, IssuePlace: p.IssuePlace, TravelDate: p.TravelDate, DOB: document.getElementById('m_dob').value, MaritalStatus: document.getElementById('m_marital').value, Gender: document.getElementById('m_gender').value, PassportIssueDate: mIssueInput.value, PassportExpiryDate: mExpiryInput.value, Country: countrySelect.value, Centre: centreSelect.value, BookingType: "Family", HomeAddressLine1: defaults.address, HomeAddressCity: defaults.city, HomeAddressPostalCode: defaults.zip } };
                        currentFamilyMembers.push(lastMember);
                    }
                } else {
                    var singleMember = { name: familyFileId, createdBy: folderSelect.value, familyId: null, data: { FirstName: currentFirstName, LastName: currentLastName, PassportNo: currentPassport, PlaceOfBirth: p.PlaceOfBirth, IssuePlace: p.IssuePlace, TravelDate: p.TravelDate, DOB: document.getElementById('m_dob').value, MaritalStatus: document.getElementById('m_marital').value, Gender: document.getElementById('m_gender').value, PassportIssueDate: mIssueInput.value, PassportExpiryDate: mExpiryInput.value, Country: countrySelect.value, Centre: centreSelect.value, BookingType: "Individual", HomeAddressLine1: defaults.address, HomeAddressCity: defaults.city, HomeAddressPostalCode: defaults.zip } };
                    currentFamilyMembers.push(singleMember);
                }
                if (currentFamilyMembers.length > 0) {
                    let count = 0;
                    currentFamilyMembers.forEach(prof => { saveProfileToServer(prof, isEdit ? targetProfile.id : null); count++; });
                    modal.remove(); alert(`✅ تم حفظ الملف لـ (${count}) أفراد بنجاح.`);
                } else { alert("لا توجد بيانات كافية لحفظها!"); }
            };
            document.getElementById('modal_cancel').onclick = function() { modal.remove(); };
        }

        function captureDirectly() {
            if (!isCorrectPage()) return; var extractedData = {};
            Object.keys(SELECTORS).forEach(function(key) {
                var possibleSelectors = SELECTORS[key]; var element = null; for (var j = 0; j < possibleSelectors.length; j++) { element = document.querySelector(possibleSelectors[j]); if (element) break; }
                if (element && element.value) { extractedData[key] = element.value.trim().toUpperCase(); } else { extractedData[key] = ""; }
            });
            if (extractedData.PassportIssueDate && !extractedData.PassportExpiryDate) extractedData.PassportExpiryDate = addFiveYears(extractedData.PassportIssueDate);
            let defaults = getCityDefaults(extractedData.HomeAddressCity || "CASABLANCA");
            if(!extractedData.HomeAddressLine1) extractedData.HomeAddressLine1 = defaults.address;
            if(!extractedData.HomeAddressCity) extractedData.HomeAddressCity = defaults.city;
            if(!extractedData.HomeAddressPostalCode) extractedData.HomeAddressPostalCode = defaults.zip;
            extractedData.Country = extractedData.Country || ""; extractedData.Centre = extractedData.Centre || extractedData.HomeAddressCity || "CASABLANCA"; extractedData.BookingType = "Individual";
            var profileName = ((extractedData.FirstName || "") + " " + (extractedData.LastName || "")).trim().toUpperCase() || "PROFIL";
            saveProfileToServer({ name: profileName, createdBy: activeFolder, data: extractedData, familyId: null });
            alert(`✅ تم التقاط البيانات وحفظها بنجاح في مجلد: ${activeFolder}`);
        }

        function makeElementDraggable(dragTarget, dragHandle) {
            var pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0; dragHandle.style.cursor = "move"; dragHandle.onmousedown = dragMouseDown;
            function dragMouseDown(e) { e = e || window.event; if (e.target.tagName === 'BUTTON' || e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') return; e.preventDefault(); pos3 = e.clientX; pos4 = e.clientY; document.onmouseup = closeDragElement; document.onmousemove = elementDrag; }
            function elementDrag(e) { e = e || window.event; e.preventDefault(); pos1 = pos3 - e.clientX; pos2 = pos4 - e.clientY; pos3 = e.clientX; pos4 = e.clientY; dragTarget.style.top = (dragTarget.offsetTop - pos2) + "px"; dragTarget.style.left = (dragTarget.offsetLeft - pos1) + "px"; dragTarget.style.right = "auto"; }
            function closeDragElement() { document.onmouseup = null; document.onmousemove = null; }
        }

        function buildPanel() {
            if (!isCorrectPage() || document.getElementById('bls-autofill-panel')) return;
            var panel = document.createElement('div'); panel.id = 'bls-autofill-panel';
            panel.style.cssText = 'position: fixed !important; top: 70px !important; right: 20px !important; z-index: 2147483647 !important; background: #1a1c23 !important; border: 3px solid #50fa7b !important; border-radius: 12px !important; padding: 10px !important; width: 310px !important; height: 515px !important; box-shadow: 0 0 20px rgba(0,255,120,0.5) !important; font-family: Arial, sans-serif !important; color: #fff !important; display: flex !important; flex-direction: column !important; resize: both !important; overflow: hidden !important;';
            var headerHandle = document.createElement('div'); headerHandle.style.cssText = 'width: 100%; border-bottom:1px solid #44475a; padding-bottom:4px; margin-bottom:8px; text-align:center; user-select: none; position: relative;';
            headerHandle.innerHTML = `<div style="position: absolute; left: 0; top: 0; display: flex; gap: 4px;"><button id="btn-minimize-panel" style="background: #ffb86c; border: none; font-size: 10px; padding: 1px 6px; border-radius: 4px; cursor: pointer;">-</button><button id="btn-maximize-panel" style="background: #50fa7b; border: none; font-size: 10px; padding: 1px 5px; border-radius: 4px; cursor: pointer;">+</button></div><div style="font-size:13px; font-weight:bold; color:#50fa7b;">👑 الـمـاسـتـر: BOUCHAIB</div><div style="font-size:10px; color:#ff79c6; margin-top:2px;">المجلد النشط: <span id="current-active-folder-lbl" style="font-weight:bold; color:#fff;">${activeFolder}</span></div>`;
            panel.appendChild(headerHandle);
            var mainContentBody = document.createElement('div'); mainContentBody.style.cssText = 'display: flex; flex-direction: column; flex-grow: 1; overflow: hidden;';
            mainContentBody.innerHTML = `
                <div>
                    <!-- 🌟 زر التحديث أونلاين المضاف حديثاً -->
                    <button id="btn-online-update" style="background: linear-gradient(135deg, #007bff, #0056b3) !important; color: #fff !important; border: 1px solid #fff !important; padding: 6px !important; margin-bottom:6px; border-radius: 6px !important; font-weight: bold !important; cursor: pointer !important; width:100%; font-size:12px;">🔄 ميزاجور أونلاين (Update Script)</button>
                    
                    <button id="btn-capture" style="background: #ff79c6 !important; color: #000 !important; border: 1px solid #fff !important; padding: 8px 4px !important; margin-bottom:5px; border-radius: 6px !important; font-weight: bold !important; cursor: pointer !important; width:100%;">📸 سحب وحفظ الكليان (CAPTURE)</button>
                    <div style="display:flex; gap:4px; margin-bottom:5px;">
                        <button id="btn-add-folder" style="flex:1; background: #ff5555 !important; color: #fff !important; border: none !important; padding: 7px !important; border-radius: 6px !important; font-weight: bold !important; font-size:11px; cursor: pointer !important;">📁 إضافة مجلد صديق</button>
                        <button id="btn-add-manual" style="flex:1; background: #00bcd4 !important; color: #fff !important; border: none !important; padding: 7px !important; border-radius: 6px !important; font-weight: bold !important; font-size:11px; cursor: pointer !important;">➕ إضافة كليان يدوي</button>
                    </div>
                    <div style="display:flex; gap:4px; margin-bottom:8px;">
                        <button id="btn-export" style="flex:1; background: #ffb86c !important; color: #000 !important; border: none !important; padding: 5px !important; border-radius: 4px !important; font-size:11px; font-weight: bold !important; cursor: pointer !important;">📥 Backup</button>
                        <button id="btn-import-trigger" style="flex:1; background: #50fa7b !important; color: #000 !important; border: none !important; padding: 5px !important; border-radius: 4px !important; font-size:11px; font-weight: bold !important; cursor: pointer !important;">📥 Import</button>
                        <button id="btn-wipe-all" style="flex:1; background: #3a0000 !important; color: #fff !important; border: 1px solid #ff5555 !important; padding: 5px !important; border-radius: 4px !important; font-size:11px; font-weight: bold !important; cursor: pointer !important;">🚨 مسح الكل</button>
                    </div>
                    <input type="file" id="bls-import-file-input" accept=".json" style="display: none !important;">
                </div>
                <div id="friends-folders-container" style="flex-grow: 1; overflow-y:auto; border-top: 1px solid #44475a; padding-top:6px;"></div>
            `;
            panel.appendChild(mainContentBody); document.body.appendChild(panel); makeElementDraggable(panel, headerHandle);
            document.getElementById('btn-minimize-panel').onclick = function() { mainContentBody.style.display = 'none'; panel.style.height = '60px'; };
            document.getElementById('btn-maximize-panel').onclick = function() { mainContentBody.style.display = 'flex'; panel.style.height = '515px'; };
            document.getElementById('btn-online-update').onclick = checkAndApplyOnlineUpdate;
            document.getElementById('btn-capture').onclick = captureDirectly; document.getElementById('btn-add-folder').onclick = createNewFolder;
            document.getElementById('btn-add-manual').onclick = function() { showProfileForm(); }; document.getElementById('btn-export').onclick = exportProfilesAsJSON;
            const fileInput = document.getElementById('bls-import-file-input'); document.getElementById('btn-import-trigger').onclick = function() { fileInput.click(); };
            fileInput.addEventListener('change', importProfilesFromJSON); document.getElementById('btn-wipe-all').onclick = function() { if (confirm("🚨 مسح قاعدة البيانات بالكامل?")) clearAllProfilesOnServer(); };
            fetchProfilesFromServer();
        }

        setInterval(function() {
            if (isCorrectPage()) { if (!document.getElementById('bls-autofill-panel')) buildPanel(); watchIssueDateInPage(); }
            else { var p = document.getElementById('bls-autofill-panel'); if (p) p.remove(); }
        }, 1500);
    }
})();
