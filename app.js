// ====== Firebase Setup ======
const firebaseConfig = {
    apiKey: "AIzaSyB2Gv7FXkDP5AJEm2MrZBEin6rN8YZwnK8",
    authDomain: "betbd-be722.firebaseapp.com",
    projectId: "betbd-be722",
    storageBucket: "betbd-be722.firebasestorage.app",
    messagingSenderId: "192673970713",
    appId: "1:192673970713:web:778a960157b5ff48638888",
    measurementId: "G-VE56XQM64X"
};

firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

let currentUser = null;
let userData = null;

// Admin Controlled Game Settings (Default values)
let gameSettings = { chance: 45, mode: 'none' };

// Listen to Admin Game Controller in Realtime
db.collection("settings").doc("game_config").onSnapshot(doc => {
    if(doc.exists) {
        gameSettings = doc.data();
    }
});

// ====== Custom UI Popup (Toast) ======
function showPopup(msg, type = 'error') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    const color = type === 'error' ? 'bg-red-500' : (type === 'success' ? 'bg-green-500' : 'bg-blue-500');
    
    toast.className = `${color} text-white px-4 py-3 rounded-xl shadow-2xl font-bold text-sm flex justify-between items-center toast-enter pointer-events-auto border border-white/20 mt-2`;
    toast.innerHTML = `<span>${msg}</span> <button onclick="this.parentElement.remove()"><i class="fa-solid fa-xmark"></i></button>`;
    
    container.prepend(toast);
    setTimeout(() => { if(toast.parentElement) toast.remove(); }, 3500);
}

// ====== Auth System ======
function toggleAuth(type) {
    if(type === 'log') {
        document.getElementById('reg-form').classList.add('hidden-section');
        document.getElementById('login-form').classList.remove('hidden-section');
    } else {
        document.getElementById('login-form').classList.add('hidden-section');
        document.getElementById('reg-form').classList.remove('hidden-section');
    }
}

function registerUser() {
    const n = document.getElementById('reg-name').value;
    const e = document.getElementById('reg-email').value;
    const p = document.getElementById('reg-pass').value;

    if(!n || !e || !p) return showPopup("সবগুলো ঘর পূরণ করুন!");
    if(p.length < 6) return showPopup("পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের হতে হবে!");

    auth.createUserWithEmailAndPassword(e, p).then((cred) => {
        return db.collection("users").doc(cred.user.uid).set({
            name: n,
            email: e,
            balance: 100, // Signup bonus
            role: 'user',
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
    }).then(() => {
        showPopup("একাউন্ট খোলা সফল হয়েছে!", "success");
    }).catch(err => showPopup(err.message));
}

function loginUser() {
    const e = document.getElementById('log-email').value;
    const p = document.getElementById('log-pass').value;
    
    if(!e || !p) return showPopup("ইমেইল ও পাসওয়ার্ড দিন!");
    
    auth.signInWithEmailAndPassword(e, p)
        .then(() => showPopup("লগিন সফল!", "success"))
        .catch(() => showPopup("ভুল ইমেইল বা পাসওয়ার্ড দিয়েছেন!"));
}

function logout() { auth.signOut(); }

// Auth Listener
auth.onAuthStateChanged(async (user) => {
    if (user) {
        currentUser = user;
        db.collection("users").doc(user.uid).onSnapshot((doc) => {
            if(doc.exists) {
                userData = doc.data();
                document.getElementById('user-balance').innerText = userData.balance.toFixed(2);
            }
        });
        document.getElementById('auth-section').classList.add('hidden-section');
        document.getElementById('app-section').classList.remove('hidden-section');
        initTrading();
    } else {
        document.getElementById('auth-section').classList.remove('hidden-section');
        document.getElementById('app-section').classList.add('hidden-section');
    }
});

// ====== Navigation ======
function showPage(id) {
    document.querySelectorAll('.page-section').forEach(el => el.classList.add('hidden-section'));
    document.getElementById('page-' + id).classList.remove('hidden-section');
    window.scrollTo(0,0);
}

// ====== Games System (Min 10 tk) ======
let activeGame = "";
function openGame(name) {
    activeGame = name;
    document.getElementById('active-game-title').innerText = name;
    document.getElementById('game-result-display').innerText = "?";
    document.getElementById('game-play-area').classList.remove('hidden-section');
    window.scrollTo(0, document.body.scrollHeight);
}

function playGenericGame() {
    const bet = parseFloat(document.getElementById('game-bet').value);
    if(isNaN(bet) || bet < 10) return showPopup("সর্বনিম্ন বেট ১০ টাকা!");
    if(bet > userData.balance) return showPopup("আপনার একাউন্টে পর্যাপ্ত টাকা নেই!");

    // Deduct Balance
    const newBal = userData.balance - bet;
    db.collection("users").doc(currentUser.uid).update({ balance: newBal });

    document.getElementById('game-result-display').innerHTML = '<i class="fa-solid fa-spinner fa-spin text-blue-500"></i>';
    
    setTimeout(() => {
        // === Admin Controlled Win/Loss Logic ===
        let isWin = false;
        
        if (gameSettings.mode === 'win') {
            isWin = true; // Admin forced WIN
        } else if (gameSettings.mode === 'lose') {
            isWin = false; // Admin forced LOSE
        } else {
            // Normal Probability Mode
            const chanceToWin = gameSettings.chance / 100;
            isWin = Math.random() < chanceToWin; 
        }

        // Provide Result
        if(isWin) {
            const winAmt = bet * 2;
            db.collection("users").doc(currentUser.uid).update({ balance: newBal + winAmt });
            document.getElementById('game-result-display').innerHTML = `<span class="text-green-500">WIN +${winAmt}৳</span>`;
            showPopup(`${activeGame} এ আপনি জয়ী হয়েছেন!`, "success");
        } else {
            document.getElementById('game-result-display').innerHTML = `<span class="text-red-500">LOST</span>`;
            showPopup("দুঃখিত, আপনি হেরেছেন!", "error");
        }
    }, 1500);
}

// ====== TradingView Candlestick System (Min 100 tk) ======
let tvChart = null;
let candleSeries = null;
let currentPrice = 65000;
let currentCandle = null;

function initTrading() {
    if(tvChart) return;
    
    const container = document.getElementById('tv-chart');
    tvChart = LightweightCharts.createChart(container, {
        layout: { background: { type: 'solid', color: '#0f172a' }, textColor: '#94a3b8' },
        grid: { vertLines: { color: '#1e293b' }, horzLines: { color: '#1e293b' } },
        crosshair: { mode: LightweightCharts.CrosshairMode.Normal },
        timeScale: { timeVisible: true, secondsVisible: true }
    });

    candleSeries = tvChart.addCandlestickSeries({
        upColor: '#22c55e', downColor: '#ef4444', borderVisible: false, wickUpColor: '#22c55e', wickDownColor: '#ef4444'
    });

    const history = [];
    let time = Math.floor(Date.now() / 1000) - 3600;
    let lastClose = 65000;
    for(let i=0; i<60; i++) {
        const open = lastClose;
        const close = open + (Math.random()*100 - 50);
        history.push({ time: time + (i*60), open: open, high: Math.max(open, close)+20, low: Math.min(open, close)-20, close: close });
        lastClose = close;
    }
    candleSeries.setData(history);
    
    currentPrice = lastClose;
    currentCandle = { time: Math.floor(Date.now()/1000), open: currentPrice, high: currentPrice, low: currentPrice, close: currentPrice };

    setInterval(() => {
        const volatility = (Math.random() * 20) - 10;
        currentPrice += volatility;
        
        currentCandle.close = currentPrice;
        currentCandle.high = Math.max(currentCandle.high, currentPrice);
        currentCandle.low = Math.min(currentCandle.low, currentPrice);
        
        candleSeries.update(currentCandle);
        document.getElementById('live-price').innerText = currentPrice.toFixed(2);
        document.getElementById('live-price').className = volatility >= 0 ? "text-3xl font-mono text-green-400 bg-slate-900 py-2 rounded-xl border border-slate-700" : "text-3xl font-mono text-red-400 bg-slate-900 py-2 rounded-xl border border-slate-700";

        if(Math.floor(Date.now()/1000) % 10 === 0) {
            currentCandle = { time: Math.floor(Date.now()/1000), open: currentPrice, high: currentPrice, low: currentPrice, close: currentPrice };
        }
    }, 500);

    new ResizeObserver(entries => {
        if(entries.length === 0 || entries[0].target !== container) return;
        tvChart.applyOptions({ width: container.clientWidth, height: container.clientHeight });
    }).observe(container);
}

function adjustTrade(val) {
    const input = document.getElementById('trade-amount');
    let current = parseInt(input.value);
    if(current + val >= 100) input.value = current + val;
}

function placeTrade(direction) {
    const amt = parseInt(document.getElementById('trade-amount').value);
    if(amt < 100) return showPopup("সর্বনিম্ন ট্রেড ১০০ টাকা!");
    if(amt > userData.balance) return showPopup("ব্যালেন্স অপর্যাপ্ত!");

    const newBal = userData.balance - amt;
    db.collection("users").doc(currentUser.uid).update({ balance: newBal });
    showPopup(`ট্রেড প্লেস হয়েছে: ${direction}`, "success");

    const startPrice = currentPrice;
    const box = document.createElement('div');
    box.className = `p-2 mb-2 rounded border-l-4 ${direction==='CALL'?'border-green-500':'border-red-500'} bg-slate-800`;
    box.innerHTML = `${direction} - ৳${amt} | Wait 30s...`;
    document.getElementById('active-trades').prepend(box);

    setTimeout(() => {
        const endPrice = currentPrice;
        let won = false;
        
        // Trading Also Listens to Admin Game Controls
        if (gameSettings.mode === 'win') won = true;
        else if (gameSettings.mode === 'lose') won = false;
        else {
            if(direction === 'CALL' && endPrice > startPrice) won = true;
            if(direction === 'PUT' && endPrice < startPrice) won = true;
        }

        if(won) {
            const winAmt = amt * 1.8;
            db.collection("users").doc(currentUser.uid).update({ balance: newBal + winAmt });
            box.innerHTML = `${direction} - <span class="text-green-400 font-bold">WIN +৳${winAmt.toFixed(2)}</span>`;
            showPopup(`ট্রেড WIN! +৳${winAmt.toFixed(2)}`, "success");
        } else {
            box.innerHTML = `${direction} - <span class="text-red-400 font-bold">LOST</span>`;
        }
    }, 30000);
}

// ====== Wallet Request ======
function reqDeposit() {
    const amt = parseFloat(document.getElementById('dep-amount').value);
    if(!amt || amt < 100) return showPopup("সর্বনিম্ন ডিপোজিট ১০০ টাকা");
    
    db.collection("requests").add({
        uid: currentUser.uid, email: currentUser.email, amount: amt, type: 'deposit', status: 'pending', time: Date.now()
    }).then(() => {
        showPopup("ডিপোজিট রিকুয়েস্ট পাঠানো হয়েছে!", "success");
        document.getElementById('dep-amount').value = '';
    });
}

function reqWithdraw() {
    const amt = parseFloat(document.getElementById('with-amount').value);
    if(!amt || amt < 100) return showPopup("সর্বনিম্ন উইথড্র ১০০ টাকা");
    if(amt > userData.balance) return showPopup("ব্যালেন্স নাই!");

    db.collection("users").doc(currentUser.uid).update({ balance: userData.balance - amt });
    
    db.collection("requests").add({
        uid: currentUser.uid, email: currentUser.email, amount: amt, type: 'withdraw', status: 'pending', time: Date.now()
    }).then(() => {
        showPopup("উইথড্র রিকুয়েস্ট পাঠানো হয়েছে!", "success");
        document.getElementById('with-amount').value = '';
    });
}
