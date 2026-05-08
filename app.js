// ====== Firebase Setup ======
const firebaseConfig = { apiKey: "AIzaSyB2Gv7FXkDP5AJEm2MrZBEin6rN8YZwnK8", authDomain: "betbd-be722.firebaseapp.com", projectId: "betbd-be722", storageBucket: "betbd-be722.firebasestorage.app", messagingSenderId: "192673970713", appId: "1:192673970713:web:778a960157b5ff48638888", measurementId: "G-VE56XQM64X" };
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

// ====== Global Variables ======
let currentUser = null, userData = null, gameSettings = { chance: 45, mode: 'none' }, liveNumbers = { bKash: "", Nagad: "", Rocket: "" }, tvChart = null, candleSeries = null, currentPrice = 65000, currentCandle = null, activeGame = "";

// ====== Realtime Listeners ======
db.collection("settings").doc("game_config").onSnapshot(d => { if(d.exists) gameSettings = d.data(); });
db.collection("settings").doc("admin_numbers").onSnapshot(d => { if(d.exists) { liveNumbers = d.data(); updateDepositMethodsUI(); } });

// ====== App Functions (1 Line Per Function) ======
const showPopup = (m, t='error') => { const c = document.getElementById('toast-container'), e = document.createElement('div'); e.className = `glass border-l-4 ${t==='error'?'border-red-500 text-red-400':t==='success'?'border-green-500 text-green-400':'border-blue-500 text-blue-400'} p-3 rounded-xl shadow-2xl toast-enter font-bold text-sm flex items-center bg-slate-900 pointer-events-auto mt-2`; e.innerHTML = `<i class="fa-solid ${t==='error'?'fa-circle-xmark':'fa-check-circle'} text-lg mr-3"></i> <span>${m}</span>`; c.prepend(e); setTimeout(() => { e.style.opacity='0'; e.style.transform='translateY(-20px)'; setTimeout(()=>e.remove(),300); }, 3000); };

const toggleAuth = t => { document.getElementById('login-form').classList[t==='log'?'remove':'add']('hidden-section'); document.getElementById('reg-form').classList[t==='reg'?'remove':'add']('hidden-section'); };

const registerUser = () => { const n = document.getElementById('reg-name').value, e = document.getElementById('reg-email').value, p = document.getElementById('reg-pass').value; if(!n||!e||!p) return showPopup("সবগুলো ঘর পূরণ করুন!"); if(p.length<6) return showPopup("পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের হতে হবে!"); auth.createUserWithEmailAndPassword(e, p).then(c => db.collection("users").doc(c.user.uid).set({ name:n, email:e, balance:100, role:'user', createdAt:firebase.firestore.FieldValue.serverTimestamp() })).then(() => showPopup("একাউন্ট খোলা সফল!", "success")).catch(err => showPopup(err.message)); };

const loginUser = () => { const e = document.getElementById('log-email').value, p = document.getElementById('log-pass').value; if(!e||!p) return showPopup("ইমেইল ও পাসওয়ার্ড দিন!"); auth.signInWithEmailAndPassword(e, p).then(() => showPopup("লগিন সফল!", "success")).catch(() => showPopup("ভুল তথ্য দিয়েছেন!")); };

const logout = () => auth.signOut();

auth.onAuthStateChanged(u => { currentUser = u; if(u){ db.collection("users").doc(u.uid).onSnapshot(d => { if(d.exists){ userData = d.data(); document.getElementById('user-balance').innerText = (parseFloat(userData.balance)||0).toFixed(2); } }); document.getElementById('auth-section').classList.add('hidden-section'); document.getElementById('app-section').classList.remove('hidden-section'); initTrading(); } else { document.getElementById('auth-section').classList.remove('hidden-section'); document.getElementById('app-section').classList.add('hidden-section'); } });
const openGame = n => { activeGame = n; const t = document.getElementById('active-game-title'), d = document.getElementById('game-result-display'), p = document.getElementById('game-play-area'); if(t) t.innerText = n; if(d) d.innerText = "?"; if(p) p.classList.remove('hidden-section'); window.scrollTo(0, document.body.scrollHeight); };

const playGenericGame = () => { const b = parseFloat(document.getElementById('game-bet').value), cb = parseFloat(userData.balance)||0; if(isNaN(b)||b<10) return showPopup("সর্বনিম্ন বেট ১০!"); if(b>cb) return showPopup("পর্যাপ্ত টাকা নেই!"); db.collection("users").doc(currentUser.uid).update({ balance: cb-b }); document.getElementById('game-result-display').innerHTML='<i class="fa-solid fa-spinner fa-spin text-blue-500"></i>'; setTimeout(() => { let w = gameSettings.mode==='win'?true:gameSettings.mode==='lose'?false:Math.random()<(gameSettings.chance/100); if(w){ db.collection("users").doc(currentUser.uid).update({ balance:(cb-b)+(b*2) }); document.getElementById('game-result-display').innerHTML=`<span class="text-green-500">WIN +${b*2}৳</span>`; showPopup("জয়লাভ!", "success"); } else { document.getElementById('game-result-display').innerHTML='<span class="text-red-500">LOST</span>'; showPopup("হেরেছেন!"); } }, 1500); };

const initTrading = () => { if(tvChart) return; const c = document.getElementById('tv-chart'); tvChart = LightweightCharts.createChart(c, { layout:{background:{type:'solid',color:'#0f172a'},textColor:'#94a3b8'}, grid:{vertLines:{color:'#1e293b'},horzLines:{color:'#1e293b'}}, crosshair:{mode:0}, timeScale:{timeVisible:true} }); candleSeries = tvChart.addCandlestickSeries({ upColor:'#22c55e', downColor:'#ef4444', borderVisible:false, wickUpColor:'#22c55e', wickDownColor:'#ef4444' }); const h=[]; let t=Math.floor(Date.now()/1000)-3600, l=65000; for(let i=0;i<60;i++){ const o=l, cl=o+(Math.random()*100-50); h.push({ time:t+(i*60), open:o, high:Math.max(o,cl)+20, low:Math.min(o,cl)-20, close:cl }); l=cl; } candleSeries.setData(h); currentPrice=l; currentCandle={ time:Math.floor(Date.now()/1000), open:l, high:l, low:l, close:l }; setInterval(() => { const v=(Math.random()*20)-10; currentPrice+=v; currentCandle.close=currentPrice; currentCandle.high=Math.max(currentCandle.high,currentPrice); currentCandle.low=Math.min(currentCandle.low,currentPrice); candleSeries.update(currentCandle); document.getElementById('live-price').innerText=currentPrice.toFixed(2); document.getElementById('live-price').className=v>=0?"text-2xl font-mono text-green-400 bg-slate-900 py-2 rounded-xl mb-4":"text-2xl font-mono text-red-400 bg-slate-900 py-2 rounded-xl mb-4"; if(Math.floor(Date.now()/1000)%10===0) currentCandle={time:Math.floor(Date.now()/1000),open:currentPrice,high:currentPrice,low:currentPrice,close:currentPrice}; }, 500); new ResizeObserver(e => { if(e.length>0 && e[0].target===c) tvChart.applyOptions({width:c.clientWidth,height:c.clientHeight}); }).observe(c); };

const placeTrade = dir => { const a = parseInt(document.getElementById('trade-amount').value), cb = parseFloat(userData.balance)||0; if(isNaN(a)||a<100) return showPopup("সর্বনিম্ন ১০০!"); if(a>cb) return showPopup("ব্যালেন্স অপর্যাপ্ত!"); db.collection("users").doc(currentUser.uid).update({ balance:cb-a }); showPopup(`ট্রেড প্লেস: ${dir}`, "success"); const s = currentPrice, bx = document.createElement('div'); bx.className = `p-2 mb-2 rounded border-l-4 ${dir==='CALL'?'border-green-500':'border-red-500'} bg-slate-800`; bx.innerHTML = `${dir} - ৳${a} | Wait 30s...`; const at = document.getElementById('active-trades'); if(at) at.prepend(bx); setTimeout(() => { const e = currentPrice; let w = gameSettings.mode==='win'?true:gameSettings.mode==='lose'?false:(dir==='CALL'&&e>s)||(dir==='PUT'&&e<s); if(w){ db.collection("users").doc(currentUser.uid).update({ balance:(cb-a)+(a*1.8) }); bx.innerHTML=`${dir} - <span class="text-green-400 font-bold">WIN +৳${(a*1.8).toFixed(2)}</span>`; showPopup("WIN!", "success"); } else bx.innerHTML=`${dir} - <span class="text-red-400 font-bold">LOST</span>`; }, 30000); };

const updateDepositMethodsUI = () => { const s = document.getElementById('dep-method'); s.innerHTML = ''; let f = null; ['bKash', 'Nagad', 'Rocket'].forEach(m => { const n = liveNumbers[m], o = document.createElement('option'); o.value = m; if(!n||n.trim()===""){ o.innerHTML=`🚫 ${m} (Locked)`; o.disabled=true; o.className="text-red-400 font-bold bg-slate-800"; } else { o.innerHTML=`✅ ${m} Personal`; o.className="text-white bg-slate-800"; if(!f) f=m; } s.appendChild(o); }); if(f) s.value = f; updateAdminNumberDisplay(); };

const updateAdminNumberDisplay = () => { const m = document.getElementById('dep-method').value, n = document.getElementById('admin-payment-number'), t = document.getElementById('method-name'); if(m&&liveNumbers[m]&&liveNumbers[m].trim()!==""){ t.innerText=m; n.innerText=liveNumbers[m]; n.className="text-2xl font-bold text-blue-400 tracking-wider"; } else { t.innerText="Unavailable"; n.innerText="Locked"; n.className="text-xl font-bold text-red-500 tracking-wider"; } };

const submitRealDeposit = () => { const m = document.getElementById('dep-method').value, a = parseFloat(document.getElementById('real-dep-amount').value), s = document.getElementById('dep-sender').value, t = document.getElementById('dep-trx').value; if(!m||liveNumbers[m]==="") return showPopup("বন্ধ আছে!", "error"); if(isNaN(a)||a<100||!s||!t) return showPopup("সঠিক তথ্য দিন (Min 100)!", "error"); db.collection("deposits").add({ uid:currentUser.uid, method:m, amount:a, sender:s, trx:t, status:'pending', time:Date.now() }).then(() => { showPopup("রিকুয়েস্ট এডমিন প্যানেলে পাঠানো হয়েছে!", "success"); document.getElementById('real-dep-amount').value=''; document.getElementById('dep-sender').value=''; document.getElementById('dep-trx').value=''; }); };

const submitRealWithdraw = () => { const m = document.getElementById('with-method').value, a = document.getElementById('with-number').value, am = parseFloat(document.getElementById('real-with-amount').value), cb = parseFloat(userData.balance)||0; if(!a||isNaN(am)||am<100) return showPopup("সঠিক তথ্য দিন (Min 100)!", "error"); if(am>cb) return showPopup("পর্যাপ্ত ব্যালেন্স নেই!", "error"); db.collection("users").doc(currentUser.uid).update({ balance: cb-am }).then(() => db.collection("withdraws").add({ uid:currentUser.uid, method:m, account:a, amount:am, status:'pending', time:Date.now() })).then(() => { showPopup("উইথড্র রিকুয়েস্ট সফল!", "success"); document.getElementById('with-number').value=''; document.getElementById('real-with-amount').value=''; }); };
// Toggle Hamburger Menu
        function toggleMenu() {
            const menu = document.getElementById('side-menu');
            const overlay = document.getElementById('side-menu-overlay');
            
            if (menu.classList.contains('translate-x-full')) {
                menu.classList.remove('translate-x-full');
                overlay.classList.remove('hidden-section');
            } else {
                menu.classList.add('translate-x-full');
                overlay.classList.add('hidden-section');
            }
        }

        // Navigation Function
        function showPage(pageId) {
            document.querySelectorAll('.page-section').forEach(el => el.classList.add('hidden-section'));
            document.getElementById(`page-${pageId}`).classList.remove('hidden-section');
            window.scrollTo(0, 0);
        }

        // Mock Admin Numbers (In reality, fetch this from Firebase admin panel)
        const adminNumbers = {
            'bKash': '01711223344',
            'Nagad': '01999887766',
            'Rocket': '01888776655'
        };

        function updateAdminNumber() {
            const method = document.getElementById('dep-method').value;
            document.getElementById('method-name').innerText = method;
            document.getElementById('admin-payment-number').innerText = adminNumbers[method];
        }
        
        // Initialize the first load
        updateAdminNumber();

        // Copy Admin Number
        function copyAdminNumber() {
            const num = document.getElementById('admin-payment-number').innerText;
            navigator.clipboard.writeText(num).then(() => {
                showToast('Number copied to clipboard!', 'success');
            });
        }

        // History Tab Switch
        function switchHistoryTab(type) {
            const tabDep = document.getElementById('tab-dep');
            const tabWith = document.getElementById('tab-with');
            
            if(type === 'deposit') {
                tabDep.className = "flex-1 bg-blue-600 p-2 rounded-lg font-bold text-sm text-white";
                tabWith.className = "flex-1 bg-slate-800 text-slate-400 p-2 rounded-lg font-bold text-sm";
                // TODO: Load Deposit History from Firebase
                document.getElementById('history-content').innerHTML = `<p class="text-center text-slate-400 mt-4">Loading deposits...</p>`;
            } else {
                tabWith.className = "flex-1 bg-blue-600 p-2 rounded-lg font-bold text-sm text-white";
                tabDep.className = "flex-1 bg-slate-800 text-slate-400 p-2 rounded-lg font-bold text-sm";
                // TODO: Load Withdraw History from Firebase
                document.getElementById('history-content').innerHTML = `<p class="text-center text-slate-400 mt-4">Loading withdrawals...</p>`;
            }
        }

        // Simple Toast Notification Logic (if not in app.js)
        function showToast(msg, type='info') {
            const container = document.getElementById('toast-container');
            const toast = document.createElement('div');
            const color = type === 'success' ? 'border-green-500 text-green-400' : (type === 'error' ? 'border-red-500 text-red-400' : 'border-blue-500 text-blue-400');
            
            toast.className = `glass border-l-4 ${color} p-3 rounded-xl shadow-lg toast-enter font-bold text-sm`;
            toast.innerText = msg;
            
            container.appendChild(toast);
            setTimeout(() => { toast.remove(); }, 3000);
        }

async function approveDeposit(depositId) {
    try {
        // Deposit data আনো
        const depRef = db.collection("deposits").doc(depositId);
        const depSnap = await depRef.get();

        if (!depSnap.exists) {
            alert("Deposit not found");
            return;
        }

        const depData = depSnap.data();

        // Already approved কিনা check
        if (depData.status === "approved") {
            alert("Already approved");
            return;
        }

        // User document আনো
        const userRef = db.collection("users").doc(depData.uid);
        const userSnap = await userRef.get();

        if (!userSnap.exists) {
            alert("User not found");
            return;
        }

        const userData = userSnap.data();
        const currentBalance = parseFloat(userData.balance) || 0;

        // Balance add করো
        await userRef.update({
            balance: currentBalance + parseFloat(depData.amount)
        });

        // Deposit approve mark করো
        await depRef.update({
            status: "approved",
            approvedAt: Date.now()
        });

        alert("Deposit Approved Successfully!");

    } catch (err) {
        console.error(err);
        alert(err.message);
    }
}
