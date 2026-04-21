// ====== Firebase Configuration & Setup ======
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, signInWithPopup, GoogleAuthProvider, sendPasswordResetEmail, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
import { getFirestore, doc, setDoc, getDoc, updateDoc, collection, addDoc, query, orderBy, limit, onSnapshot, getDocs, where, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

// Config provided in prompt
const firebaseConfig = {
  apiKey: "AIzaSyB2Gv7FXkDP5AJEm2MrZBEin6rN8YZwnK8",
  authDomain: "betbd-be722.firebaseapp.com",
  projectId: "betbd-be722",
  storageBucket: "betbd-be722.firebasestorage.app",
  messagingSenderId: "192673970713",
  appId: "1:192673970713:web:778a960157b5ff48638888",
  measurementId: "G-VE56XQM64X"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const googleProvider = new GoogleAuthProvider();

// Global State
let currentUser = null;
let userData = null;
let userDocRef = null;

// ====== Authentication Logic ======
onAuthStateChanged(auth, async (user) => {
    if (user) {
        currentUser = user;
        userDocRef = doc(db, "users", user.uid);
        
        // Check if user exists in Firestore
        const docSnap = await getDoc(userDocRef);
        if (!docSnap.exists()) {
            // Create new user wallet setup
            userData = {
                email: user.email,
                balance: 1000, // 1000 demo coins
                role: 'user',
                createdAt: serverTimestamp()
            };
            await setDoc(userDocRef, userData);
        } else {
            userData = docSnap.data();
        }

        // Setup Realtime Balance Listener
        onSnapshot(userDocRef, (doc) => {
            userData = doc.data();
            document.getElementById('user-balance').innerText = userData.balance.toFixed(2);
            if(userData.role === 'admin') {
                document.getElementById('admin-btn').classList.remove('hidden-section');
            }
        });

        // Hide Auth, Show App
        document.getElementById('auth-section').classList.add('hidden-section');
        document.getElementById('app-section').classList.remove('hidden-section');
        
        initApp();
    } else {
        // Show Auth, Hide App
        document.getElementById('auth-section').classList.remove('hidden-section');
        document.getElementById('app-section').classList.add('hidden-section');
    }
});

window.loginWithEmail = () => {
    const e = document.getElementById('email').value;
    const p = document.getElementById('password').value;
    signInWithEmailAndPassword(auth, e, p).catch(err => alert(err.message));
};

window.registerWithEmail = () => {
    const e = document.getElementById('email').value;
    const p = document.getElementById('password').value;
    createUserWithEmailAndPassword(auth, e, p).catch(err => alert(err.message));
};

window.loginWithGoogle = () => {
    signInWithPopup(auth, googleProvider).catch(err => alert(err.message));
};

window.resetPassword = () => {
    const e = document.getElementById('email').value;
    if(!e) return alert("Please enter email first");
    sendPasswordResetEmail(auth, e).then(() => alert("Reset link sent to email")).catch(err => alert(err.message));
};

window.logout = () => signOut(auth);


// ====== App Navigation & UI ======
window.showPage = (pageId) => {
    document.querySelectorAll('.page-section').forEach(el => el.classList.add('hidden-section'));
    document.getElementById('page-' + pageId).classList.remove('hidden-section');
    
    if(pageId === 'leaderboard') loadLeaderboard();
    if(pageId === 'wallet') loadTransactionHistory();
    if(pageId === 'admin') loadAdminPanel();
};

window.openGame = (gameId) => {
    document.querySelectorAll('.game-view').forEach(el => el.classList.add('hidden-section'));
    document.getElementById('game-' + gameId).classList.remove('hidden-section');
};


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
        type: type, // 'win', 'loss', 'deposit', 'withdraw'
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
    if(!bet || bet <= 0 || bet > userData.balance) return alert("Invalid bet amount");

    // Deduct bet
    await processTransaction(-bet, 'loss', 'Coin Flip Bet');
    
    msg.innerText = "Flipping...";
    msg.className = "mt-4 text-sm text-yellow-400";
    
    setTimeout(async () => {
        const result = Math.random() < 0.5 ? 'Heads' : 'Tails';
        document.getElementById('coin-result').innerText = result[0];
        
        if (result === choice) {
            const win = bet * 1.9; // 1.9x payout
            await processTransaction(win, 'win', 'Coin Flip Win');
            msg.innerText = `You Won! +${win.toFixed(2)} coins. (Result: ${result})`;
            msg.className = "mt-4 text-sm text-green-400 font-bold";
        } else {
            msg.innerText = `You Lost! (Result: ${result})`;
            msg.className = "mt-4 text-sm text-red-400 font-bold";
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

    setTimeout(async () => {
        const roll = Math.floor(Math.random() * 100) + 1;
        document.getElementById('dice-result').innerHTML = `<span class="text-yellow-400">${roll}</span>`;
        
        let won = false;
        if (choice === 'under' && roll < 50) won = true;
        if (choice === 'over' && roll > 50) won = true;

        if (won) {
            const win = bet * 1.9;
            await processTransaction(win, 'win', 'Dice Win');
            msg.innerText = `You Won! +${win.toFixed(2)}`;
            msg.className = "mt-4 text-sm text-green-400 font-bold";
        } else {
            msg.innerText = `You Lost!`;
            msg.className = "mt-4 text-sm text-red-400 font-bold";
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
    
    setTimeout(async () => {
        const r = Math.random();
        let resultColor = '';
        let multiplier = 2;

        if (r < 0.45) resultColor = 'red';
        else if (r < 0.90) resultColor = 'green';
        else { resultColor = 'black'; multiplier = 5; } // Black is rare

        resultBox.style.backgroundColor = resultColor;
        resultBox.innerText = resultColor.toUpperCase();

        if (choice === resultColor) {
            const win = bet * multiplier;
            await processTransaction(win, 'win', `Color Win (${resultColor})`);
            msg.innerText = `You Won! +${win.toFixed(2)}`;
            msg.className = "mt-4 text-sm text-green-400 font-bold";
        } else {
            msg.innerText = `You Lost!`;
            msg.className = "mt-4 text-sm text-red-400 font-bold";
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

    // Visual spin
    const randomDeg = Math.floor(Math.random() * 360) + 1440; // min 4 spins
    wheel.style.transform = `rotate(${randomDeg}deg)`;

    setTimeout(async () => {
        // Multipliers: 0x, 0.5x, 1x, 2x, 5x
        const multipliers = [0, 0.5, 1, 2, 5];
        const resultMult = multipliers[Math.floor(Math.random() * multipliers.length)];
        
        wheel.innerText = `x${resultMult}`;
        
        if (resultMult > 0) {
            const win = bet * resultMult;
            await processTransaction(win, 'win', `Spin Win (x${resultMult})`);
            msg.innerText = `Result: x${resultMult}. Paid: ${win.toFixed(2)}`;
            msg.className = resultMult > 1 ? "mt-4 text-sm text-green-400 font-bold" : "mt-4 text-sm text-gray-400";
        } else {
            msg.innerText = `You Lost! Result: x0`;
            msg.className = "mt-4 text-sm text-red-400 font-bold";
        }
        
        // Reset rotation visually after a delay
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
    
    // Calculate Crash Point (Weighted logic: frequent low crashes, rare high crashes)
    const r = Math.random();
    if(r < 0.5) aviatorCrashPoint = (Math.random() * 1.5) + 1.01; // 1.01 - 2.50
    else if(r < 0.8) aviatorCrashPoint = (Math.random() * 3) + 2.51; // 2.51 - 5.50
    else aviatorCrashPoint = (Math.random() * 15) + 5.51; // 5.51 - 20.00

    document.getElementById('btn-aviator-start').classList.add('hidden-section');
    document.getElementById('btn-aviator-cashout').classList.remove('hidden-section');
    msg.innerText = "Flying...";
    msg.className = "mt-4 text-sm text-yellow-400";

    const plane = document.getElementById('aviator-plane');
    plane.style.display = 'block';

    aviatorInterval = setInterval(() => {
        aviatorMultiplier += 0.01;
        document.getElementById('aviator-multiplier').innerText = aviatorMultiplier.toFixed(2) + "x";
        
        // Move plane
        plane.style.transform = `translate(${Math.min(aviatorMultiplier * 10, 200)}px, -${Math.min(aviatorMultiplier * 10, 100)}px)`;

        if(aviatorMultiplier >= aviatorCrashPoint) {
            // Crashed
            clearInterval(aviatorInterval);
            aviatorActive = false;
            msg.innerText = `CRASHED at ${aviatorMultiplier.toFixed(2)}x !`;
            msg.className = "mt-4 text-sm text-red-500 font-bold";
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
    msg.innerText = `Cashed Out! +${win.toFixed(2)}`;
    msg.className = "mt-4 text-sm text-green-400 font-bold";
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

        // Update UI for selected
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

    // Initialize Chart
    const ctx = document.getElementById('tradingChart').getContext('2d');
    chartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: [],
            datasets: [{
                label: 'Price',
                data: [],
                borderColor: '#4ade80',
                borderWidth: 2,
                fill: false,
                tension: 0.1,
                pointRadius: 0
            }]
        },
        options: { responsive: true, scales: { x: { display: false } }, animation: false }
    });

    // Handle Asset Change
    document.getElementById('trade-asset').addEventListener('change', () => {
        currentChartData = []; // clear chart
    });
}

window.placeTrade = async (direction) => {
    const amount = parseFloat(document.getElementById('trade-amount').value);
    const duration = parseInt(document.getElementById('trade-duration').value); // 10, 20, 30
    const asset = document.getElementById('trade-asset').value;
    
    if(!amount || amount <= 0 || amount > userData.balance) return alert("Invalid trade amount");

    // Deduct
    await processTransaction(-amount, 'loss', `Trade Placed: ${asset} ${direction}`);
    
    const startPrice = markets[asset].price;
    const tradeBox = document.createElement('div');
    tradeBox.className = "bg-gray-800 p-2 rounded border-l-4 " + (direction==='UP' ? "border-green-500" : "border-red-500");
    tradeBox.innerHTML = `<strong>${asset} ${direction}</strong> - Bet: ${amount} | Wait ${duration}s...`;
    document.getElementById('active-trades').prepend(tradeBox);

    // Resolution
    setTimeout(async () => {
        const endPrice = markets[asset].price;
        let won = false;
        if (direction === 'UP' && endPrice > startPrice) won = true;
        if (direction === 'DOWN' && endPrice < startPrice) won = true;

        if (won) {
            // Profit mapping: 10s -> 80%, 20s -> 85%, 30s -> 90%
            let profitMargin = duration === 10 ? 0.8 : (duration === 20 ? 0.85 : 0.9);
            const winAmount = amount + (amount * profitMargin);
            await processTransaction(winAmount, 'win', `Trade WON: ${asset}`);
            tradeBox.innerHTML = `<strong>${asset} ${direction}</strong> - WON! +${winAmount.toFixed(2)}`;
            tradeBox.classList.add("text-green-400");
        } else {
            tradeBox.innerHTML = `<strong>${asset} ${direction}</strong> - LOST!`;
            tradeBox.classList.add("text-red-400");
        }
    }, duration * 1000);
};


// ====== Wallet & Request Systems ======
window.requestTransaction = async (type) => {
    const amtId = type === 'deposit' ? 'dep-amount' : 'with-amount';
    const amount = parseFloat(document.getElementById(amtId).value);
    
    if(!amount || amount <= 0) return alert("Invalid amount");
    if(type === 'withdraw' && amount > userData.balance) return alert("Insufficient balance");

    // Add to transactions as pending
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
        // Immediately deduct balance for withdraw request
        await updateDoc(userDocRef, { balance: userData.balance - amount });
    }

    alert(`${type} request submitted to Admin!`);
    document.getElementById(amtId).value = '';
    loadTransactionHistory();
};

async function loadTransactionHistory() {
    const historyDiv = document.getElementById('tx-history');
    historyDiv.innerHTML = "Loading...";

    const q = query(collection(db, "transactions"), where("uid", "==", currentUser.uid), orderBy("timestamp", "desc"), limit(20));
    const querySnapshot = await getDocs(q);
    
    historyDiv.innerHTML = "";
    if(querySnapshot.empty) { historyDiv.innerHTML = "No transactions yet."; return; }

    querySnapshot.forEach((doc) => {
        const tx = doc.data();
        let color = tx.type.includes('win') || tx.type === 'deposit' ? 'text-green-400' : 'text-red-400';
        if(tx.status === 'pending') color = 'text-yellow-400';

        historyDiv.innerHTML += `
            <div class="flex justify-between bg-gray-800 p-2 rounded">
                <div>
                    <p class="font-bold">${tx.description}</p>
                    <p class="text-xs text-gray-400">${tx.timestamp ? tx.timestamp.toDate().toLocaleString() : 'Just now'}</p>
                </div>
                <div class="font-bold ${color}">${tx.type.includes('loss') ? '-' : '+'}${tx.amount.toFixed(2)} (${tx.status})</div>
            </div>
        `;
    });
}


// ====== Leaderboard ======
async function loadLeaderboard() {
    const tbody = document.getElementById('leaderboard-table');
    tbody.innerHTML = "<tr><td colspan='3' class='text-center p-4'>Loading...</td></tr>";

    const q = query(collection(db, "users"), orderBy("balance", "desc"), limit(10));
    const querySnapshot = await getDocs(q);

    tbody.innerHTML = "";
    let rank = 1;
    querySnapshot.forEach((doc) => {
        const user = doc.data();
        tbody.innerHTML += `
            <tr class="border-b border-gray-800">
                <td class="p-2 text-yellow-500 font-bold">#${rank}</td>
                <td class="p-2">${user.email.split('@')[0]}***</td>
                <td class="p-2 text-right text-green-400 font-bold">${user.balance.toFixed(2)}</td>
            </tr>
        `;
        rank++;
    });
}

// ====== Admin Panel ======
async function loadAdminPanel() {
    if(userData.role !== 'admin') return alert("Access Denied");
    
    const reqDiv = document.getElementById('admin-requests');
    reqDiv.innerHTML = "Loading requests...";

    const q = query(collection(db, "transactions"), where("status", "==", "pending"));
    const querySnapshot = await getDocs(q);
    
    reqDiv.innerHTML = "";
    if(querySnapshot.empty) { reqDiv.innerHTML = "No pending requests."; return; }

    querySnapshot.forEach((docSnap) => {
        const req = docSnap.data();
        const reqId = docSnap.id;
        reqDiv.innerHTML += `
            <div class="bg-gray-800 p-3 rounded mb-2 border-l-4 border-yellow-500">
                <p><strong>User:</strong> ${req.email}</p>
                <p><strong>Type:</strong> ${req.type}</p>
                <p><strong>Amount:</strong> ${req.amount}</p>
                <div class="flex gap-2 mt-2">
                    <button onclick="adminAction('${reqId}', '${req.uid}', '${req.type}', ${req.amount}, 'approve')" class="bg-green-500 px-3 py-1 rounded text-sm">Approve</button>
                    <button onclick="adminAction('${reqId}', '${req.uid}', '${req.type}', ${req.amount}, 'reject')" class="bg-red-500 px-3 py-1 rounded text-sm">Reject</button>
                </div>
            </div>
        `;
    });
}

window.adminAction = async (txId, uid, type, amount, action) => {
    // Update Transaction
    await updateDoc(doc(db, "transactions", txId), { status: action === 'approve' ? 'completed' : 'rejected' });
    
    // Process Balance if approved deposit, or refunded withdrawal
    const targetUserRef = doc(db, "users", uid);
    const targetUserSnap = await getDoc(targetUserRef);
    if(targetUserSnap.exists()) {
        const tUser = targetUserSnap.data();
        
        if(action === 'approve' && type === 'deposit_request') {
            await updateDoc(targetUserRef, { balance: tUser.balance + amount });
        }
        else if(action === 'reject' && type === 'withdraw_request') {
            // Refund the deducted amount
            await updateDoc(targetUserRef, { balance: tUser.balance + amount });
        }
    }
    alert(`Request ${action}d!`);
    loadAdminPanel();
};

window.adminSetBalance = async () => {
    const email = document.getElementById('admin-user-email').value;
    const newBal = parseFloat(document.getElementById('admin-set-balance').value);
    
    if(!email || isNaN(newBal)) return alert("Invalid inputs");

    const q = query(collection(db, "users"), where("email", "==", email));
    const querySnapshot = await getDocs(q);
    
    if(querySnapshot.empty) return alert("User not found");
    
    querySnapshot.forEach(async (userDoc) => {
        await updateDoc(doc(db, "users", userDoc.id), { balance: newBal });
        alert(`Balance updated for ${email}`);
    });
};
