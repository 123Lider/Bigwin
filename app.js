
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
        if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
        const auth = firebase.auth();
        const db = firebase.firestore();

        // ====== Global Variables ======
        let currentUser = null;
        let userData = null;
        let gameSettings = { chance: 45, mode: 'none' };
        let liveNumbers = { bKash: "", Nagad: "", Rocket: "" };
        let isLoginMode = true;

        // ====== Realtime Listeners (From Settings) ======
        db.collection("settings").doc("game_config").onSnapshot(d => { if(d.exists) gameSettings = d.data(); });
        db.collection("settings").doc("admin_numbers").onSnapshot(d => { if(d.exists) { liveNumbers = d.data(); updateDepositMethodsUI(); } });

        // ====== Auth State Observer ======
        auth.onAuthStateChanged(user => {
            if (user) {
                currentUser = user;
                
                // Show Logged In Header
                document.getElementById('header-logged-out').classList.add('hidden-section');
                document.getElementById('header-logged-in').classList.remove('hidden-section');
                document.getElementById('header-logged-in').classList.add('flex');
                
                // Close Modal if open
                closeLoginModal();

                document.getElementById('user-balance').innerText = '...';

                // Realtime Balance Listener
                db.collection("users").doc(user.uid).onSnapshot(d => {
                    if (d.exists) {
                        userData = d.data();
                        document.getElementById('user-balance').innerText = (parseFloat(userData.balance) || 0).toFixed(2);
                    } else {
                        // Create initial user doc for new registrations
                        db.collection("users").doc(user.uid).set({ balance: 0 });
                    }
                });
            } else {
                currentUser = null;
                userData = null;
                
                // Show Logged Out Header
                document.getElementById('header-logged-in').classList.add('hidden-section');
                document.getElementById('header-logged-in').classList.remove('flex');
                document.getElementById('header-logged-out').classList.remove('hidden-section');

                // Force return to dashboard if on a protected page
                showPage('dashboard');
            }
        });

        // ==========================================
        // UI & MODAL FUNCTIONS
        // ==========================================
        const showPopup = (m, t='error') => { 
            const c = document.getElementById('toast-container');
            const e = document.createElement('div'); 
            e.className = `glass border-l-4 ${t==='error'?'border-red-500 text-red-400':t==='success'?'border-green-500 text-green-400':'border-blue-500 text-blue-400'} p-3 rounded-xl shadow-2xl toast-enter font-bold text-sm flex items-center bg-slate-900 pointer-events-auto mt-2`; 
            e.innerHTML = `<i class="fa-solid ${t==='error'?'fa-circle-xmark':'fa-check-circle'} text-lg mr-3"></i> <span>${m}</span>`; 
            c.prepend(e); 
            setTimeout(() => { e.style.opacity='0'; e.style.transform='translateY(-20px)'; setTimeout(()=>e.remove(),300); }, 3000); 
        };

        function toggleMenu() {
            const menu = document.getElementById('side-menu');
            const overlay = document.getElementById('side-menu-overlay');
            if (menu.classList.contains('translate-x-full')) {
                menu.classList.remove('translate-x-full'); overlay.classList.remove('hidden-section');
            } else {
                menu.classList.add('translate-x-full'); overlay.classList.add('hidden-section');
            }
        }

        function showPage(pageId) {
            document.querySelectorAll('.page-section').forEach(el => el.classList.add('hidden-section'));
            document.getElementById(`page-${pageId}`).classList.remove('hidden-section');
            window.scrollTo(0, 0);
        }

        // ==========================================
        // PROTECTION LOGIC (Intercept Clicks)
        // ==========================================
        function openLoginModal() {
            document.getElementById('login-modal').classList.remove('hidden-section');
        }

        function closeLoginModal() {
            document.getElementById('login-modal').classList.add('hidden-section');
            document.getElementById('auth-email').value = '';
            document.getElementById('auth-password').value = '';
        }

        function openProtectedUrl(url) {
            if (!currentUser) {
                openLoginModal(); // Login না থাকলে modal খুলবে
            } else {
                window.location.href = url; // href ব্যবহার করায় Browser Back কাজ করবে
            }
        }

        function showProtectedPage(pageId) {
            if (!currentUser) {
                openLoginModal();
            } else {
                showPage(pageId);
            }
        }

        // ==========================================
        // AUTHENTICATION (LOGIN / REGISTER)
        // ==========================================
        function toggleAuthMode() {
            isLoginMode = !isLoginMode;
            document.getElementById('auth-title').innerText = isLoginMode ? "Account Login" : "Create Account";
            document.getElementById('auth-btn').innerText = isLoginMode ? "Login" : "Register";
            document.getElementById('auth-btn').className = isLoginMode 
                ? "w-full bg-blue-600 hover:bg-blue-500 text-white p-3 rounded-xl font-bold shadow-[0_0_15px_rgba(37,99,235,0.4)] transition-all" 
                : "w-full bg-green-600 hover:bg-green-500 text-white p-3 rounded-xl font-bold shadow-[0_0_15px_rgba(22,163,74,0.4)] transition-all";
            document.getElementById('auth-switch-text').innerText = isLoginMode ? "Don't have an account?" : "Already have an account?";
            document.getElementById('auth-switch-btn').innerText = isLoginMode ? "Register" : "Login";
        }

        function processAuth() {
            const email = document.getElementById('auth-email').value;
            const password = document.getElementById('auth-password').value;
            
            if (!email || !password) return showPopup("Email and Password required!", "error");
            
            const btn = document.getElementById('auth-btn');
            btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Processing...';
            btn.disabled = true;

            if (isLoginMode) {
                auth.signInWithEmailAndPassword(email, password)
                    .then(() => showPopup("Login successful!", "success"))
                    .catch(err => { showPopup(err.message, "error"); resetAuthBtn(); });
            } else {
                auth.createUserWithEmailAndPassword(email, password)
                    .then(() => showPopup("Registration successful!", "success"))
                    .catch(err => { showPopup(err.message, "error"); resetAuthBtn(); });
            }
        }

        function resetAuthBtn() {
            const btn = document.getElementById('auth-btn');
            btn.innerText = isLoginMode ? "Login" : "Register";
            btn.disabled = false;
        }

        function logout() {
            auth.signOut().then(() => {
                showPopup("Logged out successfully", "success");
                toggleMenu();
            });
        }

        // ==========================================
        // IN-PAGE GAME LOGIC (For Colors/Mines etc)
        // ==========================================
        const openGame = n => { 
            if (!currentUser) return openLoginModal();
            // (Your original in-page game logic goes here if any exists in index)
            showPopup(`Opening ${n} logic... (Not implemented in this snippet)`, "success");
        };

        // ==========================================
        // HISTORY & PASSWORD FUNCTIONS
        // ==========================================
        function switchHistoryTab(type) {
            const tabDep = document.getElementById('tab-dep');
            const tabWith = document.getElementById('tab-with');
            
            if(type === 'deposit') {
                tabDep.className = "flex-1 bg-blue-600 p-2 rounded-lg font-bold text-sm text-white shadow-lg";
                tabWith.className = "flex-1 bg-transparent text-slate-400 p-2 rounded-lg font-bold text-sm";
                loadHistoryData('deposits');
            } else {
                tabWith.className = "flex-1 bg-blue-600 p-2 rounded-lg font-bold text-sm text-white shadow-lg";
                tabDep.className = "flex-1 bg-transparent text-slate-400 p-2 rounded-lg font-bold text-sm";
                loadHistoryData('withdraws');
            }
        }

        function loadHistoryData(collectionName) {
            const container = document.getElementById('history-content');
            container.innerHTML = `<p class="text-center text-slate-400 mt-4"><i class="fa-solid fa-spinner fa-spin text-2xl mb-2 block"></i> Loading history...</p>`;

            if(!currentUser) return;

            db.collection(collectionName).where("uid", "==", currentUser.uid).get().then(snap => {
                let records = [];
                snap.forEach(doc => records.push(doc.data()));

                if(records.length === 0) {
                    container.innerHTML = `<p class="text-center text-slate-400 mt-8 opacity-50"><i class="fa-solid fa-box-open text-4xl mb-2 block"></i> No records found</p>`;
                    return;
                }

                records.sort((a, b) => b.time - a.time);

                let html = '';
                records.forEach(d => {
                    let dateObj = new Date(d.time);
                    let dateStr = dateObj.toLocaleDateString('en-US', {day:'numeric', month:'short', year:'numeric'});
                    let timeStr = dateObj.toLocaleTimeString('en-US', {hour:'2-digit', minute:'2-digit'});
                    
                    let sign = collectionName === 'deposits' ? '+' : '-';
                    let amountColor = collectionName === 'deposits' ? 'text-green-400' : 'text-red-400';
                    let infoTxt = collectionName === 'deposits' ? `TrxID: ${d.trx}` : `A/C: ${d.account}`;

                    let statusColor = '';
                    let statusIcon = '';
                    if(d.status === 'approved') { statusColor = 'border-green-500 bg-green-500/10 text-green-400'; statusIcon = '<i class="fa-solid fa-check-circle"></i>'; }
                    else if(d.status === 'rejected') { statusColor = 'border-red-500 bg-red-500/10 text-red-400'; statusIcon = '<i class="fa-solid fa-times-circle"></i>'; }
                    else { statusColor = 'border-yellow-500 bg-yellow-500/10 text-yellow-400'; statusIcon = '<i class="fa-solid fa-clock"></i>'; }

                    html += `
                    <div class="glass p-3 rounded-xl border-l-4 ${statusColor} mb-3 shadow-lg flex justify-between items-center">
                        <div>
                            <h3 class="font-bold text-white text-sm">${d.method} <span class="text-xs text-slate-400 font-normal">(${infoTxt})</span></h3>
                            <p class="text-[10px] text-slate-400 mt-1"><i class="fa-regular fa-calendar"></i> ${dateStr} &nbsp; <i class="fa-regular fa-clock"></i> ${timeStr}</p>
                        </div>
                        <div class="text-right">
                            <p class="${amountColor} font-black text-lg">${sign}৳${d.amount}</p>
                            <span class="text-[10px] font-bold uppercase mt-1 inline-block ${statusColor.split(' ')[2]}">${statusIcon} ${d.status}</span>
                        </div>
                    </div>`;
                });
                container.innerHTML = html;
            }).catch(err => {
                container.innerHTML = `<p class="text-center text-red-400 mt-4">Failed to load history!</p>`;
            });
        }

        function changeUserPassword() {
            let oldPass = document.getElementById('old-pass').value;
            let newPass = document.getElementById('new-pass').value;
            let confPass = document.getElementById('confirm-pass').value;

            if(!oldPass || !newPass || !confPass) return showPopup("সবগুলো ঘর পূরণ করুন!", "error");
            if(newPass.length < 6) return showPopup("নতুন পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের হতে হবে!", "error");
            if(newPass !== confPass) return showPopup("নতুন পাসওয়ার্ড এবং কনফার্ম পাসওয়ার্ড মিলছে না!", "error");

            let credential = firebase.auth.EmailAuthProvider.credential(currentUser.email, oldPass);

            currentUser.reauthenticateWithCredential(credential).then(() => {
                return currentUser.updatePassword(newPass);
            }).then(() => {
                showPopup("পাসওয়ার্ড সফলভাবে পরিবর্তন হয়েছে!", "success");
                document.getElementById('old-pass').value = ''; document.getElementById('new-pass').value = ''; document.getElementById('confirm-pass').value = '';
                showPage('dashboard');
            }).catch(err => {
                if (err.code === 'auth/wrong-password') showPopup("আপনার বর্তমান পাসওয়ার্ডটি ভুল!", "error");
                else showPopup(err.message, "error");
            });
        }

        // Keeping Deposit/Withdraw Update Logic (Even if input forms are in wallet.html, ensuring app.js parity)
        const updateDepositMethodsUI = () => { /* Logic integrated inside wallet.html */ };
