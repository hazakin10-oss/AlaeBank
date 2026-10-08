// 1. STATE MANAGEMENT
let currentUser = null;
let currentStep = 1;
let activePaymentMethod = 'ewallet';
let pendingAuthUser = null;
let pendingOtp = '123456';
let sessionTimer = null;
let applicationHistory = JSON.parse(localStorage.getItem('alaeLoanApplications') || '[]');

// Sample initial payment history state
let paymentHistory = [
    {
        ref: '#ALAE-2026-88102',
        date: 'Sep 25, 2026 • 10:15 AM',
        account: 'AL-PL-884920',
        loanType: 'Personal Loan',
        method: 'GCash E-Wallet',
        amount: 8750.00,
        status: 'SUCCESS'
    },
    {
        ref: '#ALAE-2026-74911',
        date: 'Aug 24, 2026 • 02:40 PM',
        account: 'AL-PL-884920',
        loanType: 'Personal Loan',
        method: 'Visa Debit Card',
        amount: 8750.00,
        status: 'SUCCESS'
    },
    {
        ref: '#ALAE-2026-62019',
        date: 'Jul 22, 2026 • 11:05 AM',
        account: 'AL-VH-304912',
        loanType: 'Vehicle',
        method: 'Batangas Branch OTC',
        amount: 3200.00,
        status: 'SUCCESS'
    }
];

// 2. AUTHENTICATION HANDLERS
function switchAuthMode(mode) {
    const signInForm = document.getElementById('signInForm');
    const registerForm = document.getElementById('registerForm');
    const tabSignInBtn = document.getElementById('tabSignInBtn');
    const tabRegisterBtn = document.getElementById('tabRegisterBtn');
    const alertBox = document.getElementById('authAlert');

    alertBox.classList.add('hidden');

    if (mode === 'signin') {
        signInForm.classList.remove('hidden');
        registerForm.classList.add('hidden');
        tabSignInBtn.className = "flex-1 py-2 text-center border-b-2 border-navy-800 text-navy-800 font-bold transition";
        tabRegisterBtn.className = "flex-1 py-2 text-center text-slate-400 border-b-2 border-transparent hover:text-slate-600 transition";
    } else {
        signInForm.classList.add('hidden');
        registerForm.classList.remove('hidden');
        tabRegisterBtn.className = "flex-1 py-2 text-center border-b-2 border-navy-800 text-navy-800 font-bold transition";
        tabSignInBtn.className = "flex-1 py-2 text-center text-slate-400 border-b-2 border-transparent hover:text-slate-600 transition";
    }
}

function fillDemoCredentials() {
    document.getElementById('loginEmail').value = 'borrower@alae.ph';
    document.getElementById('loginPassword').value = 'pass123';
    switchAuthMode('signin');
    handleSignIn(new Event('submit'));
}

function getRegisteredAccounts() {
    try {
        return JSON.parse(localStorage.getItem('alaeRegisteredAccounts') || '[]');
    } catch (error) {
        return [];
    }
}

function saveRegisteredAccount(account) {
    const accounts = getRegisteredAccounts();
    const existingIndex = accounts.findIndex(a => a.email.toLowerCase() === account.email.toLowerCase());
    if (existingIndex >= 0) {
        accounts[existingIndex] = account;
    } else {
        accounts.push(account);
    }
    localStorage.setItem('alaeRegisteredAccounts', JSON.stringify(accounts));
}

function handleSignIn(e) {
    e.preventDefault();
    const email = document.getElementById('loginEmail').value.trim().toLowerCase();
    const password = document.getElementById('loginPassword').value;
    const alertBox = document.getElementById('authAlert');

    // Demo account
    if (email === 'borrower@alae.ph' && password === 'pass123') {
        currentUser = {
            name: 'Juan De La Cruz',
            email: email,
            accountNumber: 'AL-PL-884920',
            balance: 145200.00,
            dueDate: 'Oct 25, 2026'
        };
        beginOtpVerification({name:'Juan De La Cruz', email:email, accountNumber:'AL-PL-884920', balance:145200.00, dueDate:'Oct 25, 2026'});
        return;
    }

    // Look for an account created through the registration form
    const account = getRegisteredAccounts().find(a =>
        a.email.toLowerCase() === email && a.password === password
    );

    if (!account) {
        alertBox.className = 'mb-4 p-3 rounded-lg text-xs font-medium flex items-center gap-2 bg-red-50 text-red-700 border border-red-200';
        alertBox.innerHTML = '<i class="fa-solid fa-circle-exclamation"></i><span>Account not found or password is incorrect.</span>';
        return;
    }

    currentUser = {
        name: account.name,
        email: account.email,
        accountNumber: account.accountNumber,
        balance: account.balance || 0,
        dueDate: account.dueDate || '—'
    };

    beginOtpVerification({name:account.name, email:account.email, accountNumber:account.accountNumber, balance:account.balance || 0, dueDate:account.dueDate || '—'});
}

function handleRegister(e) {
    e.preventDefault();
    const name = document.getElementById('regName').value.trim();
    const email = document.getElementById('regEmail').value.trim().toLowerCase();
    const loanNo = document.getElementById('regLoanNo').value.trim() || 'AL-PL-884920';
    const password = document.getElementById('regPassword').value;

    if (password.length < 6) {
        showAuthError('Password must be at least 6 characters.');
        return;
    }

    const account = {
        name: name,
        email: email,
        password: password,
        accountNumber: loanNo,
        balance: 145200.00,
        dueDate: 'Oct 25, 2026'
    };

    saveRegisteredAccount(account);

    currentUser = {
        name: name,
        email: email,
        accountNumber: loanNo,
        balance: 145200.00,
        dueDate: 'Oct 25, 2026'
    };

    beginOtpVerification(currentUser, 'Account created successfully.');
}

function showAuthError(message) {
    const alertBox = document.getElementById('authAlert');
    alertBox.className = 'mb-4 p-3 rounded-lg text-xs font-medium flex items-center gap-2 bg-red-50 text-red-700 border border-red-200';
    alertBox.innerHTML = '<i class="fa-solid fa-circle-exclamation"></i><span>' + message + '</span>';
}

function unlockPortal() {
    document.getElementById('authOverlay').classList.add('hidden');
    
    // Update UI elements with logged in user info
    document.getElementById('userDisplayName').innerText = currentUser.name;
    document.getElementById('dashWelcomeName').innerText = currentUser.name;
    document.getElementById('userDisplayAcc').innerText = currentUser.accountNumber;
    document.getElementById('dashAccountNo').innerText = currentUser.accountNumber;
    document.getElementById('revName').innerText = currentUser.name;
    document.getElementById('rcptName').innerText = currentUser.name;
    document.getElementById('applicationName').value = currentUser.name;
    document.getElementById('applicationEmail').value = currentUser.email;
    const initials = currentUser.name.split(/\s+/).filter(Boolean).slice(0,2).map(n => n[0]).join('').toUpperCase();
    document.getElementById('userInitials').innerText = initials || 'AL';
    document.getElementById('profileInitials').innerText = initials || 'AL';
    document.getElementById('profileNameHeading').innerText = currentUser.name;
    document.getElementById('profileFullName').innerText = currentUser.name;
    document.getElementById('profileEmail').innerText = currentUser.email;
    document.getElementById('profileAccount').innerText = currentUser.accountNumber;
    document.getElementById('profileCustomerNo').innerText = currentUser.accountNumber;
    document.getElementById('lastLoginText').innerText = new Date().toLocaleString();
    renderPaymentHistory();
    renderApplicationTracker();
    startSessionTimer();
}

function beginOtpVerification(user, message='') {
    pendingAuthUser = user;
    pendingOtp = '123456';
    document.getElementById('demoOtpCode').innerText = pendingOtp;
    document.getElementById('otpInput').value = '';
    document.getElementById('otpModal').classList.remove('hidden');
    if (message) showToast(message + ' Verify the demo OTP to continue.', 'success');
}

function verifyOtp() {
    const entered = document.getElementById('otpInput').value.trim();
    if (entered !== pendingOtp) { showToast('Invalid verification code. Please try again.', 'error'); return; }
    currentUser = pendingAuthUser;
    pendingAuthUser = null;
    document.getElementById('otpModal').classList.add('hidden');
    unlockPortal();
    showToast('Secure login verified. Welcome, ' + currentUser.name + '!', 'success');
}

function cancelOtp() { pendingAuthUser = null; document.getElementById('otpModal').classList.add('hidden'); }

function startSessionTimer() {
    clearTimeout(sessionTimer);
    sessionTimer = setTimeout(() => {
        if (currentUser) { currentUser = null; document.getElementById('authOverlay').classList.remove('hidden'); showToast('Your session expired for security. Please sign in again.', 'info'); }
    }, 10 * 60 * 1000);
}

function resetSessionTimer() { if (currentUser) startSessionTimer(); }

function toggleNotifications() { document.getElementById('notificationPanel').classList.toggle('hidden'); }
function markNotificationsRead() { document.getElementById('notificationBadge').classList.add('hidden'); showToast('Notifications marked as read.', 'info'); }

function renderApplicationTracker() {
    const box = document.getElementById('applicationTracker');
    if (!box) return;
    const mine = currentUser ? applicationHistory.filter(a => a.email === currentUser.email) : [];
    if (!mine.length) { box.innerHTML = '<div class="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-500 text-center">No applications submitted yet.</div>'; return; }
    box.innerHTML = mine.map(a => `
        <div class="p-4 rounded-xl border border-slate-200 bg-slate-50">
            <div class="flex flex-wrap justify-between gap-2"><div><b class="text-sm text-navy-900">${a.product}</b><div class="text-[10px] text-slate-500 font-mono mt-1">${a.reference}</div></div><span class="px-2.5 py-1 rounded-full bg-gold-100 text-gold-800 border border-gold-200 text-[10px] font-bold">${a.status}</span></div>
            <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 text-[11px]"><div><span class="block text-slate-400">Requested</span><b>₱${Number(a.amount).toLocaleString('en-US',{minimumFractionDigits:2})}</b></div><div><span class="block text-slate-400">Term</span><b>${a.term}</b></div><div><span class="block text-slate-400">Submitted</span><b>${a.date}</b></div><div><span class="block text-slate-400">Purpose</span><b>${a.purpose}</b></div></div>
            <div class="mt-4 flex gap-1">${['Submitted','Under Review','Documents Required','Approved'].map((x,i)=>`<div class="h-1.5 flex-1 rounded-full ${i <= 1 ? 'bg-gold-500' : 'bg-slate-200'}" title="${x}"></div>`).join('')}</div>
        </div>`).join('');
}

function downloadStatement() {
    if (!currentUser) return;
    const rows = paymentHistory.filter(x => x.account === currentUser.accountNumber || x.account === 'AL-PL-884920' || x.account === 'AL-VH-304912');
    const html = `<html><head><title>ALAE Bank Statement</title><style>body{font-family:Arial;padding:30px;color:#0e1f38}table{width:100%;border-collapse:collapse;margin-top:20px}th,td{padding:10px;border-bottom:1px solid #ddd;text-align:left}h1{margin-bottom:4px}.gold{color:#967a3f}</style></head><body><h1>ALAE BANK</h1><div class="gold">Electronic Payment Statement</div><p><b>Customer:</b> ${currentUser.name}<br><b>Account:</b> ${currentUser.accountNumber}<br><b>Generated:</b> ${new Date().toLocaleString()}</p><table><tr><th>Reference</th><th>Date</th><th>Account</th><th>Method</th><th>Amount</th><th>Status</th></tr>${rows.map(x=>`<tr><td>${x.ref}</td><td>${x.date}</td><td>${x.account}</td><td>${x.method}</td><td>₱${x.amount.toLocaleString('en-US',{minimumFractionDigits:2})}</td><td>${x.status}</td></tr>`).join('')}</table><p style="margin-top:30px;font-size:12px;color:#666">This is a demonstration statement generated by the ALAE Bank online portal prototype.</p></body></html>`;
    const w=window.open('','_blank'); w.document.write(html); w.document.close(); w.print();
}

function handleLogout() {
    currentUser = null;
    clearTimeout(sessionTimer);
    document.getElementById('authOverlay').classList.remove('hidden');
    document.getElementById('loginEmail').value = '';
    document.getElementById('loginPassword').value = '';
    showToast('Logged out securely.', 'info');
}

// Opens the application form directly from a specific loan product.
function applyForProduct(product) {
    if (!currentUser) {
        showToast('Please sign in before applying for a loan.', 'info');
        return;
    }
    switchTab('apply');
    const productField = document.getElementById('applicationProduct');
    if (productField) {
        productField.value = product;
        productField.dispatchEvent(new Event('change'));
    }
    const heading = document.getElementById('applicationProductHeading');
    if (heading) heading.innerText = product + ' Application';
    const purpose = document.getElementById('applicationPurpose');
    if (purpose && !purpose.value) {
        const defaults = {
            'Personal Loan': 'Personal, family, education, medical, or emergency needs',
            'Vehicle': 'Purchase of an eligible new or pre-owned vehicle',
            'Mortgage': 'Home purchase, construction, or residential financing',
            'Real Estate Loan': 'Property acquisition, construction, or improvement'
        };
        purpose.placeholder = defaults[product] || 'Purpose of the loan';
    }
    setTimeout(() => {
        const form = document.getElementById('loanApplicationForm');
        if (form) form.scrollIntoView({behavior:'smooth', block:'start'});
    }, 80);
}

function submitLoanApplication(e) {
    e.preventDefault();

    const product = document.getElementById('applicationProduct').value;
    const amount = parseFloat(document.getElementById('applicationAmount').value) || 0;
    const term = document.getElementById('applicationTerm').value;
    const purpose = document.getElementById('applicationPurpose').value.trim();

    if (!product || amount <= 0 || !term || !purpose) {
        showToast('Please complete all application fields.', 'error');
        return;
    }

    const reference = 'ALAE-APP-' + Date.now().toString().slice(-8);
    applicationHistory.unshift({reference, name:currentUser.name, email:currentUser.email, product, amount, term, purpose, status:'Under Review', date:new Date().toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'})});
    localStorage.setItem('alaeLoanApplications', JSON.stringify(applicationHistory));
    renderApplicationTracker();
    showToast('Application ' + reference + ' submitted successfully and is now under review.', 'success');

    document.getElementById('loanApplicationForm').reset();
    document.getElementById('applicationName').value = currentUser.name;
    document.getElementById('applicationEmail').value = currentUser.email;
}

document.addEventListener('DOMContentLoaded', () => {
    const productField = document.getElementById('applicationProduct');
    const hint = document.getElementById('applicationProductHint');
    if (productField && hint) {
        productField.addEventListener('change', () => {
            hint.innerText = productField.value ? 'You are applying for: ' + productField.value : 'Select a financing product to begin your application.';
        });
    }
});

// 3. NAVIGATION TABS
function switchTab(tabName) {
    const views = ['dashboard', 'pay', 'products', 'apply', 'history', 'profile', 'faq'];
    views.forEach(v => {
        const el = document.getElementById('view-' + v);
        const navBtn = document.getElementById('nav-' + v);
        
        if (v === tabName) {
            el.classList.remove('hidden');
            if (navBtn) navBtn.className = "px-4 py-2 rounded-lg text-xs font-semibold text-white bg-gold-500 shadow transition";
        } else {
            el.classList.add('hidden');
            if (navBtn) navBtn.className = "px-4 py-2 rounded-lg text-xs font-semibold text-slate-300 hover:text-white hover:bg-navy-700 transition";
        }
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// 4. MULTI-STEP PAYMENT CONSOLE WIZARD
function updatePayAccountDetails() {
    const select = document.getElementById('payAccountSelect');
    const customDiv = document.getElementById('customAccountInputDiv');
    const amtInput = document.getElementById('payAmountInput');

    if (select.value === 'CUSTOM') {
        customDiv.classList.remove('hidden');
    } else {
        customDiv.classList.add('hidden');
        if (select.value === 'AL-PL-884920') {
            amtInput.value = 8750;
        } else if (select.value === 'AL-VH-304912') {
            amtInput.value = 3200;
        }
    }
    calculateBreakdown();
}

function setPayAmount(val) {
    document.getElementById('payAmountInput').value = val;
    calculateBreakdown();
}

function calculateBreakdown() {
    const baseVal = parseFloat(document.getElementById('payAmountInput').value) || 0;
    const fee = 15.00;
    const total = baseVal + fee;

    document.getElementById('summaryBaseAmount').innerText = '₱' + baseVal.toLocaleString('en-US', {minimumFractionDigits: 2});
    document.getElementById('summaryFee').innerText = '₱' + fee.toFixed(2);
    document.getElementById('summaryTotalAmount').innerText = '₱' + total.toLocaleString('en-US', {minimumFractionDigits: 2});
}

function selectMethod(method) {
    activePaymentMethod = method;
    const methods = ['ewallet', 'card', 'branch'];

    methods.forEach(m => {
        const card = document.getElementById('method-card-' + m);
        const fields = document.getElementById('method-fields-' + m);

        if (m === method) {
            card.classList.add('border-gold-500', 'bg-gold-50/20');
            card.classList.remove('border-transparent');
            fields.classList.remove('hidden');
        } else {
            card.classList.remove('border-gold-500', 'bg-gold-50/20');
            fields.classList.add('hidden');
        }
    });
}

function goToStep(stepNumber) {
    currentStep = stepNumber;
    
    // Hide all steps
    for (let i = 1; i <= 4; i++) {
        document.getElementById('payment-step-' + i).classList.add('hidden');
        
        // Update indicator styling
        const ind = document.getElementById('step-ind-' + i);
        if (i <= stepNumber) {
            ind.className = "flex items-center gap-2 font-bold text-xs text-navy-800";
            ind.querySelector('span:first-child').className = "w-6 h-6 rounded-full bg-navy-800 text-white flex items-center justify-center text-xs";
        } else {
            ind.className = "flex items-center gap-2 text-xs text-slate-400 font-semibold";
            ind.querySelector('span:first-child').className = "w-6 h-6 rounded-full bg-slate-300 text-slate-600 flex items-center justify-center text-xs";
        }
    }

    // Show target step
    document.getElementById('payment-step-' + stepNumber).classList.remove('hidden');

    // Populate Step 3 Review Data
    if (stepNumber === 3) {
        const targetAccSelect = document.getElementById('payAccountSelect').value;
        const accNo = targetAccSelect === 'CUSTOM' ? document.getElementById('customAccountInput').value : targetAccSelect;
        const baseVal = parseFloat(document.getElementById('payAmountInput').value) || 0;
        const total = baseVal + 15.00;

        let channelName = "E-Wallet";
        if (activePaymentMethod === 'ewallet') {
            channelName = document.getElementById('ewalletProvider').value + ' (' + document.getElementById('ewalletPhone').value + ')';
        } else if (activePaymentMethod === 'card') {
            channelName = 'Debit/Credit Card (' + document.getElementById('cardNumber').value.slice(-4) + ')';
        } else {
            channelName = 'Batangas Branch OTC Teller';
        }

        document.getElementById('revAccount').innerText = accNo;
        document.getElementById('revChannel').innerText = channelName;
        document.getElementById('revPrincipal').innerText = '₱' + baseVal.toLocaleString('en-US', {minimumFractionDigits