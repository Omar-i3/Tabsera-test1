/* ==========================================================================
   🌙 مساعد تبصرة الرقمي - السكربت الموحد (bot.js)
   تطوير وتصميم: عمر
   ========================================================================== */

const firebaseConfig = {
  apiKey: "AIzaSyBtBRNXE0El8yajD4KmrKHlD8-3lYG7rJc",
  authDomain: "islamic-bot-omar.firebaseapp.com",
  projectId: "islamic-bot-omar",
  storageBucket: "islamic-bot-omar.firebasestorage.app",
  messagingSenderId: "1026416229910",
  appId: "1:1026416229910:web:e18f26fe9fc3703a43bf37",
  measurementId: "G-B2SYM1YPGE"
};

firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

const WORKER_URL = "https://zad-bot-proxy.almohanadgamer.workers.dev";

const SYSTEM_INSTRUCTION = `أنت باحث شرعي ومفتي رقمي مساعد في موقع 'تبصرة'، المطوّر والمصمّم من قِبَل (عمر). مهمتك الإجابة حصراً على الأسئلة الشرعية والدينية والفقهية بكل أدب واحترام. يُلزم عليك دائماً وأبداً دعم جميع الفتاوى والأحكام بذكر الأدلة الشرعية الصريحة والمباشرة من آيات القرآن الكريم والأحاديث النبوية الصحيحة مع ذكر تخريج الحديث (مثل: رواه البخاري، رواه مسلم، صححه الألباني)، والاعتماد على مصادر كبار علماء السنة مثل ابن باز وابن عثيمين وعثمان الخميس وغيرهم مع ذكر المصادر دائماً.

تنبيهات صارمة جداً وضوابط عمل:
1. مطوّر البوت والموقع: إذا سألك المستخدم من هو مطوّر أو صانع أو مبرمج هذا الموقع/البوت، أجب بوضوح واعتزاز بأن المطوّر والصانع هو (عمر).
2. التخصص الحصري: إذا كان سؤال المستخدم خارج نطاق العلوم الشرعية والدين الإسلامي (مثل: الألعاب، البرمجة، الرياضة، الطقس، الأسئلة العامة)، يرجى الاعتذار منه بكل أدب ولطف، وإخباره بأنك مساعد مخصص حصراً للإجابات والعلوم الشرعية والدينية في موقع 'تبصرة'.
3. ضابط السلام الصارم: لا تبدأ إجابتك بالسلام ولا الترحيب (مثل: 'وعليكم السلام' أو 'أهلاً بك') إطلاقاً إلا إذا كتب المستخدم صراحة وبنص العبارة 'السلام عليكم' أو صيغها المباشرة. أما إذا كتب كلمات مثل 'أهلاً' أو 'مرحباً' أو طرَح سؤاله مباشرة، فلا ترد بالسلام أبداً وابدأ بالإجابة مباشرة.`;

let currentUser = null;
let currentChatId = localStorage.getItem('tabsirah_current_chat_id') || Date.now();
let currentChatHistory = JSON.parse(localStorage.getItem('tabsirah_current_active_chat')) || [];
let archivedChats = [];

// ⚙️ دالة فتح نافذة الإعدادات المباشرة
window.openAccountModal = function() {
    if (!currentUser) {
        alert("يرجى تسجيل الدخول أولاً للوصول إلى إعدادات الحساب!");
        return;
    }

    const modal = document.getElementById('account-modal');
    if (!modal) return;

    document.getElementById('modal-user-email').textContent = currentUser.email || '';
    document.getElementById('modal-display-name-input').value = currentUser.displayName || '';
    
    const avatarEl = document.getElementById('modal-user-avatar');
    if (avatarEl) {
        if (currentUser.photoURL) {
            avatarEl.innerHTML = `<img src="${currentUser.photoURL}" class="w-full h-full object-cover rounded-full">`;
        } else {
            avatarEl.textContent = currentUser.displayName ? currentUser.displayName[0] : '👤';
        }
    }

    modal.style.display = 'flex';
    if (window.lucide) lucide.createIcons();
};

// ❌ دالة إغلاق النافذة
window.closeAccountModal = function() {
    const modal = document.getElementById('account-modal');
    if (modal) modal.style.display = 'none';
};

// 👤 دالة النقر على بطاقة الحساب
window.handleProfileCardClick = function(e) {
    if (e.target.closest('#auth-btn')) {
        window.handleAuthAction();
        return;
    }

    if (currentUser) {
        window.openAccountModal();
    } else {
        window.handleAuthAction();
    }
};

window.handleAuthAction = function() {
    if (currentUser) {
        auth.signOut();
        window.closeAccountModal();
    } else {
        if (window.location.protocol === 'file:') {
            alert("⚠️ لتسجيل الدخول، يرجى تشغيل الموقع عبر Live Server أو استضافة حية.");
            return;
        }
        const provider = new firebase.auth.GoogleAuthProvider();
        auth.signInWithPopup(provider).catch(err => alert("خطأ في تسجيل الدخول: " + err.message));
    }
};

document.addEventListener('DOMContentLoaded', () => {
    if (window.lucide) lucide.createIcons();

    const chatForm = document.getElementById('chat-form');
    const chatInput = document.getElementById('chat-input');
    const chatMessages = document.getElementById('chat-messages');
    const saveAccountChangesBtn = document.getElementById('save-account-changes-btn');
    const modalLogoutBtn = document.getElementById('modal-logout-btn');
    const accountModal = document.getElementById('account-modal');

    chatInput?.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            chatForm?.dispatchEvent(new Event('submit'));
        }
    });

    chatInput?.addEventListener('input', function() {
        this.style.height = 'auto';
        this.style.height = (this.scrollHeight) + 'px';
    });

    auth.onAuthStateChanged((user) => {
        currentUser = user;
        updateUserUI(user);
        loadArchivedChats();
    });

    accountModal?.addEventListener('click', (e) => {
        if (e.target === accountModal) window.closeAccountModal();
    });

    saveAccountChangesBtn?.addEventListener('click', async () => {
        if (!currentUser) return;
        const newNameInput = document.getElementById('modal-display-name-input');
        const newName = newNameInput?.value.trim();

        if (!newName) {
            alert("يرجى إدخال اسم صحيح.");
            return;
        }

        try {
            await currentUser.updateProfile({ displayName: newName });
            updateUserUI(currentUser);
            window.closeAccountModal();
            alert("تم تحديث اسمك بنجاح! ✨");
        } catch (error) {
            alert("حدث خطأ أثناء تعديل الاسم: " + error.message);
        }
    });

    modalLogoutBtn?.addEventListener('click', () => {
        auth.signOut();
        window.closeAccountModal();
    });

    function updateUserUI(user) {
        const userNameEl = document.getElementById('user-name');
        const userStatusEl = document.getElementById('user-status');
        const userAvatarEl = document.getElementById('user-avatar');
        const authBtn = document.getElementById('auth-btn');
        
        if (user) {
            userNameEl.textContent = user.displayName || 'مستخدم مسجّل';
            userStatusEl.textContent = user.email;
            authBtn.textContent = 'خروج';
            authBtn.className = 'text-xs bg-red-600/20 text-red-400 border border-red-500/30 hover:bg-red-600 hover:text-white px-2 py-1 rounded-lg transition font-medium';
            userAvatarEl.innerHTML = user.photoURL ? `<img src="${user.photoURL}" class="w-full h-full object-cover">` : (user.displayName ? user.displayName[0] : '👤');
        } else {
            userNameEl.textContent = 'زائر';
            userStatusEl.textContent = 'غير مسجّل';
            authBtn.textContent = 'دخول';
            authBtn.className = 'text-xs bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-600 hover:text-white px-2.5 py-1 rounded-lg transition font-medium';
            userAvatarEl.innerHTML = '👤';
        }
    }

    setupSidebarUI();
    renderChatView();

    chatForm?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const userText = chatInput.value.trim();
        if (!userText) return;

        const welcomeScreen = document.getElementById('welcome-screen');
        if (welcomeScreen) welcomeScreen.remove();

        chatInput.disabled = true;
        appendMessageUI(userText, 'user');
        chatInput.value = '';
        chatInput.style.height = 'auto';

        const loadingDiv = appendLoadingBubble();
        currentChatHistory.push({ role: "user", content: userText });
        saveCurrentChat();

        const messagesPayload = [
            { role: "system", content: SYSTEM_INSTRUCTION },
            ...currentChatHistory.slice(-10)
        ];

        try {
            const response = await fetch(WORKER_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    model: "deepseek-chat",
                    messages: messagesPayload,
                    stream: false
                })
            });

            if (!response.ok) throw new Error(`HTTP Error: ${response.status}`);

            const data = await response.json();
            let botResponse = data.choices[0].message.content;

            const userSaidSalam = /السلام\s+عليكم/i.test(userText);
            if (!userSaidSalam) {
                botResponse = botResponse.replace(/^(وعليكم السلام ورحمة الله وبركاته|وعليكم السلام ورحمة الله|وعليكم السلام|السلام عليكم ورحمة الله وبركاته|السلام عليكم)[!،.\n\s]*/gi, '').trim();
            }

            if (loadingDiv) loadingDiv.remove();
            appendMessageUI(botResponse, 'bot');

            currentChatHistory.push({ role: "assistant", content: botResponse });
            saveCurrentChat();
            await saveChatSession();

        } catch (error) {
            if (loadingDiv) loadingDiv.remove();
            appendMessageUI('عذراً، حدث خطأ في الاتصال بالخادم: ' + error.message, 'bot');
        } finally {
            chatInput.disabled = false;
            chatInput.focus();
        }
    });

    function appendMessageUI(text, sender) {
        const msgWrapper = document.createElement('div');
        
        if (sender === 'user') {
            msgWrapper.className = 'flex justify-end my-2';
            msgWrapper.innerHTML = `
                <div class="bg-emerald-600 text-white px-4 py-2.5 rounded-2xl rounded-tl-none max-w-xl text-sm leading-relaxed shadow-sm">
                    ${formatText(text)}
                </div>
            `;
        } else {
            msgWrapper.className = 'flex gap-2.5 justify-start max-w-3xl my-2';
            const msgId = 'msg-' + Date.now();
            msgWrapper.innerHTML = `
                <div class="w-7 h-7 rounded-lg bg-emerald-600/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30 shrink-0 mt-0.5">
                    <i data-lucide="bot" class="w-4 h-4"></i>
                </div>
                <div class="bg-slate-900 border border-slate-800 text-slate-200 px-4 py-3 rounded-2xl rounded-tr-none text-sm leading-relaxed shadow-sm space-y-2 w-full">
                    <div>${formatText(text)}</div>
                    <div class="flex items-center gap-3 mt-2 pt-2 border-t border-slate-800/80 text-xs text-slate-400">
                        <button onclick="copyToClipboard('${msgId}', this)" class="hover:text-emerald-400 flex items-center gap-1 transition">
                            <i data-lucide="copy" class="w-3.5 h-3.5"></i> نسخ
                        </button>
                        <button onclick="shareWhatsApp('${msgId}')" class="hover:text-emerald-400 flex items-center gap-1 transition">
                            <i data-lucide="share-2" class="w-3.5 h-3.5"></i> واتساب
                        </button>
                    </div>
                </div>
            `;
            msgWrapper.setAttribute('data-raw-text', text);
            msgWrapper.id = msgId;
        }

        chatMessages.appendChild(msgWrapper);
        chatMessages.scrollTop = chatMessages.scrollHeight;
        if (window.lucide) lucide.createIcons();
        return msgWrapper;
    }

    function appendLoadingBubble() {
        const id = 'loading-' + Date.now();
        const msgDiv = document.createElement('div');
        msgDiv.id = id;
        msgDiv.className = 'flex gap-2.5 justify-start max-w-3xl my-2';
        msgDiv.innerHTML = `
            <div class="w-7 h-7 rounded-lg bg-emerald-600/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30 shrink-0">
                <i data-lucide="bot" class="w-4 h-4"></i>
            </div>
            <div class="bg-slate-900 border border-slate-800 text-slate-400 px-4 py-2.5 rounded-2xl rounded-tr-none text-sm flex items-center gap-2">
                <span class="w-2 h-2 bg-emerald-400 rounded-full animate-ping"></span>
                جاري التفكير وتحضير الرد الشرعي...
            </div>
        `;
        chatMessages.appendChild(msgDiv);
        chatMessages.scrollTop = chatMessages.scrollHeight;
        if (window.lucide) lucide.createIcons();
        return msgDiv;
    }

    function formatText(text) {
        return text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\n/g, '<br>');
    }

    function setupSidebarUI() {
        const sidebar = document.getElementById('sidebar');
        const overlay = document.getElementById('sidebar-overlay');
        const toggleBtn = document.getElementById('toggle-sidebar-btn');
        const closeBtn = document.getElementById('close-sidebar-btn');
        const newChatBtn = document.getElementById('new-chat-btn');

        const toggleSidebar = () => {
            sidebar?.classList.toggle('translate-x-full');
            overlay?.classList.toggle('hidden');
        };

        toggleBtn?.addEventListener('click', toggleSidebar);
        closeBtn?.addEventListener('click', toggleSidebar);
        overlay?.addEventListener('click', toggleSidebar);

        newChatBtn?.addEventListener('click', () => {
            currentChatHistory = [];
            currentChatId = Date.now();
            localStorage.setItem('tabsirah_current_chat_id', currentChatId);
            localStorage.removeItem('tabsirah_current_active_chat');
            renderChatView();
            loadArchivedChats();
            if (window.innerWidth < 768) toggleSidebar();
        });
    }

    function renderChatView() {
        chatMessages.innerHTML = '';
        if (currentChatHistory.length > 0) {
            currentChatHistory.forEach(msg => appendMessageUI(msg.content, msg.role === 'user' ? 'user' : 'bot'));
        } else {
            renderWelcomeScreen();
        }
    }

    function renderWelcomeScreen() {
        chatMessages.innerHTML = `
            <div id="welcome-screen" class="flex flex-col items-center justify-center min-h-[65vh] text-center space-y-5">
                <div class="w-14 h-14 rounded-2xl bg-emerald-600/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center shadow-lg">
                    <i data-lucide="sparkles" class="w-7 h-7"></i>
                </div>
                <div class="space-y-1">
                    <h2 class="text-xl font-bold text-slate-100">السلام عليكم ورحمة الله وبركاته</h2>
                    <p class="text-slate-400 text-xs max-w-sm">أنا مساعد تبصرة الرقمي، كيف يمكنني مساعدتك اليوم؟</p>
                </div>
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-2.5 w-full max-w-xl pt-2">
                    <button onclick="sendQuickPrompt('ما هي آداب وأوقات إجابة الدعاء؟')" class="p-3 bg-slate-900 border border-slate-800 hover:border-emerald-500/40 rounded-xl text-right transition group">
                        <p class="text-xs font-semibold text-slate-200 group-hover:text-emerald-400">آداب الدعاء المستجاب</p>
                        <p class="text-[10px] text-slate-500 mt-0.5">تعرف على الأوقات والشروط التي يُرجى فيها القبول</p>
                    </button>
                    <button onclick="sendQuickPrompt('اذكر لي أذكار الصباح كاملة')" class="p-3 bg-slate-900 border border-slate-800 hover:border-emerald-500/40 rounded-xl text-right transition group">
                        <p class="text-xs font-semibold text-slate-200 group-hover:text-emerald-400">أذكار الصباح والمساء</p>
                        <p class="text-[10px] text-slate-500 mt-0.5">الأدعية والأذكار الحافظة من السنة النبوية</p>
                    </button>
                </div>
            </div>
        `;
        if (window.lucide) lucide.createIcons();
    }

    function saveCurrentChat() {
        localStorage.setItem('tabsirah_current_active_chat', JSON.stringify(currentChatHistory));
        localStorage.setItem('tabsirah_current_chat_id', currentChatId);
    }

    async function saveChatSession() {
        if (!currentChatHistory || currentChatHistory.length === 0) return;
        if (!currentChatHistory.some(m => m.role === 'user')) return;

        const sessionData = {
            id: Number(currentChatId),
            date: new Date().toLocaleString('ar-SA', { dateStyle: 'short', timeStyle: 'short' }),
            messages: [...currentChatHistory]
        };

        if (currentUser) {
            await db.collection('users').doc(currentUser.uid).collection('chats').doc(String(sessionData.id)).set(sessionData);
        } else {
            let localArchives = JSON.parse(localStorage.getItem('tabsirah_archived_chats')) || [];
            const index = localArchives.findIndex(s => Number(s.id) === Number(sessionData.id));
            if (index !== -1) {
                localArchives[index] = sessionData;
            } else {
                localArchives.unshift(sessionData);
            }
            if (localArchives.length > 25) localArchives.pop();
            localStorage.setItem('tabsirah_archived_chats', JSON.stringify(localArchives));
            renderSidebarHistory(localArchives);
        }
    }

    async function loadArchivedChats() {
        if (currentUser) {
            db.collection('users').doc(currentUser.uid).collection('chats').orderBy('id', 'desc').limit(25).onSnapshot(snapshot => {
                archivedChats = snapshot.docs.map(doc => doc.data());
                renderSidebarHistory(archivedChats);
            });
        } else {
            archivedChats = JSON.parse(localStorage.getItem('tabsirah_archived_chats')) || [];
            renderSidebarHistory(archivedChats);
        }
    }

    function renderSidebarHistory(archives) {
        const historyContainer = document.getElementById('history-list');
        if (!historyContainer) return;

        archives = archives.filter(session => session.messages && session.messages.some(m => m.role === 'user'));

        if (archives.length === 0) {
            historyContainer.innerHTML = `<p class="text-[11px] text-slate-500 text-center py-3">لا توجد محادثات</p>`;
            return;
        }

        historyContainer.innerHTML = archives.map((session) => {
            const firstUserMsg = session.messages.find(m => m.role === 'user')?.content || 'محادثة';
            const shortTitle = firstUserMsg.length > 20 ? firstUserMsg.substring(0, 20) + '...' : firstUserMsg;
            const activeClass = Number(session.id) === Number(currentChatId) ? 'bg-slate-800/90 border-emerald-500/30' : '';
            
            return `
                <div class="group flex items-center justify-between p-2 rounded-lg hover:bg-slate-800 transition cursor-pointer border border-transparent ${activeClass}" onclick="resumeSession(${session.id})">
                    <div class="flex items-center gap-2 overflow-hidden">
                        <i data-lucide="message-square" class="w-3.5 h-3.5 text-slate-500 shrink-0"></i>
                        <span class="text-xs text-slate-300 truncate font-medium">${shortTitle}</span>
                    </div>
                    <button onclick="event.stopPropagation(); deleteSession(${session.id})" class="opacity-0 group-hover:opacity-100 text-slate-500 hover:text-red-400 text-xs p-0.5 transition">✕</button>
                </div>
            `;
        }).join('');
        if (window.lucide) lucide.createIcons();
    }

    window.sendQuickPrompt = (text) => {
        const input = document.getElementById('chat-input');
        if (input) {
            input.value = text;
            document.getElementById('chat-form')?.dispatchEvent(new Event('submit'));
        }
    };

    window.resumeSession = (id) => {
        const selected = archivedChats.find(s => Number(s.id) === Number(id));
        if (!selected) return;

        currentChatId = selected.id;
        currentChatHistory = selected.messages;
        saveCurrentChat();
        renderChatView();
        renderSidebarHistory(archivedChats);
    };

    window.deleteSession = async (id) => {
        if (currentUser) {
            await db.collection('users').doc(currentUser.uid).collection('chats').doc(String(id)).delete();
        } else {
            archivedChats = archivedChats.filter(s => Number(s.id) !== Number(id));
            localStorage.setItem('tabsirah_archived_chats', JSON.stringify(archivedChats));
            renderSidebarHistory(archivedChats);
        }

        if (Number(currentChatId) === Number(id)) {
            currentChatHistory = [];
            currentChatId = Date.now();
            saveCurrentChat();
            renderChatView();
        }
    };

    window.copyToClipboard = (msgId, btn) => {
        const el = document.getElementById(msgId);
        const text = el ? el.getAttribute('data-raw-text') : '';
        if (text) {
            navigator.clipboard.writeText(text);
            btn.innerHTML = `<i data-lucide="check" class="w-3.5 h-3.5 text-emerald-400"></i> تم`;
            if (window.lucide) lucide.createIcons();
            setTimeout(() => {
                btn.innerHTML = `<i data-lucide="copy" class="w-3.5 h-3.5"></i> نسخ`;
                if (window.lucide) lucide.createIcons();
            }, 2000);
        }
    };

    window.shareWhatsApp = (msgId) => {
        const el = document.getElementById(msgId);
        const text = el ? el.getAttribute('data-raw-text') : '';
        if (text) {
            window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent("*من تطبيق تبصرة:*\n\n" + text)}`, '_blank');
        }
    };
});
// تسجيل Service Worker لتفعيل الـ PWA
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(err => console.log('SW registration failed:', err));
  });
}
// 📱 الكشف المباشر عن جهاز الآيفون وإظهار البنر إذا لم يكن الموقع مثبتاً كـ PWA
document.addEventListener('DOMContentLoaded', () => {
  const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
  const isStandalone = window.navigator.standalone || window.matchMedia('(display-mode: standalone)').matches;

  // يظهر البنر فقط إذا كان الجهاز آيفون والموقع مفتوح عبر المتصفح وليس كـ تطبيق مثبّت
  if (isIOS && !isStandalone) {
    const iosBanner = document.getElementById('ios-install-banner');
    if (iosBanner) iosBanner.classList.remove('hidden');
  }
});