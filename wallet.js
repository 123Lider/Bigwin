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
        let liveNumbers = { bKash: "", Nagad: "", Rocket: "", UPay: "" };

        // Toast Message Function
        function showToast(msg, type='error') {
            const container = document.getElementById('toast-container');
            const toast = document.createElement('div');
            toast.className = `toast ${type}`;
            toast.innerHTML = `<i class="fa-solid ${type==='error'?'fa-circle-xmark':'fa-check-circle'} text-lg" style="margin-right:10px;"></i> <span>${msg}</span>`;
            container.prepend(toast);
            setTimeout(() => { toast.style.opacity='0'; setTimeout(()=>toast.remove(),300); }, 3000);
        }

        // Check Auth Status
        auth.onAuthStateChanged(u => {
            if(u) {
                currentUser = u;
                db.collection("users").doc(u.uid).onSnapshot(d => {
                    if(d.exists) userData = d.data();
                });
            } else {
                window.location.href = 'index.html'; // Not logged in, send back to home
            }
        });

        // Get Live Admin Numbers from Firebase
        db.collection("settings").doc("admin_numbers").onSnapshot(d => { 
            if(d.exists) liveNumbers = d.data(); 
        });

        // ================= WALLET LOGIC =================
        let currentData = {
            deposit: { method: 'bKash', channel: 'Cash Out', amount: '' },
            withdraw: { method: 'bKash', channel: 'Personal', amount: '', number: '', password: '' }
        };

        function switchTab(tabName) {
            document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
            document.querySelectorAll('.content-section').forEach(c => c.classList.remove('active'));

            document.getElementById('back-btn').style.display = 'none';
            document.getElementById('home-btn').style.display = 'block'; // Show home button
            document.getElementById('main-tabs').style.display = 'block';
            document.getElementById('header-title').innerHTML = '<i class="fa-solid fa-wallet"></i> My Wallet';

            if (tabName === 'deposit') {
                document.querySelectorAll('.tab')[0].classList.add('active');
                document.getElementById('deposit-section').classList.add('active');
            } else {
                document.querySelectorAll('.tab')[1].classList.add('active');
                document.getElementById('withdrawal-section').classList.add('active');
            }
        }

        function selectItem(groupId, element, value) {
            let container = document.getElementById(groupId + '-grid');
            let items = container.querySelectorAll('.pay-card, .btn-gray');
            items.forEach(item => item.classList.remove('active'));
            element.classList.add('active');

            if(groupId === 'dep-method') currentData.deposit.method = value;
            if(groupId === 'dep-channel') currentData.deposit.channel = value;
            if(groupId === 'with-method') currentData.withdraw.method = value;
            if(groupId === 'with-channel') currentData.withdraw.channel = value;
        }

        function setInputValue(inputId, val) {
            document.getElementById(inputId).value = val;
        }

        // ====== DEPOSIT STEP 2 ======
        // ====== DEPOSIT STEP 2 ======
        function goToDepositConfirm() {
            let amount = parseFloat(document.getElementById('dep-amount').value);
            if (isNaN(amount) || amount < 100) {
                return showToast("সর্বনিম্ন ডিপোজিট ১০০ টাকা!", "error");
            }
            currentData.deposit.amount = amount;

            // ডাটাবেস থেকে Cash Out নাকি Send Money সেই অনুযায়ী নাম্বার চেক করা
            let methodData = liveNumbers[currentData.deposit.method];
            let dbNumber = methodData ? methodData[currentData.deposit.channel] : "";

            if(!dbNumber || dbNumber.trim() === "") {
                return showToast(`এই মুহূর্তে ${currentData.deposit.method} ${currentData.deposit.channel} বন্ধ আছে।`, "error");
            }

            document.getElementById('conf-method').innerText = currentData.deposit.method;
            document.getElementById('conf-channel').innerText = currentData.deposit.channel;
            document.getElementById('display-channel-type').innerText = currentData.deposit.channel;
            document.getElementById('conf-amount').innerText = amount;
            document.getElementById('admin-number').innerText = dbNumber;

            document.getElementById('deposit-section').classList.remove('active');
            document.getElementById('main-tabs').style.display = 'none';
            
            document.getElementById('home-btn').style.display = 'none'; // Hide home button
            document.getElementById('back-btn').style.display = 'block'; // Show back button
            
            document.getElementById('header-title').innerText = 'Confirm Deposit';
            document.getElementById('deposit-confirm-section').classList.add('active');
        }

        function goBackToDeposit() {
            document.getElementById('deposit-confirm-section').classList.remove('active');
            document.getElementById('back-btn').style.display = 'none';
            document.getElementById('home-btn').style.display = 'block';
            document.getElementById('main-tabs').style.display = 'block';
            document.getElementById('header-title').innerHTML = '<i class="fa-solid fa-wallet"></i> My Wallet';
            document.getElementById('deposit-section').classList.add('active');
        }

        function copyAdminNumber() {
            let num = document.getElementById('admin-number').innerText;
            navigator.clipboard.writeText(num).then(() => {
                showToast("Admin number copied!", "success");
            });
        }

        // ====== FIREBASE DEPOSIT ======
        function finalSubmitDeposit() {
            let userNumber = document.getElementById('user-send-number').value;
            let trxId = document.getElementById('user-trx-id').value;

            if(!userNumber || !trxId) {
                return showToast("আপনার নাম্বার ও TrxID দিন!", "error");
            }

            db.collection("deposits").add({
                uid: currentUser.uid,
                method: currentData.deposit.method,
                channel: currentData.deposit.channel,
                amount: currentData.deposit.amount,
                sender: userNumber,
                trx: trxId,
                status: 'pending',
                time: Date.now()
            }).then(() => {
                showToast("ডিপোজিট রিকুয়েস্ট সফলভাবে পাঠানো হয়েছে!", "success");
                document.getElementById('user-send-number').value = '';
                document.getElementById('user-trx-id').value = '';
                document.getElementById('dep-amount').value = '';
                setTimeout(() => { window.location.replace("index.html"); }, 1500); // Back to home after success
            }).catch(err => showToast(err.message, "error"));
        }

        // ====== FIREBASE WITHDRAW ======
        // ====== FIREBASE WITHDRAW (Secured with Password Verification) ======
        function submitWithdraw() {
            let userNumber = document.getElementById('with-number').value;
            let amount = parseFloat(document.getElementById('with-amount').value);
            let pass = document.getElementById('with-password').value;

            // ১. ইনপুট চেক
            if(!userNumber || isNaN(amount) || amount < 100 || !pass) {
                return showToast("সঠিক তথ্য এবং পাসওয়ার্ড দিন (Min: 100)", "error");
            }

            // ২. ব্যালেন্স চেক
            let currentBal = parseFloat(userData.balance) || 0;
            if(amount > currentBal) {
                return showToast("আপনার একাউন্টে পর্যাপ্ত ব্যালেন্স নেই!", "error");
            }

            // ৩. পাসওয়ার্ড ভেরিফিকেশন (অত্যন্ত গুরুত্বপূর্ণ)
            // ইউজারের ইমেইল এবং দেওয়া পাসওয়ার্ড দিয়ে Firebase-এ ক্রেডেনশিয়াল তৈরি করা
            let credential = firebase.auth.EmailAuthProvider.credential(currentUser.email, pass);
            
            // Re-authenticate করা (পাসওয়ার্ড সঠিক কি না যাচাই করা)
            currentUser.reauthenticateWithCredential(credential).then(() => {
                
                // পাসওয়ার্ড সঠিক হলে প্রথমে ব্যালেন্স কাটবে
                return db.collection("users").doc(currentUser.uid).update({ 
                    balance: currentBal - amount 
                });

            }).then(() => {
                
                // ব্যালেন্স কাটা সফল হলে Withdraw রিকুয়েস্ট ডাটাবেসে সেভ করবে
                return db.collection("withdraws").add({
                    uid: currentUser.uid,
                    method: currentData.withdraw.method,
                    channel: currentData.withdraw.channel,
                    account: userNumber,
                    amount: amount,
                    status: 'pending',
                    time: Date.now()
                });

            }).then(() => {
                
                // সব সফল হলে সাকসেস মেসেজ দেখাবে
                showToast("উইথড্র রিকুয়েস্ট সফল!", "success");
                document.getElementById('with-number').value = '';
                document.getElementById('with-amount').value = '';
                document.getElementById('with-password').value = '';
                setTimeout(() => { window.location.replace("index.html"); }, 1500); // Back to home

            }).catch(err => {
                
                // যদি পাসওয়ার্ড ভুল হয় বা অন্য কোনো এরর আসে
                if (err.code === 'auth/wrong-password') {
                    showToast("আপনার দেওয়া পাসওয়ার্ডটি ভুল!", "error");
                } else if (err.code === 'auth/too-many-requests') {
                    showToast("অনেকবার ভুল পাসওয়ার্ড দিয়েছেন। কিছুক্ষণ পর চেষ্টা করুন!", "error");
                } else {
                    showToast(err.message, "error");
                }
                
            });
        }
// ==========================================
        // URL PARAMETER CHECKING (Auto Open Tab)
        // ==========================================
        window.onload = function() {
            const urlParams = new URLSearchParams(window.location.search);
            const tab = urlParams.get('tab');
            
            if(tab === 'withdraw') {
                switchTab('withdrawal');
            } else {
                switchTab('deposit');
            }
        };

// ==========================================
    // MOBILE BACK BUTTON FIX
    // ==========================================
    window.history.pushState(null, null, window.location.href);
    window.addEventListener('popstate', function(event) {
        window.location.replace('index.html');
    });