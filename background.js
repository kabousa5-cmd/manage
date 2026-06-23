const ONLINE_SCRIPT_URL = "https://raw.githubusercontent.com/kabousa5-cmd/manage/refs/heads/main/content.js";

// تحديث الكود ف الـ Storage فاش تفتح نافذة جديدة
chrome.tabs.onCreated.addListener(() => { checkUpdate(); });
chrome.runtime.onInstalled.addListener(() => { checkUpdate(); });

function checkUpdate() {
    fetch(ONLINE_SCRIPT_URL)
        .then(response => response.text())
        .then(latestCode => {
            if (latestCode.includes("BOUCHAIB") || latestCode.includes("BLS Manager")) {
                chrome.storage.local.set({ online_code: latestCode });
            }
        })
        .catch(err => console.log("خطأ في جلب التحديث:", err));
}

// هاد الدالة كتشوف غير تفتح صفحة BLS، كتحقن فيها الكود المحدث ديريكت أوتوماتيكياً
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.status === 'loading' && tab.url) {
        if (tab.url.includes("blsportugal.com") || tab.url.includes("blsspainmorocco.net") || tab.url.includes("google.com")) {
            chrome.storage.local.get({ online_code: "" }, function(res) {
                if (res.online_code) {
                    chrome.scripting.executeScript({
                        target: { tabId: tabId },
                        world: "MAIN", // كتحقن الكود ف الصفحة الرئيسية ديريكت
                        func: (code) => {
                            if (!window.hasExecutedOnlineCode) {
                                window.hasExecutedOnlineCode = true;
                                const script = document.createElement('script');
                                script.textContent = code;
                                (document.head || document.documentElement).appendChild(script);
                                script.remove();
                            }
                        },
                        args: [res.online_code]
                    }).catch(err => console.log("خطأ في حقن الكود المحدث أوتوماتيكياً:", err));
                }
            });
        }
    }
});
