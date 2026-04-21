// ====== Firebase Configuration & Setup ======
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, sendPasswordResetEmail, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
import { getFirestore, doc, setDoc, getDoc, updateDoc, collection, addDoc, query, orderBy, limit, onSnapshot, getDocs, where, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyB2Gv7FXkDP5AJEm2MrZBEin6rN8YZwnK8",
  authDomain: "betbd-be722.firebaseapp.com",
  projectId: "betbd-be722",
  storageBucket: "betbd-be722.firebasestorage.app",
  messagingSenderId: "192673970713",
  appId: "1:192673970713:web:778a960157b5ff48638888",
  measurementId: "G-VE56XQM64X"
};

let app, auth, db;
let currentUser = null;
let userData = null;
let userDocRef = null;

// Error Handling block
try {
    app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    db = getFirestore(app);
    console.log("Firebase Initialized Successfully");
} catch (error) {
    alert("Firebase Error: " + error.message);
}

// ====== Authentication Logic ======
if(auth) {
    onAuthStateChanged(auth, async (user) => {
        if (user) {
            currentUser = user;
            userDocRef = doc(db, "users", user.uid);
            
            try {
                const docSnap = await getDoc(userDocRef);
                if (!docSnap.exists()) {
                    userData = {
                        email: user.email,
                        balance: 1000, 
                        role: 'user',
                        createdAt: serverTimestamp()
                    };
                    await setDoc(userDocRef, userData);
                } else {
                    userData = docSnap.data();
                }

                onSnapshot(userDocRef, (doc) => {
                    userData = doc.data();
                    document.getElementById('user-balance').innerText = userData.balance.toFixed(2);
                    if(userData.role === 'admin') {
                        document.getElementById('admin-btn').classList.remove('hidden-section');
                    }
                });

                document.getElementById('auth-section').classList.add('hidden-section');
                document.getElementById('app-section').classList.remove('hidden-section');
                initApp();
            } catch (err) {
                console.error("Firestore error:", err);
            }
        } else {
            document.getElementById('auth-section').classList.remove('hidden-section');
            document.getElementById('app-section').classList.add('hidden-section');
        }
    });
}

// বাটনগুলোর ফাংশনগুলো গ্লোবাল উইন্ডোতে সেট করা হলো
window.loginWithEmail = () => {
    try {
        const e = document.getElementById('email').value;
        const p = document.getElementById('password').value;
        if(!e || !p) return alert("Please enter email and password");
        signInWithEmailAndPassword(auth, e, p).then(() => {
            alert("Login Successful!");
        }).catch(err => alert("Login Failed: " + err.message));
    } catch (err) {
        alert("System Error: " + err.message);
    }
};

window.registerWithEmail = () => {
    try {
        const e = document.getElementById('email').value;
        const p = document.getElementById('password').value;
        if(!e || !p) return alert("Please enter email and password");
        if(p.length < 6) return alert("Password must be at least 6 characters");
        createUserWithEmailAndPassword(auth, e, p).then(() => {
            alert("Account Created Successfully!");
        }).catch(err => alert("Registration Failed: " + err.message));
    } catch (err) {
        alert("System Error: " + err.message);
    }
};

window.resetPassword = () => {
    const e = document.getElementById('email').value;
    if(!e) return alert("Please enter your email address first");
    sendPasswordResetEmail(auth, e).then(() => alert("Password reset link sent to your email!")).catch(err => alert(err.message));
};

window.logout = () => signOut(auth);

window.showPage = (pageId) => {
    document.querySelectorAll('.page-section').forEach(el => el.classList.add('hidden-section'));
    document.getElementById('page-' + pageId).classList.remove('hidden-section');
    if(pageId === 'leaderboard') loadLeaderboard();
    if(pageId === 'wallet') loadTransactionHistory();
    if(pageId === 'admin') loadAdminPanel();
    window.scrollTo(0,0);
};

window.openGame = (gameId) => {
    document.querySelectorAll('.game-view').forEach(el => el.classList.add('hidden-section'));
    document.getElementById('game-' + gameId).classList.remove('hidden-section');
};

// ... (আপনার আগের কোডের বাকি গেম, ওয়ালেট এবং এডমিন প্যানেলের ফাংশনগুলো হুবহু নিচে বসিয়ে দিন)

// ====== Helper: Transaction Logging & Balance Update ======
async function processTransaction(amount, type, description) {
    if(!currentUser) return false;
    if(amount === 0) return true;
    
    const newBalance = userData.balance + amount;
    if(newBalance < 0) {
        alert("Insufficient balance!");
        return false;
    }

    // Update Balance
    await updateDoc(userDocRef, { balance: newBalance });

    // Log History
    await addDoc(collection(db, "transactions"), {
        uid: currentUser.uid,
        email: currentUser.email,
        amount: amount,
        type: type, 
        description: description,
        timestamp: serverTimestamp(),
        status: 'completed'
    });
    return true;
}


// ====== Game 1: Coin Flip ======
window.playCoinFlip = async (choice) => {
    const bet = parseFloat(document.getElementById('coin-bet').value);
    const msg = document.getElementById('coin-msg');
    if(!bet || bet <= 0 || bet > userData.balance) return alert("Invalid or insufficient bet amount");

    await processTransaction(-bet, 'loss', 'Coin Flip Bet');
    
    msg.innerText = "Flipping...";
    msg.className = "mt-4 text-sm text-yellow-400 font-bold h-6";
    
    setTimeout(async () => {
        const result = Math.random() < 0.5 ? 'Heads' : 'Tails';
        document.getElementById('coin-result').innerText = result[0]; // H or T
        
        if (result === choice) {
            const win = bet * 1.9; // 1.9x payout
            await processTransaction(win, 'win', 'Coin Flip Win');
            msg.innerText = `Won +${win.toFixed(2)}! (Result: ${result})`;
            msg.className = "mt-4 text-sm text-green-400 font-bold h-6";
        } else {
            msg.innerText = `Lost! (Result: ${result})`;
            msg.className = "mt-4 text-sm text-red-400 font-bold h-6";
        }
    }, 1000);
};

// ====== Game 2: Dice Roll ======
window.playDice = async (choice) => {
    const bet = parseFloat(document.getElementById('dice-bet').value);
    const msg = document.getElementById('dice-msg');
    if(!bet || bet <= 0 || bet > userData.balance) return alert("Invalid bet amount");

    await processTransaction(-bet, 'loss', 'Dice Bet');
    msg.innerText = "Rolling...";
    msg.className = "mt-4 text-sm text-gray-400 h-6";

    setTimeout(async () => {
        const roll = Math.floor(Math.random() * 100) + 1;
        document.getElementById('dice-result').innerHTML = `<span class="text-purple-400 font-bold">${roll}</span>`;
        
        let won = false;
        if (choice === 'under' && roll < 50) won = true;
        if (choice === 'over' && roll > 50) won = true;

        if (won) {
            const win = bet * 1.9;
            await processTransaction(win, 'win', 'Dice Win');
            msg.innerText = `Won +${win.toFixed(2)}!`;
            msg.className = "mt-4 text-sm text-green-400 font-bold h-6";
        } else {
            msg.innerText = `Lost!`;
            msg.className = "mt-4 text-sm text-red-400 font-bold h-6";
        }
    }, 1000);
};

// ====== Game 3: Color Prediction ======
window.playColor = async (choice) => {
    const bet = parseFloat(document.getElementById('color-bet').value);
    const msg = document.getElementById('color-msg');
    const resultBox = document.getElementById('color-result');
    if(!bet || bet <= 0 || bet > userData.balance) return alert("Invalid bet amount");

    await processTransaction(-bet, 'loss', 'Color Bet');
    msg.innerText = "Drawing...";
    msg.className = "mt-4 text-sm text-gray-400 h-6";
    
    setTimeout(async () => {
        const r = Math.random();
        let resultColor = '';
        let multiplier = 2;

        if (r < 0.45) resultColor = 'red';
        else if (r < 0.90) resultColor = 'green';
        else { resultColor = 'black'; multiplier = 5; }

        resultBox.style.backgroundColor = resultColor === 'red' ? '#ef4444' : (resultColor === 'green' ? '#22c55e' : '#000000');
        resultBox.innerText = resultColor.toUpperCase();

        if (choice === resultColor) {
            const win = bet * multiplier;
            await processTransaction(win, 'win', `Color Win (${resultColor})`);
            msg.innerText = `Won +${win.toFixed(2)}!`;
            msg.className = "mt-4 text-sm text-green-400 font-bold h-6";
        } else {
            msg.innerText = `Lost!`;
            msg.className = "mt-4 text-sm text-red-400 font-bold h-6";
        }
    }, 1500);
};

// ====== Game 4: Spin Wheel ======
window.playSpin = async () => {
    const bet = parseFloat(document.getElementById('spin-bet').value);
    const msg = document.getElementById('spin-msg');
    const wheel = document.getElementById('spin-wheel');
    if(!bet || bet <= 0 || bet > userData.balance) return alert("Invalid bet amount");

    await processTransaction(-bet, 'loss', 'Spin Bet');
    msg.innerText = "Spinning...";
    msg.className = "mt-4 text-sm text-pink-400 h-6";

    // Visual spin
    const randomDeg = Math.floor(Math.random() * 360) + 1440; // min 4 spins
    wheel.style.transform = `rotate(${randomDeg}deg)`;

    setTimeout(async () => {
        const multipliers = [0, 0.5, 1, 2, 5];
        const resultMult = multipliers[Math.floor(Math.random() * multipliers.length)];
        
        wheel.innerText = `x${resultMult}`;
        
        if (resultMult > 0) {
            const win = bet * resultMult;
            await processTransaction(win, 'win', `Spin Win (x${resultMult})`);
            msg.innerText = `Result x${resultMult}. Paid: ${win.toFixed(2)}`;
            msg.className = resultMult > 1 ? "mt-4 text-sm text-green-400 font-bold h-6" : "mt-4 text-sm text-yellow-400 h-6";
        } else {
            msg.innerText = `Lost! Result x0`;
            msg.className = "mt-4 text-sm text-red-400 font-bold h-6";
        }
        
        setTimeout(() => wheel.style.transform = `rotate(0deg)`, 2000);
    }, 3000);
};

// ====== Game 5: Aviator ======
let aviatorInterval;
let aviatorMultiplier = 1.00;
let aviatorBetAmount = 0;
let aviatorCrashPoint = 0;
let aviatorActive = false;

window.startAviator = async () => {
    const bet = parseFloat(document.getElementById('aviator-bet').value);
    const msg = document.getElementById('aviator-msg');
    if(!bet || bet <= 0 || bet > userData.balance) return alert("Invalid bet amount");
    if(aviatorActive) return;

    await processTransaction(-bet, 'loss', 'Aviator Bet');
    aviatorBetAmount = bet;
    aviatorActive = true;
    aviatorMultiplier = 1.00;
    
    // Crash logic
    const r = Math.random();
    if(r < 0.5) aviatorCrashPoint = (Math.random() * 1.5) + 1.01; 
    else if(r < 0.8) aviatorCrashPoint = (Math.random() * 3) + 2.51;
    else aviatorCrashPoint = (Math.random() * 15) + 5.51; 

    document.getElementById('btn-aviator-start').classList.add('hidden-section');
    document.getElementById('btn-aviator-cashout').classList.remove('hidden-section');
    msg.innerText = "Flying...";
    msg.className = "mt-4 text-sm text-yellow-400 h-6";

    const plane = document.getElementById('aviator-plane');
    plane.style.display = 'block';

    aviatorInterval = setInterval(() => {
        aviatorMultiplier += 0.01;
        document.getElementById('aviator-multiplier').innerText = aviatorMultiplier.toFixed(2) + "x";
        
        // Move plane slightly in bounds
        plane.style.transform = `translate(${Math.min(aviatorMultiplier * 8, 150)}px, -${Math.min(aviatorMultiplier * 8, 100)}px)`;

        if(aviatorMultiplier >= aviatorCrashPoint) {
            clearInterval(aviatorInterval);
            aviatorActive = false;
            msg.innerText = `CRASHED at ${aviatorMultiplier.toFixed(2)}x !`;
            msg.className = "mt-4 text-sm text-red-500 font-bold h-6";
            document.getElementById('btn-aviator-start').classList.remove('hidden-section');
            document.getElementById('btn-aviator-cashout').classList.add('hidden-section');
            plane.style.display = 'none';
        }
    }, 50);
};

window.cashoutAviator = async () => {
    if(!aviatorActive) return;
    clearInterval(aviatorInterval);
    aviatorActive = false;

    const win = aviatorBetAmount * aviatorMultiplier;
    await processTransaction(win, 'win', `Aviator Cashout (${aviatorMultiplier.toFixed(2)}x)`);
    
    document.getElementById('btn-aviator-start').classList.remove('hidden-section');
    document.getElementById('btn-aviator-cashout').classList.add('hidden-section');
    
    const msg = document.getElementById('aviator-msg');
    msg.innerText = `Cashed Out +${win.toFixed(2)}!`;
    msg.className = "mt-4 text-sm text-green-400 font-bold h-6";
    document.getElementById('aviator-plane').style.display = 'none';
};


// ====== Trading Simulation ======
const markets = {
    "BTC/USD": { price: 65000, volatility: 0.001 },
    "GOLD": { price: 2350, volatility: 0.0005 },
    "EUR/USD": { price: 1.0850, volatility: 0.0001 },
    "USD/BDT": { price: 110.50, volatility: 0.0002 },
    "INDEX": { price: 5000, volatility: 0.002 }
};

let chartInstance = null;
let currentChartData = [];

function initApp() {
    // Start market fluctuation
    setInterval(() => {
        const selectedAsset = document.getElementById('trade-asset').value;
        
        Object.keys(markets).forEach(asset => {
            const change = 1 + (Math.random() * markets[asset].volatility * 2 - markets[asset].volatility);
            markets[asset].price *= change;
        });

        // Update UI
        const priceElement = document.getElementById('live-price');
        priceElement.innerText = markets[selectedAsset].price.toFixed(4);
        
        // Update Chart
        if(currentChartData.length > 20) currentChartData.shift();
        currentChartData.push(markets[selectedAsset].price);
        if(chartInstance) {
            chartInstance.data.labels = currentChartData.map((_, i) => i);
            chartInstance.data.datasets[0].data = currentChartData;
            chartInstance.update();
        }
    }, 1000);

    // Initial Chart
    const ctx = document.getElementById('tradingChart').getContext('2d');
    chartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: [],
            datasets: [{
                label: 'Live Demo Price',
                data: [],
                borderColor: '#4ade80',
                backgroundColor: 'rgba(74, 222, 128, 0.1)',
                borderWidth: 2,
                fill: true,
                tension: 0.1,
                pointRadius: 0
            }]
        },
        options: { 
            responsive: true, 
            maintainAspectRatio: false,
            scales: { x: { display: false }, y: { position: 'right' } }, 
            animation: false,
            plugins: { legend: { display: false } }
        }
    });

    document.getElementById('trade-asset').addEventListener('change', () => {
        currentChartData = []; 
    });
}

window.placeTrade = async (direction) => {
    const amount = parseFloat(document.getElementById('trade-amount').value);
    const duration = parseInt(document.getElementById('trade-duration').value);
    const asset = document.getElementById('trade-asset').value;
    
    if(!amount || amount <= 0 || amount > userData.balance) return alert("Invalid trade amount");

    await processTransaction(-amount, 'loss', `Trade: ${asset} ${direction}`);
    
    const startPrice = markets[asset].price;
    const tradeBox = document.createElement('div');
    tradeBox.className = "bg-gray-800 p-3 rounded-xl border-l-4 " + (direction==='UP' ? "border-green-500" : "border-red-500");
    tradeBox.innerHTML = `<strong>${asset} ${direction}</strong><br><span class="text-xs text-gray-400">Bet: ${amount} | Result in ${duration}s...</span>`;
    document.getElementById('active-trades').prepend(tradeBox);

    setTimeout(async () => {
        const endPrice = markets[asset].price;
        let won = false;
        if (direction === 'UP' && endPrice > startPrice) won = true;
        if (direction === 'DOWN' && endPrice < startPrice) won = true;

        if (won) {
            let profitMargin = duration === 10 ? 0.8 : (duration === 20 ? 0.85 : 0.9);
            const winAmount = amount + (amount * profitMargin);
            await processTransaction(winAmount, 'win', `Trade WON: ${asset}`);
            tradeBox.innerHTML = `<strong>${asset} ${direction}</strong> - <span class="text-green-400 font-bold">WON +${winAmount.toFixed(2)}</span>`;
            tradeBox.classList.add("border-green-400");
        } else {
            tradeBox.innerHTML = `<strong>${asset} ${direction}</strong> - <span class="text-red-400 font-bold">LOST</span>`;
            tradeBox.classList.add("border-red-600");
        }
    }, duration * 1000);
};


// ====== Wallet & Request Systems ======
window.requestTransaction = async (type) => {
    const amtId = type === 'deposit' ? 'dep-amount' : 'with-amount';
    const amount = parseFloat(document.getElementById(amtId).value);
    
    if(!amount || amount <= 0) return alert("Invalid amount");
    if(type === 'withdraw' && amount > userData.balance) return alert("Insufficient balance");

    await addDoc(collection(db, "transactions"), {
        uid: currentUser.uid,
        email: currentUser.email,
        amount: amount,
        type: type + '_request',
        description: `Requested ${type} of ${amount}`,
        timestamp: serverTimestamp(),
        status: 'pending'
    });

    if(type === 'withdraw') {
        await updateDoc(userDocRef, { balance: userData.balance - amount });
    }

    alert(`${type.toUpperCase()} request submitted to Admin!`);
    document.getElementById(amtId).value = '';
    loadTransactionHistory();
};

async function loadTransactionHistory() {
    const historyDiv = document.getElementById('tx-history');
    historyDiv.innerHTML = "<p class='text-gray-400 text-center py-4'>Loading...</p>";

    const q = query(collection(db, "transactions"), where("uid", "==", currentUser.uid), orderBy("timestamp", "desc"), limit(20));
    const querySnapshot = await getDocs(q);
    
    historyDiv.innerHTML = "";
    if(querySnapshot.empty) { historyDiv.innerHTML = "<p class='text-gray-400 text-center py-4'>No transactions yet.</p>"; return; }

    querySnapshot.forEach((doc) => {
        const tx = doc.data();
        let color = tx.type.includes('win') || tx.type === 'deposit' ? 'text-green-400' : 'text-red-400';
        if(tx.status === 'pending') color = 'text-yellow-400';

        historyDiv.innerHTML += `
            <div class="flex justify-between items-center bg
