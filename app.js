// ====== Firebase Configuration ======
const firebaseConfig = {
    apiKey: "AIzaSyB2Gv7FXkDP5AJEm2MrZBEin6rN8YZwnK8",
    authDomain: "betbd-be722.firebaseapp.com",
    projectId: "betbd-be722",
    storageBucket: "betbd-be722.firebasestorage.app",
    messagingSenderId: "192673970713",
    appId: "1:192673970713:web:778a960157b5ff48638888",
    measurementId: "G-VE56XQM64X"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

// Global Variables
let currentUser = null;
let userData = null;

// ====== Auth State Listener ======
auth.onAuthStateChanged(async (user) => {
    if (user) {
        currentUser = user;
        const userRef = db.collection("users").doc(user.uid);
        
        try {
            const docSnap = await userRef.get();
            if (!docSnap.exists) {
                userData = {
                    email: user.email,
                    balance: 1000, 
                    role: 'user',
                    createdAt: firebase.firestore.FieldValue.serverTimestamp()
                };
                await userRef.set(userData);
            } else {
                userData = docSnap.data();
            }

            // Real-time balance update
            userRef.onSnapshot((doc) => {
                userData = doc.data();
                document.getElementById('user-balance').innerText = userData.balance.toFixed(2);
                if(userData.role === 'admin') {
                    document.getElementById('admin-btn').classList.remove('hidden-section');
                }
            });

            document.getElementById('auth-section').classList.add('hidden-section');
            document.getElementById('app-section').classList.remove('hidden-section');
            initApp();
        } catch (error) {
            console.error("Database Error: ", error);
            alert("Database Error: " + error.message);
        }
    } else {
        document.getElementById('auth-section').classList.remove('hidden-section');
        document.getElementById('app-section').classList.add('hidden-section');
    }
});

// ====== Login / Register Functions ======
function loginWithEmail() {
    const e = document.getElementById('email').value;
    const p = document.getElementById('password').value;
    if(!e || !p) return alert("Please enter email and password");
    
    auth.signInWithEmailAndPassword(e, p)
        .then(() => alert("Login Success!"))
        .catch(err => alert("Error: " + err.message));
}

function registerWithEmail() {
    const e = document.getElementById('email').value;
    const p = document.getElementById('password').value;
    if(!e || !p) return alert("Please enter email and password");
    
    auth.createUserWithEmailAndPassword(e, p)
        .then(() => alert("Account Created!"))
        .catch(err => alert("Error: " + err.message));
}

function resetPassword() {
    const e = document.getElementById('email').value;
    if(!e) return alert("Enter email first!");
    auth.sendPasswordResetEmail(e)
        .then(() => alert("Reset link sent to email!"))
        .catch(err => alert("Error: " + err.message));
}

function logout() {
    auth.signOut();
}

// ====== Navigation ======
function showPage(pageId) {
    document.querySelectorAll('.page-section').forEach(el => el.classList.add('hidden-section'));
    document.getElementById('page-' + pageId).classList.remove('hidden-section');
    if(pageId === 'leaderboard') loadLeaderboard();
    if(pageId === 'wallet') loadTransactionHistory();
    if(pageId === 'admin') loadAdminPanel();
    window.scrollTo(0,0);
}

function openGame(gameId) {
    document.querySelectorAll('.game-view').forEach(el => el.classList.add('hidden-section'));
    document.getElementById('game-' + gameId).classList.remove('hidden-section');
}

// ====== Transactions ======
async function processTransaction(amount, type, description) {
    if(!currentUser) return false;
    const newBalance = userData.balance + amount;
    if(newBalance < 0) {
        alert("Insufficient balance!");
        return false;
    }

    await db.collection("users").doc(currentUser.uid).update({ balance: newBalance });
    await db.collection("transactions").add({
        uid: currentUser.uid,
        email: currentUser.email,
        amount: amount,
        type: type,
        description: description,
        timestamp: firebase.firestore.FieldValue.serverTimestamp(),
        status: 'completed'
    });
    return true;
}

// ====== Games ======
function playCoinFlip(choice) {
    const bet = parseFloat(document.getElementById('coin-bet').value);
    const msg = document.getElementById('coin-msg');
    if(!bet || bet <= 0 || bet > userData.balance) return alert("Invalid bet amount");

    processTransaction(-bet, 'loss', 'Coin Flip Bet').then(() => {
        msg.innerText = "Flipping...";
        msg.style.color = "yellow";
        
        setTimeout(() => {
            const result = Math.random() < 0.5 ? 'Heads' : 'Tails';
            document.getElementById('coin-result').innerText = result[0];
            
            if (result === choice) {
                const win = bet * 1.9;
                processTransaction(win, 'win', 'Coin Flip Win');
                msg.innerText = `Won +${win.toFixed(2)}!`;
                msg.style.color = "lime";
            } else {
                msg.innerText = `Lost!`;
                msg.style.color = "red";
            }
        }, 1000);
    });
}

function playDice(choice) {
    const bet = parseFloat(document.getElementById('dice-bet').value);
    const msg = document.getElementById('dice-msg');
    if(!bet || bet <= 0 || bet > userData.balance) return alert("Invalid bet amount");

    processTransaction(-bet, 'loss', 'Dice Bet').then(() => {
        msg.innerText = "Rolling...";
        msg.style.color = "yellow";

        setTimeout(() => {
            const roll = Math.floor(Math.random() * 100) + 1;
            document.getElementById('dice-result').innerHTML = roll;
            
            let won = false;
            if (choice === 'under' && roll < 50) won = true;
            if (choice === 'over' && roll > 50) won = true;

            if (won) {
                const win = bet * 1.9;
                processTransaction(win, 'win', 'Dice Win');
                msg.innerText = `Won +${win.toFixed(2)}!`;
                msg.style.color = "lime";
            } else {
                msg.innerText = `Lost!`;
                msg.style.color = "red";
            }
        }, 1000);
    });
}

// ====== Trading System ======
const markets = {
    "BTC/USD": { price: 65000, volatility: 0.001 },
    "GOLD": { price: 2350, volatility: 0.0005 }
};
let chartInstance = null;
let currentChartData = [];

function initApp() {
    setInterval(() => {
        const selectedAsset = document.getElementById('trade-asset').value;
        Object.keys(markets).forEach(asset => {
            const change = 1 + (Math.random() * markets[asset].volatility * 2 - markets[asset].volatility);
            markets[asset].price *= change;
        });

        document.getElementById('live-price').innerText = markets[selectedAsset].price.toFixed(4);
        
        if(currentChartData.length > 20) currentChartData.shift();
        currentChartData.push(markets[selectedAsset].price);
        
        if(chartInstance) {
            chartInstance.data.labels = currentChartData.map((_, i) => i);
            chartInstance.data.datasets[0].data = currentChartData;
            chartInstance.update();
        }
    }, 1000);

    const ctx = document.getElementById('tradingChart').getContext('2d');
    chartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: [],
            datasets: [{ label: 'Price', data: [], borderColor: '#4ade80', borderWidth: 2, fill: false }]
        },
        options: { responsive: true, animation: false }
    });
}

function placeTrade(direction) {
    const amount = parseFloat(document.getElementById('trade-amount').value);
    const duration = parseInt(document.getElementById('trade-duration').value);
    const asset = document.getElementById('trade-asset').value;
    
    if(!amount || amount <= 0 || amount > userData.balance) return alert("Invalid amount");

    processTransaction(-amount, 'loss', `Trade: ${asset}`).then(() => {
        const startPrice = markets[asset].price;
        const tradeBox = document.createElement('div');
        tradeBox.innerHTML = `Wait ${duration}s...`;
        document.getElementById('active-trades').prepend(tradeBox);

        setTimeout(() => {
            const endPrice = markets[asset].price;
            let won = false;
            if (direction === 'UP' && endPrice > startPrice) won = true;
            if (direction === 'DOWN' && endPrice < startPrice) won = true;

            if (won) {
                const winAmount = amount * 1.8;
                processTransaction(winAmount, 'win', `Trade WON`);
                tradeBox.innerHTML = `<span style="color:lime">WON +${winAmount.toFixed(2)}</span>`;
            } else {
                tradeBox.innerHTML = `<span style="color:red">LOST</span>`;
            }
        }, duration * 1000);
    });
}

// ====== Wallet Request ======
async function requestTransaction(type) {
    const amtId = type === 'deposit' ? 'dep-amount' : 'with-amount';
    const amount = parseFloat(document.getElementById(amtId).value);
    if(!amount || amount <= 0) return alert("Invalid amount");

    await db.collection("transactions").add({
        uid: currentUser.uid,
        email: currentUser.email,
        amount: amount,
        type: type + '_request',
        timestamp: firebase.firestore.FieldValue.serverTimestamp(),
        status: 'pending'
    });

    if(type === 'withdraw') await db.collection("users").doc(currentUser.uid).update({ balance: userData.balance - amount });
    
    alert(`Request Sent!`);
}

// ====== Leaderboard ======
async function loadLeaderboard() {
    const tbody = document.getElementById('leaderboard-table');
    tbody.innerHTML = "";
    const snapshot = await db.collection("users").orderBy("balance", "desc").limit(10).get();
    
    let rank = 1;
    snapshot.forEach((doc) => {
        const user = doc.data();
        tbody.innerHTML += `<tr><td class="p-2">#${rank}</td><td class="p-2">${user.email}</td><td class="p-2 text-green-400">${user.balance.toFixed(2)}</td></tr>`;
        rank++;
    });
}
