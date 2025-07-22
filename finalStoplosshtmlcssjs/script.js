// Initialize EmailJS with proper configuration
(function () {
    // Initialize with default public key - will be overridden by user configurations
    emailjs.init("tgdTBXzbizQIR2IaY");
})();

// Authentication System
let currentUser = null;
let selectedAvatar = null;
let uploadedImage = null;
let currentNotesFilter = 'today';
let selectedFeeType = 'taker'; // Default to taker fee
let priceHistory = [];
let priceHistoryChart = null;
let alertInterval = null;
let previousPrice = null;
let apiStatus = {
    binance: 'checking',
    coinbase: 'checking',
    kraken: 'checking'
};
let currentEmailJSConfig = null;
let editingEmailJSId = null;

// Currency conversion constants
const USD_TO_INR_RATE = 85;

// Initialize app
document.addEventListener('DOMContentLoaded', function () {
    checkLoginStatus();
});

function checkLoginStatus() {
    const savedUser = localStorage.getItem('currentUser');
    if (savedUser) {
        currentUser = JSON.parse(savedUser);
        showDashboard();
    } else {
        showLoginPage();
    }
}

function showLoginPage() {
    document.getElementById('loginPage').style.display = 'flex';
    document.getElementById('mainDashboard').style.display = 'none';
}

function showDashboard() {
    document.getElementById('loginPage').style.display = 'none';
    document.getElementById('mainDashboard').style.display = 'block';

    // Update user info in header
    if (currentUser) {
        document.getElementById('userName').textContent = currentUser.fullName || currentUser.username;
        document.getElementById('userEmail').textContent = currentUser.email || 'Account Holder';

        // Create avatar initials
        const name = currentUser.fullName || currentUser.username;
        const initials = name.split(' ').map(name => name[0]).join('').toUpperCase().substring(0, 2);

        // Set avatar if exists
        const avatar = document.getElementById('userAvatar');
        if (currentUser.avatar) {
            avatar.textContent = '';
            avatar.style.backgroundImage = `url(${currentUser.avatar})`;
        } else {
            avatar.textContent = initials;
            avatar.style.backgroundImage = '';
        }
    }

    // Initialize the trading calculator
    initializeApp();
}

function showLoginForm() {
    document.getElementById('loginForm').style.display = 'block';
    document.getElementById('signupForm').style.display = 'none';
    clearMessages();
    clearForms();
}

function showSignupForm() {
    document.getElementById('loginForm').style.display = 'none';
    document.getElementById('signupForm').style.display = 'block';
    clearMessages();
    clearForms();
}

function clearMessages() {
    document.getElementById('loginError').style.display = 'none';
    document.getElementById('signupError').style.display = 'none';
    document.getElementById('signupSuccess').style.display = 'none';
}

function clearForms() {
    // Clear login form
    document.getElementById('username').value = '';
    document.getElementById('password').value = '';

    // Clear signup form
    document.getElementById('signupFullName').value = '';
    document.getElementById('signupUsername').value = '';
    document.getElementById('signupEmail').value = '';
    document.getElementById('signupPassword').value = '';
    document.getElementById('signupConfirmPassword').value = '';

    // Clear EmailJS fields
    document.getElementById('signupPublicKey').value = '';
    document.getElementById('signupServiceId').value = '';
    document.getElementById('signupTemplateId').value = '';

    // Reset password requirements
    const requirements = ['req-length', 'req-uppercase', 'req-lowercase', 'req-number', 'req-special'];
    requirements.forEach(reqId => {
        const element = document.getElementById(reqId);
        if (element) {
            element.className = 'requirement-not-met';
        }
    });

    // Disable signup button
    const signupBtn = document.getElementById('signupBtn');
    if (signupBtn) {
        signupBtn.disabled = true;
    }

    // Reset EmailJS toggle
    const emailjsToggle = document.getElementById('emailjsToggle');
    const emailjsContent = document.getElementById('emailjsContent');
    if (emailjsToggle && emailjsContent) {
        emailjsToggle.classList.remove('active');
        emailjsContent.classList.remove('active');
    }
}

// EmailJS Toggle Function
function toggleEmailJSSection() {
    const toggle = document.getElementById('emailjsToggle');
    const content = document.getElementById('emailjsContent');

    toggle.classList.toggle('active');
    content.classList.toggle('active');
}

function handleLogin(event) {
    event.preventDefault();

    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value;
    const loginButton = document.getElementById('loginButton');
    const loginError = document.getElementById('loginError');

    // Hide previous error
    loginError.style.display = 'none';

    // Show loading state
    loginButton.disabled = true;
    loginButton.innerHTML = '<div class="loading"></div> Authenticating...';

    // Simulate authentication delay
    setTimeout(() => {
        // Check default admin account
        if (username === 'bytebot' && password === 'Soumen@2005') {
            currentUser = {
                username: 'bytebot',
                fullName: 'Soumen Bhandari',
                email: 'admin@tradingcalc.com',
                isAdmin: true
            };
            localStorage.setItem('currentUser', JSON.stringify(currentUser));
            showNotification('Login successful! Welcome to your trading dashboard.', 'success');
            showDashboard();
        } else {
            // Check registered users
            const users = JSON.parse(localStorage.getItem('registeredUsers') || '[]');
            const user = users.find(u => u.username === username && u.password === password);

            if (user) {
                currentUser = {
                    username: user.username,
                    fullName: user.fullName,
                    email: user.email,
                    isAdmin: false,
                    avatar: user.avatar || null,
                    emailjsConfigs: user.emailjsConfigs || []
                };
                localStorage.setItem('currentUser', JSON.stringify(currentUser));
                showNotification('Login successful! Welcome back, ' + user.fullName, 'success');
                showDashboard();
            } else {
                loginError.style.display = 'block';
                showNotification('Invalid credentials. Please try again.', 'error');
            }
        }

        // Reset button state
        loginButton.disabled = false;
        loginButton.innerHTML = '<i class="fas fa-sign-in-alt"></i> Access Dashboard';
    }, 1500);
}

function handleSignup(event) {
    event.preventDefault();

    const fullName = document.getElementById('signupFullName').value.trim();
    const username = document.getElementById('signupUsername').value.trim();
    const email = document.getElementById('signupEmail').value.trim();
    const password = document.getElementById('signupPassword').value;
    const confirmPassword = document.getElementById('signupConfirmPassword').value;
    const signupError = document.getElementById('signupError');
    const signupSuccess = document.getElementById('signupSuccess');
    const signupBtn = document.getElementById('signupBtn');

    // Get EmailJS configuration if provided
    const emailjsToggle = document.getElementById('emailjsToggle');
    const publicKey = document.getElementById('signupPublicKey').value.trim();
    const serviceId = document.getElementById('signupServiceId').value.trim();
    const templateId = document.getElementById('signupTemplateId').value.trim();

    // Hide previous messages
    signupError.style.display = 'none';
    signupSuccess.style.display = 'none';

    // Show loading state
    signupBtn.disabled = true;
    signupBtn.innerHTML = '<div class="loading"></div> Creating account...';

    // Validate inputs
    if (!validateSignupForm(fullName, username, email, password, confirmPassword)) {
        signupBtn.disabled = false;
        signupBtn.innerHTML = '<i class="fas fa-user-plus"></i> Create Account';
        return;
    }

    // Check if username already exists
    const users = JSON.parse(localStorage.getItem('registeredUsers') || '[]');

    if (users.some(u => u.username === username)) {
        signupError.textContent = 'Username already exists. Please choose a different username.';
        signupError.style.display = 'block';
        signupBtn.disabled = false;
        signupBtn.innerHTML = '<i class="fas fa-user-plus"></i> Create Account';
        return;
    }

    // Check if email already exists
    if (users.some(u => u.email === email)) {
        signupError.textContent = 'Email already registered. Please use a different email.';
        signupError.style.display = 'block';
        signupBtn.disabled = false;
        signupBtn.innerHTML = '<i class="fas fa-user-plus"></i> Create Account';
        return;
    }

    // Create EmailJS configuration if provided
    let emailjsConfigs = [];
    if (emailjsToggle.classList.contains('active') && publicKey && serviceId && templateId) {
        emailjsConfigs.push({
            id: Date.now().toString(),
            name: 'Default Configuration',
            publicKey: publicKey,
            serviceId: serviceId,
            templateId: templateId,
            isActive: true,
            createdAt: new Date().toISOString()
        });
    }

    // Create new user
    const newUser = {
        fullName,
        username,
        email,
        password,
        createdAt: new Date().toISOString(),
        avatar: null,
        emailjsConfigs: emailjsConfigs
    };

    users.push(newUser);

    try {
        localStorage.setItem('registeredUsers', JSON.stringify(users));

        // Show success message
        const configMessage = emailjsConfigs.length > 0 ? ' Email notifications have been configured.' : '';
        signupSuccess.textContent = 'Account created successfully!' + configMessage + ' You can now sign in.';
        signupSuccess.style.display = 'block';

        // Clear form
        clearForms();

        // Switch to login form after 2 seconds
        setTimeout(() => {
            showLoginForm();
            document.getElementById('username').value = username;
        }, 2000);

    } catch (error) {
        signupError.textContent = 'Error creating account. Please try again.';
        signupError.style.display = 'block';
    }

    // Reset button
    signupBtn.disabled = false;
    signupBtn.innerHTML = '<i class="fas fa-user-plus"></i> Create Account';
}

function validateSignupForm(fullName, username, email, password, confirmPassword) {
    const signupError = document.getElementById('signupError');
    signupError.style.display = 'none';

    // Full name validation
    if (fullName.length < 2) {
        signupError.textContent = 'Full name must be at least 2 characters long.';
        signupError.style.display = 'block';
        return false;
    }

    // Username validation
    if (username.length < 3) {
        signupError.textContent = 'Username must be at least 3 characters long.';
        signupError.style.display = 'block';
        return false;
    }

    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
        signupError.textContent = 'Username can only contain letters, numbers, and underscores.';
        signupError.style.display = 'block';
        return false;
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        signupError.textContent = 'Please enter a valid email address.';
        signupError.style.display = 'block';
        return false;
    }

    // Password validation
    if (!isPasswordValid(password)) {
        signupError.textContent = 'Password does not meet the requirements.';
        signupError.style.display = 'block';
        return false;
    }

    // Confirm password validation
    if (password !== confirmPassword) {
        signupError.textContent = 'Passwords do not match.';
        signupError.style.display = 'block';
        return false;
    }

    return true;
}

function validatePassword() {
    const password = document.getElementById('signupPassword').value;
    const confirmPassword = document.getElementById('signupConfirmPassword').value;
    const signupBtn = document.getElementById('signupBtn');

    // Check each requirement
    const requirements = {
        'req-length': password.length >= 8,
        'req-uppercase': /[A-Z]/.test(password),
        'req-lowercase': /[a-z]/.test(password),
        'req-number': /\d/.test(password),
        'req-special': /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)
    };

    // Update requirement indicators
    Object.keys(requirements).forEach(reqId => {
        const element = document.getElementById(reqId);
        if (element) {
            if (requirements[reqId]) {
                element.className = 'requirement-met';
            } else {
                element.className = 'requirement-not-met';
            }
        }
    });

    // Enable/disable signup button
    const allMet = Object.values(requirements).every(met => met);
    const passwordsMatch = password === confirmPassword;

    signupBtn.disabled = !(allMet && passwordsMatch && password.length > 0 && confirmPassword.length > 0);
}

function isPasswordValid(password) {
    return password.length >= 8 &&
        /[A-Z]/.test(password) &&
        /[a-z]/.test(password) &&
        /\d/.test(password) &&
        /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password);
}

function togglePassword() {
    const passwordInput = document.getElementById('password');
    const toggleIcon = document.querySelector('.password-toggle');

    if (passwordInput.type === 'password') {
        passwordInput.type = 'text';
        toggleIcon.classList.remove('fa-eye-slash');
        toggleIcon.classList.add('fa-eye');
    } else {
        passwordInput.type = 'password';
        toggleIcon.classList.remove('fa-eye');
        toggleIcon.classList.add('fa-eye-slash');
    }
}

function logout() {
    if (confirm('Are you sure you want to logout?')) {
        // Clear user session
        localStorage.removeItem('currentUser');
        currentUser = null;

        // Show logout notification
        showNotification('Logging out...', 'info');

        // Clear form fields
        document.getElementById('username').value = '';
        document.getElementById('password').value = '';

        setTimeout(() => {
            showLoginPage();
        }, 1000);
    }
}

// EmailJS Configuration Management
function showAddEmailJSModal() {
    editingEmailJSId = null;
    document.getElementById('emailjsModalTitle').textContent = 'Add EmailJS Configuration';
    document.getElementById('emailjsConfigName').value = '';
    document.getElementById('emailjsPublicKey').value = '';
    document.getElementById('emailjsServiceId').value = '';
    document.getElementById('emailjsTemplateId').value = '';
    document.getElementById('emailjsModal').style.display = 'flex';
}

function showEditEmailJSModal(configId) {
    const configs = loadUserData('emailjsConfigs') || [];
    const config = configs.find(c => c.id === configId);

    if (!config) return;

    editingEmailJSId = configId;
    document.getElementById('emailjsModalTitle').textContent = 'Edit EmailJS Configuration';
    document.getElementById('emailjsConfigName').value = config.name;
    document.getElementById('emailjsPublicKey').value = config.publicKey;
    document.getElementById('emailjsServiceId').value = config.serviceId;
    document.getElementById('emailjsTemplateId').value = config.templateId;
    document.getElementById('emailjsModal').style.display = 'flex';
}

function closeEmailJSModal() {
    document.getElementById('emailjsModal').style.display = 'none';
    editingEmailJSId = null;
}

function testEmailJSConfig() {
    const name = document.getElementById('emailjsConfigName').value.trim();
    const publicKey = document.getElementById('emailjsPublicKey').value.trim();
    const serviceId = document.getElementById('emailjsServiceId').value.trim();
    const templateId = document.getElementById('emailjsTemplateId').value.trim();

    if (!name || !publicKey || !serviceId || !templateId) {
        showNotification('Please fill in all fields before testing', 'error');
        return;
    }

    if (!currentUser || !currentUser.email) {
        showNotification('User email not found', 'error');
        return;
    }

    // Test the configuration
    const testParams = {
        name: currentUser.fullName || currentUser.username,
        title: 'Test Email Configuration',
        user_email: currentUser.email,
        crypto_name: 'Bitcoin',
        target_price: '50000',
        alert_date: new Date().toLocaleString(),
        alert_id: 'TEST-' + Date.now()
    };

    // Temporarily initialize EmailJS with test config
    emailjs.init(publicKey);

    emailjs.send(serviceId, templateId, testParams)
        .then(function (response) {
            showNotification('Test email sent successfully! Check your inbox.', 'success');
        })
        .catch(function (error) {
            showNotification('Test email failed: ' + error.text, 'error');
        });
}

function saveEmailJSConfig() {
    const name = document.getElementById('emailjsConfigName').value.trim();
    const publicKey = document.getElementById('emailjsPublicKey').value.trim();
    const serviceId = document.getElementById('emailjsServiceId').value.trim();
    const templateId = document.getElementById('emailjsTemplateId').value.trim();

    if (!name || !publicKey || !serviceId || !templateId) {
        showNotification('Please fill in all fields', 'error');
        return;
    }

    const configs = loadUserData('emailjsConfigs') || [];

    if (editingEmailJSId) {
        // Edit existing config
        const configIndex = configs.findIndex(c => c.id === editingEmailJSId);
        if (configIndex !== -1) {
            configs[configIndex] = {
                ...configs[configIndex],
                name: name,
                publicKey: publicKey,
                serviceId: serviceId,
                templateId: templateId,
                updatedAt: new Date().toISOString()
            };
        }
    } else {
        // Add new config
        const newConfig = {
            id: Date.now().toString(),
            name: name,
            publicKey: publicKey,
            serviceId: serviceId,
            templateId: templateId,
            isActive: configs.length === 0, // First config is active by default
            createdAt: new Date().toISOString()
        };
        configs.push(newConfig);
    }

    if (saveUserData('emailjsConfigs', configs)) {
        // Update user's emailjsConfigs in registered users
        updateUserEmailJSConfigs(configs);

        loadEmailJSConfigs();
        closeEmailJSModal();
        showNotification(editingEmailJSId ? 'Configuration updated successfully!' : 'Configuration added successfully!', 'success');
    } else {
        showNotification('Error saving configuration', 'error');
    }
}

function updateUserEmailJSConfigs(configs) {
    if (!currentUser) return;

    const users = JSON.parse(localStorage.getItem('registeredUsers') || '[]');
    const userIndex = users.findIndex(u => u.username === currentUser.username);

    if (userIndex !== -1) {
        users[userIndex].emailjsConfigs = configs;
        localStorage.setItem('registeredUsers', JSON.stringify(users));

        // Update current user object
        currentUser.emailjsConfigs = configs;
        localStorage.setItem('currentUser', JSON.stringify(currentUser));
    }
}

function loadEmailJSConfigs() {
    const configs = loadUserData('emailjsConfigs') || [];
    const container = document.getElementById('emailjsConfigList');

    if (configs.length === 0) {
        container.innerHTML = `
            <div class="no-notes" style="text-align: center; padding: 40px;">
                <i class="fas fa-envelope" style="font-size: 48px; color: #ccc; margin-bottom: 15px;"></i>
                <p>No EmailJS configurations found. Add one to enable email notifications.</p>
            </div>
        `;
        return;
    }

    let html = '';
    configs.forEach(config => {
        const statusClass = config.isActive ? 'status-active' : 'status-inactive';
        const statusText = config.isActive ? 'Active' : 'Inactive';
        const cardClass = config.isActive ? 'active' : '';

        html += `
            <div class="emailjs-config-card ${cardClass}">
                <div class="emailjs-config-header">
                    <div class="emailjs-config-name">${config.name}</div>
                    <div class="emailjs-config-status ${statusClass}">${statusText}</div>
                </div>
                <div class="emailjs-config-details">
                    Service: ${config.serviceId} | Template: ${config.templateId}
                </div>
                <div class="emailjs-config-actions">
                    ${!config.isActive ? `
                        <button class="config-btn activate" onclick="activateEmailJSConfig('${config.id}')">
                            <i class="fas fa-play"></i> Activate
                        </button>
                    ` : `
                        <button class="config-btn deactivate" onclick="deactivateEmailJSConfig('${config.id}')">
                            <i class="fas fa-pause"></i> Deactivate
                        </button>
                    `}
                    <button class="config-btn test" onclick="testEmailJSConfigById('${config.id}')">
                        <i class="fas fa-paper-plane"></i> Test
                    </button>
                    <button class="config-btn edit" onclick="showEditEmailJSModal('${config.id}')">
                        <i class="fas fa-edit"></i> Edit
                    </button>
                    <button class="config-btn delete" onclick="deleteEmailJSConfig('${config.id}')">
                        <i class="fas fa-trash"></i> Delete
                    </button>
                </div>
            </div>
        `;
    });

    container.innerHTML = html;
}

function activateEmailJSConfig(configId) {
    const configs = loadUserData('emailjsConfigs') || [];

    // Deactivate all configs
    configs.forEach(config => config.isActive = false);

    // Activate selected config
    const targetConfig = configs.find(c => c.id === configId);
    if (targetConfig) {
        targetConfig.isActive = true;

        if (saveUserData('emailjsConfigs', configs)) {
            updateUserEmailJSConfigs(configs);
            loadEmailJSConfigs();
            showNotification('Configuration activated successfully!', 'success');
        }
    }
}

function deactivateEmailJSConfig(configId) {
    const configs = loadUserData('emailjsConfigs') || [];
    const targetConfig = configs.find(c => c.id === configId);

    if (targetConfig) {
        targetConfig.isActive = false;

        if (saveUserData('emailjsConfigs', configs)) {
            updateUserEmailJSConfigs(configs);
            loadEmailJSConfigs();
            showNotification('Configuration deactivated', 'info');
        }
    }
}

function testEmailJSConfigById(configId) {
    const configs = loadUserData('emailjsConfigs') || [];
    const config = configs.find(c => c.id === configId);

    if (!config) {
        showNotification('Configuration not found', 'error');
        return;
    }

    if (!currentUser || !currentUser.email) {
        showNotification('User email not found', 'error');
        return;
    }

    const testParams = {
        name: currentUser.fullName || currentUser.username,
        title: `Test Email from ${config.name}`,
        user_email: currentUser.email,
        crypto_name: 'Bitcoin',
        target_price: '50000',
        alert_date: new Date().toLocaleString(),
        alert_id: 'TEST-' + Date.now()
    };

    // Temporarily initialize EmailJS with config
    emailjs.init(config.publicKey);

    emailjs.send(config.serviceId, config.templateId, testParams)
        .then(function (response) {
            showNotification(`Test email sent successfully from ${config.name}!`, 'success');
        })
        .catch(function (error) {
            showNotification(`Test email failed: ${error.text}`, 'error');
        });
}

function deleteEmailJSConfig(configId) {
    if (confirm('Are you sure you want to delete this EmailJS configuration?')) {
        const configs = loadUserData('emailjsConfigs') || [];
        const filteredConfigs = configs.filter(c => c.id !== configId);

        if (saveUserData('emailjsConfigs', filteredConfigs)) {
            updateUserEmailJSConfigs(filteredConfigs);
            loadEmailJSConfigs();
            showNotification('Configuration deleted successfully!', 'success');
        }
    }
}

function getActiveEmailJSConfig() {
    const configs = loadUserData('emailjsConfigs') || [];
    return configs.find(config => config.isActive);
}

// User Data Management Functions
function getUserStorageKey(key) {
    return currentUser ? `${currentUser.username}_${key}` : key;
}

function saveUserData(key, data) {
    const userKey = getUserStorageKey(key);
    return saveToLocalStorage(userKey, data);
}

function loadUserData(key) {
    const userKey = getUserStorageKey(key);
    return loadFromLocalStorage(userKey);
}

// Update existing functions to use user-specific storage
function saveToLocalStorage(key, data) {
    try {
        localStorage.setItem(key, JSON.stringify(data));
        return true;
    } catch (error) {
        console.error('Error saving to localStorage:', error);
        showNotification('Error saving data. Storage may be full.', 'error');
        return false;
    }
}

function loadFromLocalStorage(key) {
    try {
        const data = localStorage.getItem(key);
        return data ? JSON.parse(data) : null;
    } catch (error) {
        console.error('Error loading from localStorage:', error);
        return null;
    }
}

// Global variables
let currentTradeData = null;
let selectedOutcome = null;
let currentScreenshot = null;

// Currency conversion functions
function convertToINR(usdAmount) {
    return usdAmount * USD_TO_INR_RATE;
}

function formatINR(amount) {
    return `₹${amount.toFixed(2)}`;
}

function initializeApp() {
    // Load saved theme preference
    const savedTheme = loadUserData('darkMode');
    if (savedTheme === 'true') {
        document.body.classList.add('dark');
    }

    // Initialize calculator
    updateLeverage();
    calc();

    // Load and display saved data
    loadTrades();
    updatePerformanceAnalytics();
    initializeChart();

    // Set up currency converter
    convertCurrency();

    // Initialize new features
    loadPortfolio();
    loadJournalEntries();
    updateRiskMetrics();
    loadPriceAlerts();
    updateAdvancedAnalytics();
    loadEmailJSConfigs();

    // Initialize price history chart
    initializePriceHistoryChart();

    // Start alert monitoring
    startAlertMonitoring();

    // Initialize API status monitoring
    initializeAPIStatusMonitoring();

    showNotification('Trading Dashboard loaded successfully!', 'success');
}

// Enhanced API Status Monitoring
function initializeAPIStatusMonitoring() {
    // Check API status every 60 seconds
    checkAPIStatus();
    setInterval(checkAPIStatus, 60000);
}

async function checkAPIStatus() {
    const apis = [
        { name: 'binance', url: 'https://api.binance.com/api/v3/ping', elementId: 'binanceStatus' },
        { name: 'coinbase', url: 'https://api.coinbase.com/v2/time', elementId: 'coinbaseStatus' },
        { name: 'kraken', url: 'https://api.kraken.com/0/public/SystemStatus', elementId: 'krakenStatus' }
    ];

    for (const api of apis) {
        try {
            const response = await fetch(api.url, {
                method: 'GET',
                mode: 'cors',
                cache: 'no-cache'
            });

            if (response.ok) {
                apiStatus[api.name] = 'online';
                updateAPIStatusIndicator(api.elementId, 'online');
            } else {
                apiStatus[api.name] = 'offline';
                updateAPIStatusIndicator(api.elementId, 'offline');
            }
        } catch (error) {
            apiStatus[api.name] = 'offline';
            updateAPIStatusIndicator(api.elementId, 'offline');
        }
    }
}

function updateAPIStatusIndicator(elementId, status) {
    const element = document.getElementById(elementId);
    if (element) {
        element.className = `api-status-indicator ${status}`;
    }
}

// Enhanced Email Notification System
async function sendEmailNotification(alertData) {
    const activeConfig = getActiveEmailJSConfig();

    if (!activeConfig) {
        console.log('No active EmailJS configuration found');
        showNotification('No active email configuration. Please configure EmailJS in the Alerts tab.', 'warning');
        return false;
    }

    if (!currentUser || !currentUser.email) {
        console.log('No user email available for notification');
        return false;
    }

    // Fixed email template parameters
    const emailData = {
        name: currentUser.fullName || currentUser.username,
        title: `Price Alert for ${alertData.symbol} at $${alertData.targetPrice}`,
        user_email: currentUser.email,
        crypto_name: alertData.symbol,
        target_price: alertData.targetPrice,
        alert_date: new Date().toLocaleString(),
        alert_id: 'ALERT-' + Date.now()
    };

    try {
        // Initialize EmailJS with active configuration
        emailjs.init(activeConfig.publicKey);

        // Send email using active configuration
        const result = await emailjs.send(activeConfig.serviceId, activeConfig.templateId, emailData);

        console.log('Email notification sent successfully:', result);
        showNotification(`Alert email sent successfully via ${activeConfig.name}!`, 'success');

        // Show email modal with the content that was sent
        showEmailModal(emailData);

        return true;
    } catch (error) {
        console.error('Failed to send email notification:', error);
        showNotification(`Failed to send email via ${activeConfig.name}: ${error.text}`, 'error');
        return false;
    }
}

function showEmailModal(emailData) {
    const modal = document.getElementById('emailModal');
    const recipient = document.getElementById('emailRecipient');
    const subject = document.getElementById('emailSubject');
    const content = document.getElementById('emailContent');

    recipient.textContent = emailData.user_email;
    subject.textContent = emailData.title;

    // Create a simple email content preview
    content.innerHTML = `
        <div style="font-family: Arial, sans-serif; padding: 20px;">
            <h2>🚨 Price Alert Triggered!</h2>
            <p>Hi ${emailData.name},</p>
            <p>Your price alert for <strong>${emailData.crypto_name}</strong> has been triggered!</p>
            <div style="background: #f0f4ff; padding: 15px; border-radius: 8px; margin: 15px 0;">
                <strong>Alert Details:</strong><br>
                - Cryptocurrency: ${emailData.crypto_name}<br>
                - Target Price: $${emailData.target_price}<br>
                - Alert ID: ${emailData.alert_id}<br>
                - Created: ${emailData.alert_date}
            </div>
            <p>Best regards,<br>The Pro Trading Team</p>
        </div>
    `;

    modal.classList.add('show');
}

function closeEmailModal() {
    const modal = document.getElementById('emailModal');
    modal.classList.remove('show');
}

// Enhanced Alert Notification System
function showEnhancedAlertNotification(symbol, conditionText, currentPrice, note = '') {
    // Remove any existing alert notifications
    const existingAlerts = document.querySelectorAll('.alert-notification');
    existingAlerts.forEach(alert => alert.remove());

    const notification = document.createElement('div');
    notification.className = 'alert-notification';
    notification.innerHTML = `
        <i class="fas fa-bell bell-icon"></i>
        <div class="alert-notification-content">
            <div class="alert-notification-title">${symbol} Alert Triggered!</div>
            <div class="alert-notification-details">
                ${conditionText} - Current: $${currentPrice.toFixed(2)}
                ${note ? `<br><small>${note}</small>` : ''}
            </div>
        </div>
        <button class="alert-notification-close" onclick="this.parentElement.remove()">
            <i class="fas fa-times"></i>
        </button>
    `;

    document.body.appendChild(notification);

    // Auto-remove after 10 seconds
    setTimeout(() => {
        if (notification.parentElement) {
            notification.remove();
        }
    }, 10000);
}

// Enhanced Sound and Vibration System
function playEnhancedAlertSound() {
    try {
        // Try to play primary alert sound
        const primarySound = document.getElementById('alertSound');
        if (primarySound) {
            primarySound.currentTime = 0;
            primarySound.play().catch(() => {
                // If primary fails, try secondary sound
                const secondarySound = document.getElementById('secondaryAlertSound');
                if (secondarySound) {
                    secondarySound.currentTime = 0;
                    secondarySound.play().catch(() => {
                        console.log('Audio playback failed - user interaction may be required');
                    });
                }
            });
        }

        // Try to vibrate device if supported
        if ('vibrate' in navigator) {
            navigator.vibrate([200, 100, 200, 100, 200]);
        }
    } catch (error) {
        console.log('Alert sound/vibration error:', error);
    }
}

// Main Tab Navigation
function switchMainTab(tabId) {
    // Hide all main tab contents
    document.querySelectorAll('.main-tab-content').forEach(tab => {
        tab.classList.remove('active');
    });

    // Remove active class from all main tabs
    document.querySelectorAll('.main-tab').forEach(tab => {
        tab.classList.remove('active');
    });

    // Show selected main tab content
    document.getElementById(tabId).classList.add('active');

    // Set active class on clicked main tab
    event.target.classList.add('active');
}

// Calculator Functions
function updateLeverage() {
    const original = parseFloat(document.getElementById("original").value) || 0;
    const leverageX = parseFloat(document.getElementById("leverageX").value) || 0;

    if (original > 0 && leverageX > 0) {
        const leverage = original * leverageX;
        document.getElementById("leverage").value = leverage.toFixed(2);
        calc();
    }
}

function updateOriginalFromSlider() {
    const value = document.getElementById("originalSlider").value;
    document.getElementById("original").value = value;
    updateLeverage();
}

function updateLeverageFromSlider() {
    const value = document.getElementById("leverageSlider").value;
    document.getElementById("leverageX").value = value;
    updateLeverage();
}

function updateRiskFromSlider() {
    const value = document.getElementById("riskSlider").value;
    document.getElementById("risk").value = value;
    calc();
}

function setPosition(type) {
    document.getElementById("longBtn").classList.toggle("active", type === "long");
    document.getElementById("shortBtn").classList.toggle("active", type === "short");
    calc();
}

function calc() {
    const entry = parseFloat(document.getElementById("entry").value) || 0;
    const leverage = parseFloat(document.getElementById("leverage").value) || 0;
    const risk = parseFloat(document.getElementById("risk").value) || 0;
    const target = parseFloat(document.getElementById("target").value) || 0;
    const isLong = document.getElementById("longBtn").classList.contains("active");

    if (entry <= 0 || leverage <= 0 || risk <= 0) {
        document.getElementById("slValue").textContent = "$--";
        document.getElementById("slPrice").textContent = "$--";
        document.getElementById("profitValue").textContent = "$--";
        document.getElementById("profitValueInr").textContent = "₹--";
        document.getElementById("rrRatio").textContent = "--";
        document.getElementById("makerFee").textContent = "$--";
        document.getElementById("makerFeeInr").textContent = "₹--";
        document.getElementById("takerFee").textContent = "$--";
        document.getElementById("takerFeeInr").textContent = "₹--";
        return;
    }

    // Calculate trading fees based on position size
    const positionSize = leverage; // This is the leveraged position size
    const makerFeeRate = 0.02 / 100; // 0.02%
    const takerFeeRate = 0.05 / 100; // 0.05%

    const makerFeeAmount = positionSize * makerFeeRate;
    const takerFeeAmount = positionSize * takerFeeRate;

    // Display trading fees
    document.getElementById("makerFee").textContent = `$${makerFeeAmount.toFixed(4)}`;
    document.getElementById("makerFeeInr").textContent = formatINR(convertToINR(makerFeeAmount));
    document.getElementById("takerFee").textContent = `$${takerFeeAmount.toFixed(4)}`;
    document.getElementById("takerFeeInr").textContent = formatINR(convertToINR(takerFeeAmount));

    // Calculate stop loss
    const slValue = (entry * risk) / leverage;
    const slPrice = isLong ? (entry - slValue) : (entry + slValue);

    // Calculate profit and risk/reward ratio
    let profitValue = 0;
    let rrRatio = "--";

    if (target > 0) {
        const priceDiff = Math.abs(target - entry);
        profitValue = (priceDiff * leverage) / entry;

        if ((isLong && target > entry) || (!isLong && target < entry)) {
            rrRatio = (profitValue / risk).toFixed(2) + ":1";
        } else {
            profitValue = 0;
            rrRatio = "--";
        }
    }

    // Display with 10 decimal places for stop loss values
    document.getElementById("slValue").textContent = `$${slValue.toFixed(10)}`;
    document.getElementById("slPrice").textContent = `$${slPrice.toFixed(10)}`;
    document.getElementById("profitValue").textContent = `$${profitValue.toFixed(2)}`;
    document.getElementById("profitValueInr").textContent = formatINR(convertToINR(profitValue));
    document.getElementById("rrRatio").textContent = rrRatio;
}

function resetCalculator() {
    document.getElementById("assetName").value = "";
    document.getElementById("entry").value = "";
    document.getElementById("original").value = "5.88";
    document.getElementById("originalSlider").value = "5.88";
    document.getElementById("leverageX").value = "20";
    document.getElementById("leverageSlider").value = "20";
    document.getElementById("risk").value = ".592";
    document.getElementById("riskSlider").value = ".592";
    document.getElementById("target").value = "";
    document.getElementById("longBtn").classList.add("active");
    document.getElementById("shortBtn").classList.remove("active");

    updateLeverage();
    calc();
    showNotification('Calculator reset successfully!', 'info');
}

// Enhanced Multi-API Price Fetching with proper button state management
async function fetchCurrentPrice() {
    const symbolInput = document.getElementById('assetName').value.trim().toUpperCase();
    const symbol = symbolInput.replace('/', '');
    const button = document.querySelector('.symbol-input-container .btn');

    if (!symbol) {
        showNotification('Please enter a cryptocurrency symbol', 'error');
        return;
    }

    try {
        // Show loading state
        const originalContent = button.innerHTML;
        button.innerHTML = '<div class="loading"></div>';
        button.disabled = true;

        const price = await getCryptoPriceWithFallback(symbol);
        if (price) {
            document.getElementById('entry').value = price;
            document.getElementById('livePriceValue').textContent = `$${price.toFixed(2)}`;
            document.getElementById('livePriceContainer').style.display = 'flex';

            // Add to price history
            const timestamp = new Date();
            priceHistory.push({
                time: timestamp.toLocaleTimeString(),
                price: price
            });

            // Keep only the last 20 prices
            if (priceHistory.length > 20) {
                priceHistory.shift();
            }

            // Update price history chart
            updatePriceHistoryChart();

            calc();
            showNotification(`Current price of ${symbol}: $${price.toFixed(2)}`, 'success');
        } else {
            showNotification('Failed to fetch price from all APIs for ' + symbol, 'error');
        }
    } catch (error) {
        console.error('Error fetching price:', error);
        showNotification('Error fetching price. Please try again.', 'error');
    } finally {
        // Always reset button state
        button.innerHTML = '<i class="fas fa-sync"></i> Get Price';
        button.disabled = false;
    }
}

async function getCryptoPriceWithFallback(symbol) {
    const apis = [
        {
            name: 'Binance',
            url: `https://api.binance.com/api/v3/ticker/price?symbol=${symbol}`,
            parser: (data) => parseFloat(data.price)
        },
        {
            name: 'Coinbase',
            url: `https://api.coinbase.com/v2/exchange-rates?currency=${symbol.replace('USDT', '')}`,
            parser: (data) => parseFloat(data.data.rates.USD)
        },
        {
            name: 'Kraken',
            url: `https://api.kraken.com/0/public/Ticker?pair=${symbol.replace('USDT', 'USD')}`,
            parser: (data) => {
                const pair = Object.keys(data.result)[0];
                return parseFloat(data.result[pair].c[0]);
            }
        }
    ];

    for (const api of apis) {
        try {
            console.log(`Trying ${api.name} API...`);
            const response = await fetch(api.url);
            const data = await response.json();

            if (response.ok && data) {
                const price = api.parser(data);
                if (price && !isNaN(price)) {
                    console.log(`Successfully fetched price from ${api.name}: $${price}`);
                    return price;
                }
            }
        } catch (error) {
            console.log(`${api.name} API failed:`, error.message);
            continue;
        }
    }

    return null;
}

function initializePriceHistoryChart() {
    const ctx = document.getElementById('priceHistoryChart').getContext('2d');
    priceHistoryChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: [],
            datasets: [{
                label: 'Price History',
                data: [],
                borderColor: '#2962ff',
                backgroundColor: 'rgba(41, 98, 255, 0.1)',
                borderWidth: 2,
                tension: 0.4,
                fill: true,
                pointRadius: 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    mode: 'index',
                    intersect: false
                }
            },
            scales: {
                x: {
                    display: false
                },
                y: {
                    display: false
                }
            }
        }
    });
}

function updatePriceHistoryChart() {
    if (!priceHistoryChart) return;

    const labels = priceHistory.map(item => item.time);
    const data = priceHistory.map(item => item.price);

    priceHistoryChart.data.labels = labels;
    priceHistoryChart.data.datasets[0].data = data;
    priceHistoryChart.update();

    // Update price change indicator
    if (priceHistory.length > 1) {
        const currentPrice = priceHistory[priceHistory.length - 1].price;
        const previousPrice = priceHistory[priceHistory.length - 2].price;
        const change = currentPrice - previousPrice;
        const changePercent = (change / previousPrice) * 100;

        const indicator = document.getElementById('priceChangeIndicator');
        indicator.textContent = `${change >= 0 ? '+' : ''}${changePercent.toFixed(2)}%`;
        indicator.className = 'price-change-indicator ' + (change >= 0 ? 'price-up' : 'price-down');
    }
}

// Enhanced Alert Functions
function startAlertMonitoring() {
    // Clear any existing interval
    if (alertInterval) {
        clearInterval(alertInterval);
    }

    // Check alerts every 30 seconds
    alertInterval = setInterval(checkAlerts, 30000);
}

async function checkAlerts() {
    const alerts = loadUserData('priceAlerts') || [];
    const activeAlerts = alerts.filter(alert => alert.status === 'active');

    if (activeAlerts.length === 0) return;

    for (const alert of activeAlerts) {
        try {
            const currentPrice = await getCryptoPriceWithFallback(alert.symbol);
            if (currentPrice === null) continue;

            // Update current price in alert display
            updateAlertCurrentPrice(alert.id, currentPrice);

            let triggered = false;
            let conditionText = '';

            if (alert.condition === 'above' && currentPrice >= alert.targetPrice) {
                triggered = true;
                conditionText = `Price above $${alert.targetPrice}`;
            } else if (alert.condition === 'below' && currentPrice <= alert.targetPrice) {
                triggered = true;
                conditionText = `Price below $${alert.targetPrice}`;
            }

            if (triggered) {
                // Update alert status
                alert.status = 'triggered';
                alert.triggeredAt = new Date().toISOString();
                alert.triggeredPrice = currentPrice;

                // Show enhanced notification
                showEnhancedAlertNotification(alert.symbol, conditionText, currentPrice, alert.note);

                // Play enhanced alert sound
                playEnhancedAlertSound();

                // Send email notification
                await sendEmailNotification({
                    symbol: alert.symbol,
                    conditionText: conditionText,
                    targetPrice: alert.targetPrice,
                    currentPrice: currentPrice,
                    note: alert.note
                });

                // Show regular notification as well
                showNotification(`🚨 ${alert.symbol} alert triggered! ${conditionText}`, 'warning');
            }
        } catch (error) {
            console.error(`Error checking alert for ${alert.symbol}:`, error);
        }
    }

    // Save updated alerts
    saveUserData('priceAlerts', alerts);
    loadPriceAlerts(); // Refresh the display
}

function updateAlertCurrentPrice(alertId, currentPrice) {
    // This function updates the current price display in the alerts list
    const alertItems = document.querySelectorAll('.alert-item');
    alertItems.forEach(item => {
        if (item.dataset.alertId === alertId) {
            const currentPriceElement = item.querySelector('.alert-current-price');
            if (currentPriceElement) {
                currentPriceElement.innerHTML = `
                    <i class="fas fa-chart-line"></i>
                    Current: $${currentPrice.toFixed(2)}
                `;
            }
        }
    });
}

// Trade Management Functions
function saveTrade() {
    try {
        // Validate inputs
        const assetName = document.getElementById("assetName").value.trim();
        const entry = parseFloat(document.getElementById("entry").value);
        const target = parseFloat(document.getElementById("target").value) || 0;
        const slPriceText = document.getElementById("slPrice").textContent.replace('$', '');
        const slPrice = parseFloat(slPriceText);
        const position = document.getElementById("longBtn").classList.contains("active") ? "Long" : "Short";
        const leverage = parseFloat(document.getElementById("leverage").value);
        const risk = parseFloat(document.getElementById("risk").value);
        const originalAmount = parseFloat(document.getElementById("original").value);
        const leverageX = parseFloat(document.getElementById("leverageX").value);

        // Calculate fees
        const positionSize = leverage;
        const makerFee = positionSize * (0.02 / 100);
        const takerFee = positionSize * (0.05 / 100);

        // Validation
        if (!assetName) {
            showNotification("Please enter an asset/symbol name", "error");
            return;
        }
        if (!entry || entry <= 0) {
            showNotification("Please enter a valid entry price", "error");
            return;
        }
        if (!leverage || leverage <= 0) {
            showNotification("Please calculate position size first", "error");
            return;
        }
        if (!risk || risk <= 0) {
            showNotification("Please enter a valid risk amount", "error");
            return;
        }
        if (!slPrice || slPrice <= 0) {
            showNotification("Please calculate stop loss first", "error");
            return;
        }

        // Create trade data
        currentTradeData = {
            id: Date.now().toString() + Math.random().toString(36).substr(2, 5),
            date: new Date().toLocaleDateString(),
            time: new Date().toLocaleTimeString(),
            asset: assetName,
            position: position,
            entry: entry,
            target: target,
            stopLoss: slPrice,
            leverage: leverage,
            risk: risk,
            originalAmount: originalAmount,
            leverageX: leverageX,
            makerFee: makerFee,
            takerFee: takerFee,
            outcome: null,
            profit: 0,
            exitPrice: null,
            feeType: null,
            usedFee: 0
        };

        // Show outcome modal
        document.getElementById('tradeOutcomeModal').style.display = 'flex';
        selectedOutcome = null;
        selectedFeeType = 'taker'; // Reset to default

        // Reset modal state
        document.getElementById('outcomeInputs').style.display = 'none';
        document.getElementById('feeSelection').style.display = 'none';
        document.getElementById('outcomePrice').value = '';

        // Reset button states
        document.querySelectorAll('.outcome-btn').forEach(btn => {
            btn.classList.remove('selected');
        });
        document.querySelectorAll('.fee-btn').forEach(btn => {
            btn.classList.remove('selected');
        });

    } catch (error) {
        console.error("Error in saveTrade:", error);
        showNotification("Error preparing trade data. Please try again.", "error");
    }
}

function selectOutcome(outcome) {
    selectedOutcome = outcome;

    // Update button states
    document.querySelectorAll('.outcome-btn').forEach(btn => {
        btn.classList.remove('selected');
    });
    event.target.classList.add('selected');

    // Show/hide inputs based on outcome
    if (outcome === 'win' || outcome === 'loss') {
        document.getElementById('outcomeInputs').style.display = 'block';
        document.getElementById('feeSelection').style.display = 'block';
        document.getElementById('outcomeInputLabel').textContent = 'Exit Price ($)';
        document.getElementById('outcomePrice').placeholder = 'Enter exit price';

        // Select default taker fee
        selectFeeType('taker');
    } else {
        document.getElementById('outcomeInputs').style.display = 'none';
        document.getElementById('feeSelection').style.display = 'none';
    }
}

function selectFeeType(feeType) {
    selectedFeeType = feeType;

    // Update button states
    document.querySelectorAll('.fee-btn').forEach(btn => {
        btn.classList.remove('selected');
    });
    document.querySelector(`.fee-btn.${feeType}`).classList.add('selected');

    // Update fee comparison
    updateFeeComparison();
}

function updateFeeComparison() {
    if (!currentTradeData) return;

    const exitPrice = parseFloat(document.getElementById('outcomePrice').value);
    if (!exitPrice || exitPrice <= 0) {
        document.getElementById('makerProfitPreview').textContent = '$--';
        document.getElementById('takerProfitPreview').textContent = '$--';
        return;
    }

    const entry = currentTradeData.entry;
    const originalAmount = currentTradeData.originalAmount;
    const leverageX = currentTradeData.leverageX;
    const isLong = currentTradeData.position === 'Long';

    const priceDiff = isLong ? (exitPrice - entry) : (entry - exitPrice);
    const percentageChange = priceDiff / entry;
    let baseProfit = originalAmount * percentageChange * leverageX;

    // Calculate with maker fee
    const makerProfit = baseProfit - currentTradeData.makerFee;
    document.getElementById('makerProfitPreview').textContent = `$${makerProfit.toFixed(2)}`;

    // Calculate with taker fee
    const takerProfit = baseProfit - currentTradeData.takerFee;
    document.getElementById('takerProfitPreview').textContent = `$${takerProfit.toFixed(2)}`;
}

function finalizeTradeOutcome() {
    try {
        if (!selectedOutcome) {
            showNotification('Please select a trade outcome', 'error');
            return;
        }

        if (!currentTradeData) {
            showNotification('Trade data not found', 'error');
            return;
        }

        let finalProfit = 0;
        let exitPrice = null;
        let usedFee = 0;

        if (selectedOutcome === 'win' || selectedOutcome === 'loss') {
            exitPrice = parseFloat(document.getElementById('outcomePrice').value);
            if (!exitPrice || exitPrice <= 0) {
                showNotification('Please enter a valid exit price', 'error');
                return;
            }

            if (!selectedFeeType) {
                showNotification('Please select a fee type', 'error');
                return;
            }

            // Calculate profit/loss
            const entry = currentTradeData.entry;
            const originalAmount = currentTradeData.originalAmount;
            const leverageX = currentTradeData.leverageX;
            const isLong = currentTradeData.position === 'Long';

            const priceDiff = isLong ? (exitPrice - entry) : (entry - exitPrice);
            const percentageChange = priceDiff / entry;
            finalProfit = originalAmount * percentageChange * leverageX;

            // Subtract selected fee
            usedFee = selectedFeeType === 'maker' ? currentTradeData.makerFee : currentTradeData.takerFee;
            finalProfit -= usedFee;

            // Ensure correct sign for losses
            if (selectedOutcome === 'loss' && finalProfit > 0) {
                finalProfit = -Math.abs(finalProfit);
            }
            // Ensure correct sign for wins
            if (selectedOutcome === 'win' && finalProfit < 0) {
                finalProfit = Math.abs(finalProfit);
            }
        }

        // Update trade data
        currentTradeData.outcome = selectedOutcome;
        currentTradeData.profit = finalProfit;
        currentTradeData.exitPrice = exitPrice;
        currentTradeData.feeType = selectedFeeType;
        currentTradeData.usedFee = usedFee;

        // Save to localStorage
        const trades = loadUserData('trades') || [];
        trades.push(currentTradeData);

        if (saveUserData('trades', trades)) {
            // Update total P/L if trade is completed
            if (selectedOutcome !== 'pending') {
                updateTotalPL(finalProfit);
            }

            // Update display
            loadTrades();
            updatePerformanceAnalytics();
            updateAdvancedAnalytics();
            closeTradeOutcomeModal();

            showNotification("Trade saved successfully!", "success");
        } else {
            showNotification("Error saving trade. Please try again.", "error");
        }

    } catch (error) {
        console.error("Error in finalizeTradeOutcome:", error);
        showNotification("Error saving trade. Please try again.", "error");
    }
}

function closeTradeOutcomeModal() {
    document.getElementById('tradeOutcomeModal').style.display = 'none';
    currentTradeData = null;
    selectedOutcome = null;
    selectedFeeType = 'taker';
}

// History Management Functions
function loadTrades() {
    const trades = loadUserData('trades') || [];
    renderHistory(trades);
}

function renderHistory(trades = null) {
    try {
        if (!trades) {
            trades = loadUserData('trades') || [];
        }

        const filter = document.getElementById("historyFilter").value;
        const tableBody = document.getElementById("historyTableBody");

        // Clear table
        tableBody.innerHTML = "";

        // Filter trades
        let filteredTrades = trades;
        if (filter !== "all") {
            filteredTrades = trades.filter(trade =>
                trade.position.toLowerCase() === filter
            );
        }

        // Sort by date (newest first)
        filteredTrades.sort((a, b) => new Date(b.date) - new Date(a.date));

        // Render trades
        if (filteredTrades.length === 0) {
            tableBody.innerHTML = `<tr><td colspan="12" style="text-align: center; padding: 20px;">No trades recorded yet</td></tr>`;
            return;
        }

        filteredTrades.forEach(trade => {
            const row = document.createElement("tr");

            // Format outcome
            let outcomeHtml = '';
            let profitHtml = '';
            let profitInrHtml = '';

            if (trade.outcome === 'win') {
                outcomeHtml = '<span class="outcome-icon outcome-win"><i class="fas fa-check"></i></span> Win';
                profitHtml = `<span class="profit">+$${Math.abs(trade.profit).toFixed(2)}</span>`;
                profitInrHtml = `<span class="profit">${formatINR(convertToINR(Math.abs(trade.profit)))}</span>`;
            } else if (trade.outcome === 'loss') {
                outcomeHtml = '<span class="outcome-icon outcome-loss"><i class="fas fa-times"></i></span> Loss';
                profitHtml = `<span class="loss">-$${Math.abs(trade.profit).toFixed(2)}</span>`;
                profitInrHtml = `<span class="loss">-${formatINR(convertToINR(Math.abs(trade.profit)))}</span>`;
            } else {
                outcomeHtml = '<span class="outcome-icon outcome-pending"><i class="fas fa-clock"></i></span> Pending';
                profitHtml = `<button class="mark-outcome-btn" onclick="updateTradeOutcome('${trade.id}')">Mark</button>`;
                profitInrHtml = '--';
            }

            // Format fee type
            let feeTypeHtml = '--';
            if (trade.feeType) {
                const feeColor = trade.feeType === 'maker' ? '#2196f3' : '#ff6d00';
                feeTypeHtml = `<span style="color: ${feeColor}; font-weight: 600;">${trade.feeType.charAt(0).toUpperCase() + trade.feeType.slice(1)}</span>`;
            }

            row.innerHTML = `
                <td>${trade.date}</td>
                <td>${trade.time || '--'}</td>
                <td>${trade.asset}</td>
                <td>${trade.position}</td>
                <td>$${trade.entry.toFixed(10)}</td>
                <td>${trade.target > 0 ? '$' + trade.target.toFixed(10) : '--'}</td>
                <td>$${trade.stopLoss.toFixed(10)}</td>
                <td>${feeTypeHtml}</td>
                <td>${outcomeHtml}</td>
                <td>${profitHtml}</td>
                <td>${profitInrHtml}</td>
                <td class="action-buttons">
                    <button class="delete-btn" onclick="deleteTrade('${trade.id}')">
                        <i class="fas fa-trash"></i> Delete
                    </button>
                </td>
            `;

            tableBody.appendChild(row);
        });

    } catch (error) {
        console.error("Error in renderHistory:", error);
        showNotification("Error loading trade history", "error");
    }
}

// Function to delete a trade
function deleteTrade(tradeId) {
    if (confirm("Are you sure you want to delete this trade?")) {
        try {
            const trades = loadUserData('trades') || [];
            const tradeIndex = trades.findIndex(t => t.id === tradeId);

            if (tradeIndex !== -1) {
                // Remove trade and update P/L if trade was completed
                const trade = trades[tradeIndex];
                if (trade.outcome !== 'pending') {
                    updateTotalPL(-trade.profit);
                }

                trades.splice(tradeIndex, 1);

                if (saveUserData('trades', trades)) {
                    loadTrades();
                    updatePerformanceAnalytics();
                    updateAdvancedAnalytics();
                    showNotification("Trade deleted successfully!", "success");
                } else {
                    showNotification("Error deleting trade. Please try again.", "error");
                }
            }
        } catch (error) {
            console.error("Error deleting trade:", error);
            showNotification("Error deleting trade", "error");
        }
    }
}

function filterHistory() {
    loadTrades();
    showNotification('History filtered successfully', 'info');
}

function clearHistory() {
    if (confirm("Are you sure you want to clear all trade history? This action cannot be undone.")) {
        const userKey = getUserStorageKey('trades');
        localStorage.removeItem(userKey);
        const plKey = getUserStorageKey('totalPL');
        localStorage.removeItem(plKey);
        const plHistoryKey = getUserStorageKey('plHistory');
        localStorage.removeItem(plHistoryKey);

        loadTrades();
        updatePerformanceAnalytics();
        updateAdvancedAnalytics();
        showNotification("Trade history cleared successfully", "warning");
    }
}

function exportHistory() {
    try {
        const trades = loadUserData('trades') || [];

        if (trades.length === 0) {
            showNotification("No trades to export", "error");
            return;
        }

        // Create CSV content
        let csv = "Date,Time,Asset,Position,Entry,Target,Stop Loss,Fee Type,Used Fee,Outcome,Profit/Loss USD,Profit/Loss INR\n";

        trades.forEach(trade => {
            const outcome = trade.outcome === 'win' ? 'Win' :
                trade.outcome === 'loss' ? 'Loss' : 'Pending';
            const profit = trade.outcome === 'pending' ? '0' : trade.profit.toFixed(2);
            const profitINR = trade.outcome === 'pending' ? '0' : convertToINR(trade.profit).toFixed(2);
            const feeType = trade.feeType || 'N/A';
            const usedFee = trade.usedFee ? trade.usedFee.toFixed(4) : '0';

            csv += `${trade.date},${trade.time || '--'},${trade.asset},${trade.position},$${trade.entry.toFixed(10)},${trade.target > 0 ? '$' + trade.target.toFixed(10) : '--'},$${trade.stopLoss.toFixed(10)},${feeType},$${usedFee},${outcome},$${profit},₹${profitINR}\n`;
        });

        // Download CSV
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `trading_history_${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);

        showNotification("History exported successfully!", "success");

    } catch (error) {
        console.error("Error exporting history:", error);
        showNotification("Error exporting history", "error");
    }
}

// Portfolio Tracker Functions
function addAssetToPortfolio() {
    const symbol = document.getElementById('portfolioAsset').value.trim().toUpperCase();
    const quantity = parseFloat(document.getElementById('portfolioQuantity').value);
    const price = parseFloat(document.getElementById('portfolioPrice').value);

    if (!symbol || !quantity || !price || quantity <= 0 || price <= 0) {
        showNotification('Please fill all fields with valid values', 'error');
        return;
    }

    const portfolio = loadUserData('portfolio') || [];

    // Check if asset already exists
    const existingAsset = portfolio.find(asset => asset.symbol === symbol);
    if (existingAsset) {
        // Update existing asset (average price calculation)
        const totalValue = (existingAsset.quantity * existingAsset.avgPrice) + (quantity * price);
        const totalQuantity = existingAsset.quantity + quantity;
        existingAsset.avgPrice = totalValue / totalQuantity;
        existingAsset.quantity = totalQuantity;
    } else {
        // Add new asset
        portfolio.push({
            id: Date.now().toString(),
            symbol: symbol,
            quantity: quantity,
            avgPrice: price,
            currentPrice: price, // In real app, this would be fetched from API
            addedDate: new Date().toISOString()
        });
    }

    if (saveUserData('portfolio', portfolio)) {
        // Clear inputs
        document.getElementById('portfolioAsset').value = '';
        document.getElementById('portfolioQuantity').value = '';
        document.getElementById('portfolioPrice').value = '';

        loadPortfolio();
        showNotification('Asset added to portfolio successfully!', 'success');
    } else {
        showNotification('Error adding asset to portfolio', 'error');
    }
}

function loadPortfolio() {
    const portfolio = loadUserData('portfolio') || [];
    const assetList = document.getElementById('assetList');

    if (portfolio.length === 0) {
        assetList.innerHTML = `
            <div class="no-notes" style="text-align: center; padding: 40px;">
                <i class="fas fa-briefcase" style="font-size: 48px; color: #ccc; margin-bottom: 15px;"></i>
                <p>No assets in portfolio yet. Add your first asset!</p>
            </div>
        `;
        updatePortfolioSummary(0, 0);
        return;
    }

    let totalValue = 0;
    let totalChange = 0;
    let html = '';

    portfolio.forEach(asset => {
        // Simulate price changes (in real app, fetch from API)
        const priceChange = (Math.random() - 0.5) * 0.1; // ±5% random change
        asset.currentPrice = asset.avgPrice * (1 + priceChange);

        const value = asset.quantity * asset.currentPrice;
        const change = value - (asset.quantity * asset.avgPrice);
        const changePercent = (change / (asset.quantity * asset.avgPrice)) * 100;

        totalValue += value;
        totalChange += change;

        const changeClass = change >= 0 ? 'positive' : 'negative';
        const changeSign = change >= 0 ? '+' : '';

        html += `
            <div class="asset-item">
                <div class="asset-info">
                    <div class="asset-icon">${asset.symbol.substring(0, 2)}</div>
                    <div class="asset-details">
                        <h4>${asset.symbol}</h4>
                        <p>${asset.quantity.toFixed(4)} @ $${asset.avgPrice.toFixed(2)}</p>
                    </div>
                </div>
                <div class="asset-values">
                    <div class="asset-value">$${value.toFixed(2)}</div>
                    <div class="asset-change ${changeClass}">
                        ${changeSign}$${Math.abs(change).toFixed(2)} (${changeSign}${changePercent.toFixed(2)}%)
                    </div>
                </div>
                <button class="delete-btn" onclick="removeAssetFromPortfolio('${asset.id}')" style="margin-left: 15px;">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        `;
    });

    assetList.innerHTML = html;
    updatePortfolioSummary(totalValue, totalChange);

    // Save updated portfolio with current prices
    saveUserData('portfolio', portfolio);
}

function updatePortfolioSummary(totalValue, totalChange) {
    const portfolioValue = document.getElementById('portfolioValue');
    const portfolioChange = document.getElementById('portfolioChange');

    portfolioValue.textContent = `$${totalValue.toFixed(2)}`;

    const changePercent = totalValue > 0 ? (totalChange / (totalValue - totalChange)) * 100 : 0;
    const changeSign = totalChange >= 0 ? '+' : '';
    const changeClass = totalChange >= 0 ? 'positive' : 'negative';

    portfolioChange.textContent = `${changeSign}$${Math.abs(totalChange).toFixed(2)} (${changeSign}${changePercent.toFixed(2)}%)`;
    portfolioChange.className = `portfolio-change ${changeClass}`;
}

function removeAssetFromPortfolio(assetId) {
    if (confirm('Are you sure you want to remove this asset from your portfolio?')) {
        const portfolio = loadUserData('portfolio') || [];
        const filteredPortfolio = portfolio.filter(asset => asset.id !== assetId);

        if (saveUserData('portfolio', filteredPortfolio)) {
            loadPortfolio();
            showNotification('Asset removed from portfolio', 'success');
        } else {
            showNotification('Error removing asset', 'error');
        }
    }
}

// Trade Journal Functions
function handleScreenshotUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    // Validate file type
    const validTypes = ['image/jpeg', 'image/png', 'image/gif'];
    if (!validTypes.includes(file.type)) {
        showNotification('Please select a valid image file (JPEG, PNG, GIF)', 'error');
        return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
        showNotification('File size exceeds 5MB limit', 'error');
        return;
    }

    const reader = new FileReader();
    reader.onload = function (e) {
        currentScreenshot = e.target.result;
        document.getElementById('screenshotImage').src = currentScreenshot;
        document.getElementById('screenshotPreview').style.display = 'block';
    };
    reader.readAsDataURL(file);
}

function saveJournalEntry() {
    const symbol = document.getElementById('journalSymbol').value.trim();
    const analysis = document.getElementById('journalAnalysis').value.trim();

    if (!symbol || !analysis) {
        showNotification('Please fill in symbol and analysis fields', 'error');
        return;
    }

    const entry = {
        id: Date.now().toString(),
        symbol: symbol.toUpperCase(),
        analysis: analysis,
        screenshot: currentScreenshot,
        date: new Date().toLocaleDateString(),
        time: new Date().toLocaleTimeString(),
        timestamp: new Date().getTime()
    };

    const journal = loadUserData('tradeJournal') || [];
    journal.unshift(entry);

    if (saveUserData('tradeJournal', journal)) {
        // Clear form
        document.getElementById('journalSymbol').value = '';
        document.getElementById('journalAnalysis').value = '';
        document.getElementById('screenshotPreview').style.display = 'none';
        document.getElementById('screenshotUpload').value = '';
        currentScreenshot = null;

        loadJournalEntries();
        showNotification('Journal entry saved successfully!', 'success');
    } else {
        showNotification('Error saving journal entry', 'error');
    }
}

function loadJournalEntries() {
    const journal = loadUserData('tradeJournal') || [];
    const container = document.getElementById('journalEntries');

    if (journal.length === 0) {
        container.innerHTML = `
            <div class="no-notes" style="text-align: center; padding: 40px;">
                <i class="fas fa-book" style="font-size: 48px; color: #ccc; margin-bottom: 15px;"></i>
                <p>No journal entries yet. Add your first trade analysis!</p>
            </div>
        `;
        return;
    }

    let html = '';
    journal.forEach(entry => {
        html += `
            <div class="journal-entry">
                <div class="journal-header">
                    <div>
                        <h3>${entry.symbol}</h3>
                        <div class="journal-meta">
                            <span><i class="fas fa-calendar"></i> ${entry.date}</span>
                            <span><i class="fas fa-clock"></i> ${entry.time}</span>
                        </div>
                    </div>
                    <button class="delete-btn" onclick="deleteJournalEntry('${entry.id}')">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
                
                ${entry.screenshot ? `
                    <div class="screenshot-container">
                        <img src="${entry.screenshot}" class="screenshot-preview" onclick="openImageModal('${entry.screenshot}')" alt="Trade Screenshot">
                    </div>
                ` : ''}
                
                <div class="note-content">${entry.analysis}</div>
            </div>
        `;
    });

    container.innerHTML = html;
}

function exportJournalToWord() {
    try {
        const journal = loadUserData('tradeJournal') || [];

        if (journal.length === 0) {
            showNotification('No journal entries to export', 'error');
            return;
        }

        // Create a simple Word document content
        let wordContent = `
            <html>
                <head>
                    <meta charset="utf-8">
                    <title>Trade Journal Export</title>
                    <style>
                        body { font-family: Arial, sans-serif; margin: 40px; }
                        h1 { color: #2962ff; text-align: center; border-bottom: 2px solid #2962ff; padding-bottom: 10px; }
                        .entry { margin-bottom: 30px; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px; }
                        .entry-header { background: #f8f9fa; padding: 10px; margin: -20px -20px 15px -20px; border-radius: 10px 10px 0 0; }
                        .symbol { font-size: 18px; font-weight: bold; color: #2962ff; }
                        .date-time { font-size: 12px; color: #666; margin-top: 5px; }
                        .analysis { line-height: 1.6; margin-top: 15px; }
                        .screenshot-note { color: #888; font-style: italic; margin-top: 10px; }
                    </style>
                </head>
                <body>
                    <h1>Trading Journal Export</h1>
                    <p style="text-align: center; color: #666;">Export Date: ${new Date().toLocaleDateString()}</p>
        `;

        journal.forEach((entry, index) => {
            wordContent += `
                <div class="entry">
                    <div class="entry-header">
                        <div class="symbol">${entry.symbol}</div>
                        <div class="date-time">${entry.date} at ${entry.time}</div>
                    </div>
                    <div class="analysis">${entry.analysis.replace(/\n/g, '<br>')}</div>
                    ${entry.screenshot ? '<div class="screenshot-note">📷 Chart screenshot attached to original entry</div>' : ''}
                </div>
            `;
        });

        wordContent += `
                </body>
            </html>
        `;

        // Create and download the file
        const blob = new Blob([wordContent], { type: 'application/msword' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `trade_journal_${new Date().toISOString().split('T')[0]}.doc`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);

        showNotification('Journal exported to Word document successfully!', 'success');

    } catch (error) {
        console.error('Error exporting journal to Word:', error);
        showNotification('Error exporting journal. Please try again.', 'error');
    }
}

function deleteJournalEntry(entryId) {
    if (confirm('Are you sure you want to delete this journal entry?')) {
        const journal = loadUserData('tradeJournal') || [];
        const filteredJournal = journal.filter(entry => entry.id !== entryId);

        if (saveUserData('tradeJournal', filteredJournal)) {
            loadJournalEntries();
            showNotification('Journal entry deleted successfully!', 'success');
        } else {
            showNotification('Error deleting journal entry', 'error');
        }
    }
}

function openImageModal(imageSrc) {
    // Create modal for full-size image viewing
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.style.display = 'flex';
    modal.innerHTML = `
        <div class="modal-content" style="max-width: 90%; max-height: 90%; padding: 20px;">
            <div class="modal-header">
                <h3 class="modal-title">Chart Screenshot</h3>
                <button class="close-modal" onclick="this.closest('.modal').remove()">&times;</button>
            </div>
            <div style="text-align: center;">
                <img src="${imageSrc}" style="max-width: 100%; max-height: 70vh; border-radius: 10px;">
            </div>
        </div>
    `;
    document.body.appendChild(modal);
}

// Risk Management Functions
function updateRiskMetrics() {
    const accountBalance = parseFloat(document.getElementById('riskAccountBalance').value) || 0;
    const riskPerTradePercent = parseFloat(document.getElementById('riskPerTradePercent').value) || 0;
    const dailyRiskPercent = parseFloat(document.getElementById('dailyRiskPercent').value) || 0;
    const maxDrawdownLimit = parseFloat(document.getElementById('maxDrawdownLimit').value) || 0;

    // Update display values
    document.getElementById('accountBalance').textContent = `$${accountBalance.toFixed(2)}`;
    document.getElementById('riskPerTrade').textContent = `${riskPerTradePercent}%`;
    document.getElementById('dailyRisk').textContent = `$${(accountBalance * dailyRiskPercent / 100).toFixed(2)}`;

    // Calculate current drawdown from trades
    const trades = loadUserData('trades') || [];
    const completedTrades = trades.filter(trade => trade.outcome && trade.outcome !== 'pending');
    let currentDrawdown = 0;
    let peak = accountBalance;
    let runningBalance = accountBalance;

    completedTrades.forEach(trade => {
        runningBalance += trade.profit;
        if (runningBalance > peak) {
            peak = runningBalance;
        }
        const drawdown = ((peak - runningBalance) / peak) * 100;
        if (drawdown > currentDrawdown) {
            currentDrawdown = drawdown;
        }
    });

    document.getElementById('maxDrawdown').textContent = `-${currentDrawdown.toFixed(1)}%`;

    // Update risk alert
    const riskAlert = document.getElementById('riskAlert');
    if (currentDrawdown > maxDrawdownLimit || riskPerTradePercent > 5) {
        riskAlert.className = 'risk-warning';
        riskAlert.innerHTML = '<i class="fas fa-exclamation-triangle"></i> Risk levels are above recommended limits!';
    } else {
        riskAlert.className = 'risk-safe';
        riskAlert.innerHTML = '<i class="fas fa-check-circle"></i> Risk levels are within safe limits';
    }

    // Save risk settings
    const riskSettings = {
        accountBalance,
        riskPerTradePercent,
        dailyRiskPercent,
        maxDrawdownLimit
    };
    saveUserData('riskSettings', riskSettings);

    // Update position size calculation
    calculatePositionSize();
}

function calculatePositionSize() {
    const entryPrice = parseFloat(document.getElementById('riskEntryPrice').value);
    const stopPrice = parseFloat(document.getElementById('riskStopPrice').value);
    const accountBalance = parseFloat(document.getElementById('riskAccountBalance').value) || 0;
    const riskPerTradePercent = parseFloat(document.getElementById('riskPerTradePercent').value) || 0;

    if (!entryPrice || !stopPrice || entryPrice === stopPrice) {
        document.getElementById('recommendedPosition').textContent = '$--';
        document.getElementById('riskAmount').textContent = '$--';
        return;
    }

    const riskAmount = accountBalance * (riskPerTradePercent / 100);
    const priceRisk = Math.abs(entryPrice - stopPrice);
    const positionSize = riskAmount / (priceRisk / entryPrice);

    document.getElementById('recommendedPosition').textContent = `$${positionSize.toFixed(2)}`;
    document.getElementById('riskAmount').textContent = `$${riskAmount.toFixed(2)}`;
}

// Enhanced Price Alerts Functions
function createPriceAlert() {
    const symbol = document.getElementById('alertSymbol').value.trim().toUpperCase();
    const condition = document.getElementById('alertCondition').value;
    const price = parseFloat(document.getElementById('alertPrice').value);
    const note = document.getElementById('alertNote').value.trim();

    if (!symbol || !price || price <= 0) {
        showNotification('Please fill in symbol and price fields', 'error');
        return;
    }

    const alert = {
        id: Date.now().toString(),
        symbol: symbol,
        condition: condition,
        targetPrice: price,
        note: note,
        status: 'active',
        createdDate: new Date().toLocaleDateString(),
        createdTime: new Date().toLocaleTimeString(),
        currentPrice: null
    };

    const alerts = loadUserData('priceAlerts') || [];
    alerts.unshift(alert);

    if (saveUserData('priceAlerts', alerts)) {
        // Clear form
        document.getElementById('alertSymbol').value = '';
        document.getElementById('alertPrice').value = '';
        document.getElementById('alertNote').value = '';

        loadPriceAlerts();
        showNotification('Price alert created successfully!', 'success');
    } else {
        showNotification('Error creating price alert', 'error');
    }
}

function loadPriceAlerts() {
    const alerts = loadUserData('priceAlerts') || [];
    const container = document.getElementById('alertsList');

    if (alerts.length === 0) {
        container.innerHTML = `
            <div class="no-notes" style="text-align: center; padding: 40px;">
                <i class="fas fa-bell" style="font-size: 48px; color: #ccc; margin-bottom: 15px;"></i>
                <p>No price alerts set. Create your first alert!</p>
            </div>
        `;
        return;
    }

    let html = '';
    alerts.forEach(alert => {
        const conditionText = alert.condition === 'above' ? 'Above' :
            alert.condition === 'below' ? 'Below' : '% Change';
        const priceText = alert.condition === 'change' ? `${alert.targetPrice}%` : `$${alert.targetPrice}`;
        const statusClass = alert.status === 'triggered' ? 'triggered' : 'active';

        html += `
            <div class="alert-item ${statusClass}" data-alert-id="${alert.id}">
                <div class="alert-info">
                    <div class="alert-symbol">${alert.symbol}</div>
                    <div class="alert-condition">${conditionText} ${priceText}</div>
                    <div class="alert-current-price">
                        <i class="fas fa-chart-line"></i>
                        Current: ${alert.currentPrice ? '$' + alert.currentPrice.toFixed(2) : 'Loading...'}
                    </div>
                    ${alert.note ? `<div style="font-size: 12px; color: #888; margin-top: 5px;">${alert.note}</div>` : ''}
                </div>
                <div class="alert-price">$${alert.targetPrice}</div>
                <div class="alert-status alert-${alert.status}">${alert.status}</div>
                <div class="alert-actions">
                    <button class="delete-btn" onclick="deletePriceAlert('${alert.id}')">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        `;
    });

    container.innerHTML = html;
}

function deletePriceAlert(alertId) {
    if (confirm('Are you sure you want to delete this price alert?')) {
        const alerts = loadUserData('priceAlerts') || [];
        const filteredAlerts = alerts.filter(alert => alert.id !== alertId);

        if (saveUserData('priceAlerts', filteredAlerts)) {
            loadPriceAlerts();
            showNotification('Price alert deleted successfully!', 'success');
        } else {
            showNotification('Error deleting price alert', 'error');
        }
    }
}

function clearAllAlerts() {
    if (confirm('Are you sure you want to clear all price alerts?')) {
        const userKey = getUserStorageKey('priceAlerts');
        localStorage.removeItem(userKey);
        loadPriceAlerts();
        showNotification('All price alerts cleared', 'warning');
    }
}

// Advanced Analytics Functions
function updateAdvancedAnalytics() {
    const trades = loadUserData('trades') || [];
    const completedTrades = trades.filter(trade => trade.outcome && trade.outcome !== 'pending');

    if (completedTrades.length === 0) {
        document.getElementById('sharpeRatio').textContent = '0.00';
        document.getElementById('maxWinStreak').textContent = '0';
        document.getElementById('maxLossStreak').textContent = '0';
        document.getElementById('bestAsset').textContent = '--';
        document.getElementById('bestAssetProfit').textContent = '$0.00';
        return;
    }

    // Calculate Sharpe Ratio (simplified)
    const returns = completedTrades.map(trade => trade.profit);
    const avgReturn = returns.reduce((sum, ret) => sum + ret, 0) / returns.length;
    const variance = returns.reduce((sum, ret) => sum + Math.pow(ret - avgReturn, 2), 0) / returns.length;
    const stdDev = Math.sqrt(variance);
    const sharpeRatio = stdDev > 0 ? (avgReturn / stdDev) : 0;

    document.getElementById('sharpeRatio').textContent = sharpeRatio.toFixed(2);

    // Calculate win/loss streaks
    let currentWinStreak = 0;
    let currentLossStreak = 0;
    let maxWinStreak = 0;
    let maxLossStreak = 0;

    completedTrades.forEach(trade => {
        if (trade.profit > 0) {
            currentWinStreak++;
            currentLossStreak = 0;
            maxWinStreak = Math.max(maxWinStreak, currentWinStreak);
        } else {
            currentLossStreak++;
            currentWinStreak = 0;
            maxLossStreak = Math.max(maxLossStreak, currentLossStreak);
        }
    });

    document.getElementById('maxWinStreak').textContent = maxWinStreak;
    document.getElementById('maxLossStreak').textContent = maxLossStreak;

    // Find best performing asset
    const assetPerformance = {};
    completedTrades.forEach(trade => {
        if (!assetPerformance[trade.asset]) {
            assetPerformance[trade.asset] = 0;
        }
        assetPerformance[trade.asset] += trade.profit;
    });

    let bestAsset = '--';
    let bestProfit = 0;
    Object.entries(assetPerformance).forEach(([asset, profit]) => {
        if (profit > bestProfit) {
            bestAsset = asset;
            bestProfit = profit;
        }
    });

    document.getElementById('bestAsset').textContent = bestAsset;
    document.getElementById('bestAssetProfit').textContent = `$${bestProfit.toFixed(2)}`;
}

// Performance Analytics Functions
function updateTotalPL(profit) {
    const userKey = getUserStorageKey('totalPL');
    const currentTotal = parseFloat(localStorage.getItem(userKey)) || 0;
    const newTotal = currentTotal + profit;
    localStorage.setItem(userKey, newTotal.toString());

    // Update P/L history for chart
    const plHistory = loadUserData('plHistory') || [];
    plHistory.push({
        date: new Date().toLocaleDateString(),
        profit: profit,
        total: newTotal
    });
    saveUserData('plHistory', plHistory);

    // Update display
    displayTotalPL();
    updateChart();
}

function displayTotalPL() {
    const userKey = getUserStorageKey('totalPL');
    const totalPL = parseFloat(localStorage.getItem(userKey)) || 0;
    const totalPLElement = document.getElementById('totalPL');
    const totalPLInrElement = document.getElementById('totalPLInr');

    totalPLElement.textContent = `$${totalPL.toFixed(2)}`;
    totalPLInrElement.textContent = formatINR(convertToINR(totalPL));

    totalPLElement.className = 'total-pl-value';

    if (totalPL > 0) {
        totalPLElement.classList.add('positive');
    } else if (totalPL < 0) {
        totalPLElement.classList.add('negative');
    }
}

function updatePerformanceAnalytics() {
    try {
        // Load custom performance data if exists
        const customPerformance = loadUserData('customPerformance');

        if (customPerformance) {
            // Use custom data
            document.getElementById('winRate').value = `${customPerformance.winRate}%`;
            document.getElementById('avgProfit').value = `$${customPerformance.avgProfit}`;
            document.getElementById('avgLoss').value = `$${customPerformance.avgLoss}`;
            document.getElementById('totalTrades').value = customPerformance.totalWins + customPerformance.totalLosses;
            document.getElementById('totalWins').textContent = customPerformance.totalWins;
            document.getElementById('totalLosses').textContent = customPerformance.totalLosses;
        } else {
            // Calculate from actual trades
            const trades = loadUserData('trades') || [];
            const completedTrades = trades.filter(trade => trade.outcome && trade.outcome !== 'pending');

            if (completedTrades.length === 0) {
                document.getElementById('winRate').value = '0%';
                document.getElementById('avgProfit').value = '$0.00';
                document.getElementById('avgLoss').value = '$0.00';
                document.getElementById('totalTrades').value = '0';
                document.getElementById('totalWins').textContent = '0';
                document.getElementById('totalLosses').textContent = '0';
                return;
            }

            const winningTrades = completedTrades.filter(trade => trade.profit > 0);
            const losingTrades = completedTrades.filter(trade => trade.profit < 0);

            const winRate = ((winningTrades.length / completedTrades.length) * 100).toFixed(1);
            const avgProfit = winningTrades.length > 0 ?
                (winningTrades.reduce((sum, trade) => sum + trade.profit, 0) / winningTrades.length).toFixed(2) : '0.00';
            const avgLoss = losingTrades.length > 0 ?
                Math.abs(losingTrades.reduce((sum, trade) => sum + trade.profit, 0) / losingTrades.length).toFixed(2) : '0.00';

            // Update display
            document.getElementById('winRate').value = `${winRate}%`;
            document.getElementById('avgProfit').value = `$${avgProfit}`;
            document.getElementById('avgLoss').value = `$${avgLoss}`;
            document.getElementById('totalTrades').value = completedTrades.length;
            document.getElementById('totalWins').textContent = winningTrades.length;
            document.getElementById('totalLosses').textContent = losingTrades.length;
        }

        // Update chart
        updateChart();

        // Update total P/L display
        displayTotalPL();

    } catch (error) {
        console.error("Error updating performance analytics:", error);
    }
}

function initializeChart() {
    try {
        const ctx = document.getElementById('plChart').getContext('2d');
        window.plChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: ['Start'],
                datasets: [{
                    label: 'Cumulative P/L',
                    data: [0],
                    borderColor: '#2962ff',
                    backgroundColor: 'rgba(41, 98, 255, 0.1)',
                    borderWidth: 3,
                    fill: true,
                    tension: 0.4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            callback: function (value) {
                                return '$' + value.toFixed(2);
                            }
                        }
                    }
                },
                plugins: {
                    legend: {
                        display: false
                    }
                }
            }
        });
    } catch (error) {
        console.error("Error initializing chart:", error);
    }
}

function updateChart() {
    if (!window.plChart || !window.plChart.data || !window.plChart.data.datasets) return;

    try {
        const plHistory = loadUserData('plHistory') || [];

        if (plHistory.length === 0) {
            window.plChart.data.labels = ['Start'];
            window.plChart.data.datasets[0].data = [0];
            window.plChart.update();
            return;
        }

        const labels = ['Start'];
        const data = [0];
        let cumulative = 0;

        plHistory.forEach((entry, index) => {
            cumulative += entry.profit;
            labels.push(`Trade ${index + 1}`);
            data.push(cumulative);
        });

        window.plChart.data.labels = labels;
        window.plChart.data.datasets[0].data = data;
        window.plChart.update();

    } catch (error) {
        console.error("Error updating chart:", error);
    }
}

// Edit Performance Functions
function openEditModal() {
    // Load current values
    const customPerformance = loadUserData('customPerformance');

    if (customPerformance) {
        document.getElementById('editWinRate').value = customPerformance.winRate;
        document.getElementById('editAvgProfit').value = customPerformance.avgProfit;
        document.getElementById('editAvgLoss').value = customPerformance.avgLoss;
        document.getElementById('editTotalWins').value = customPerformance.totalWins;
        document.getElementById('editTotalLosses').value = customPerformance.totalLosses;
    } else {
        // Use current displayed values
        const winRate = parseFloat(document.getElementById('winRate').value.replace('%', '')) || 0;
        const avgProfit = parseFloat(document.getElementById('avgProfit').value.replace('$', '')) || 0;
        const avgLoss = parseFloat(document.getElementById('avgLoss').value.replace('$', '')) || 0;
        const totalWins = parseInt(document.getElementById('totalWins').textContent) || 0;
        const totalLosses = parseInt(document.getElementById('totalLosses').textContent) || 0;

        document.getElementById('editWinRate').value = winRate;
        document.getElementById('editAvgProfit').value = avgProfit;
        document.getElementById('editAvgLoss').value = avgLoss;
        document.getElementById('editTotalWins').value = totalWins;
        document.getElementById('editTotalLosses').value = totalLosses;
    }

    document.getElementById('editPerformanceModal').style.display = 'flex';
}

function closeEditModal() {
    document.getElementById('editPerformanceModal').style.display = 'none';
}

function savePerformanceEdits() {
    try {
        const winRate = parseFloat(document.getElementById('editWinRate').value) || 0;
        const avgProfit = parseFloat(document.getElementById('editAvgProfit').value) || 0;
        const avgLoss = parseFloat(document.getElementById('editAvgLoss').value) || 0;
        const totalWins = parseInt(document.getElementById('editTotalWins').value) || 0;
        const totalLosses = parseInt(document.getElementById('editTotalLosses').value) || 0;

        // Validate inputs
        if (winRate < 0 || winRate > 100) {
            showNotification('Win rate must be between 0 and 100', 'error');
            return;
        }

        if (avgLoss < 0) {
            showNotification('Average loss cannot be negative', 'error');
            return;
        }

        if (totalWins < 0 || totalLosses < 0) {
            showNotification('Win/Loss counts cannot be negative', 'error');
            return;
        }

        // Save custom performance data
        const customPerformance = {
            winRate: winRate,
            avgProfit: avgProfit.toFixed(2),
            avgLoss: avgLoss.toFixed(2),
            totalWins: totalWins,
            totalLosses: totalLosses
        };

        if (saveUserData('customPerformance', customPerformance)) {
            updatePerformanceAnalytics();
            closeEditModal();
            showNotification('Performance statistics updated successfully!', 'success');
        } else {
            showNotification('Error saving performance data', 'error');
        }

    } catch (error) {
        console.error('Error saving performance edits:', error);
        showNotification('Error saving performance data', 'error');
    }
}

// Currency Converter Functions
function convertCurrency() {
    const amount = parseFloat(document.getElementById("amount").value) || 0;
    const rate = parseFloat(document.getElementById("rate").value) || 1;
    const fromCurrency = document.getElementById("fromCurrency").value;
    const toCurrency = document.getElementById("toCurrency").value;

    // Update rate label
    document.getElementById("rateLabel").textContent = `1 ${fromCurrency} = ${rate} ${toCurrency}`;

    if (amount > 0) {
        const converted = amount * rate;
        document.getElementById("conversionText").textContent =
            `${amount.toFixed(2)} ${fromCurrency} = ${converted.toFixed(2)} ${toCurrency}`;
        document.getElementById("convertResult").style.display = "block";
    } else {
        document.getElementById("convertResult").style.display = "none";
    }
}

// UI Functions
function switchTab(tabId) {
    // Hide all tab contents
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.classList.remove('active');
    });

    // Remove active class from all tabs
    document.querySelectorAll('.tab').forEach(tab => {
        tab.classList.remove('active');
    });

    // Show selected tab content
    document.getElementById(tabId).classList.add('active');

    // Set active class on clicked tab
    event.target.classList.add('active');
}

function toggleTheme() {
    const body = document.body;
    body.classList.toggle("dark");
    saveUserData('darkMode', body.classList.contains('dark'));
    showNotification('Theme changed successfully!', 'info');
}

function showTradeSummary() {
    const assetName = document.getElementById("assetName").value || "Not specified";
    const entry = document.getElementById("entry").value || "Not specified";
    const leverage = document.getElementById("leverage").value || "Not calculated";
    const risk = document.getElementById("risk").value || "Not specified";
    const position = document.getElementById("longBtn").classList.contains("active") ? "Long" : "Short";
    const slValue = document.getElementById("slValue").textContent;
    const slPrice = document.getElementById("slPrice").textContent;
    const profitValue = document.getElementById("profitValue").textContent;
    const profitValueInr = document.getElementById("profitValueInr").textContent;
    const rrRatio = document.getElementById("rrRatio").textContent;
    const makerFee = document.getElementById("makerFee").textContent;
    const takerFee = document.getElementById("takerFee").textContent;

    const summary = `Trade Summary:
Asset: ${assetName}
Position: ${position}
Entry Price: $${entry}
Position Size: $${leverage}
Risk: $${risk}
Stop Loss Value: ${slValue}
Stop Loss Price: ${slPrice}
Potential Profit: ${profitValue} (${profitValueInr})
Risk/Reward Ratio: ${rrRatio}
Maker Fee: ${makerFee}
Taker Fee: ${takerFee}`;

    alert(summary);
}

// Enhanced Notification System
function showNotification(message, type = 'success') {
    try {
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;

        const icons = {
            success: 'fas fa-check-circle',
            error: 'fas fa-exclamation-circle',
            warning: 'fas fa-exclamation-triangle',
            info: 'fas fa-info-circle'
        };

        notification.innerHTML = `
            <div class="notification-content">
                <div class="notification-text">
                    <i class="${icons[type]}"></i> ${message}
                </div>
                <button class="notification-close" onclick="this.closest('.notification').remove()">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `;

        document.body.appendChild(notification);

        // Show notification
        setTimeout(() => {
            notification.classList.add('show');
        }, 100);

        // Hide notification after 4 seconds
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 400);
        }, 4000);

    } catch (error) {
        console.error("Error showing notification:", error);
    }
}

// Handle updating pending trades
function updateTradeOutcome(tradeId) {
    const trades = loadUserData('trades') || [];
    const trade = trades.find(t => t.id === tradeId);

    if (!trade) return;

    const outcome = prompt("Enter outcome (win/loss):");
    if (!outcome || !['win', 'loss'].includes(outcome.toLowerCase())) {
        showNotification("Invalid outcome. Please enter 'win' or 'loss'.", "error");
        return;
    }

    const exitPrice = parseFloat(prompt("Enter exit price:"));
    if (!exitPrice || exitPrice <= 0) {
        showNotification("Invalid exit price.", "error");
        return;
    }

    const feeType = prompt("Enter fee type (maker/taker):") || 'taker';
    if (!['maker', 'taker'].includes(feeType.toLowerCase())) {
        showNotification("Invalid fee type. Using taker fee.", "warning");
        feeType = 'taker';
    }

    // Calculate profit/loss
    const entry = trade.entry;
    const originalAmount = trade.originalAmount;
    const leverageX = trade.leverageX;
    const isLong = trade.position === 'Long';

    const priceDiff = isLong ? (exitPrice - entry) : (entry - exitPrice);
    const percentageChange = priceDiff / entry;
    let profit = originalAmount * percentageChange * leverageX;

    // Subtract selected fee
    const usedFee = feeType.toLowerCase() === 'maker' ? trade.makerFee : trade.takerFee;
    profit -= usedFee;

    if (outcome.toLowerCase() === 'loss' && profit > 0) {
        profit = -Math.abs(profit);
    }
    if (outcome.toLowerCase() === 'win' && profit < 0) {
        profit = Math.abs(profit);
    }

    // Update trade
    trade.outcome = outcome.toLowerCase();
    trade.profit = profit;
    trade.exitPrice = exitPrice;
    trade.feeType = feeType.toLowerCase();
    trade.usedFee = usedFee;

    // Save updated trades
    if (saveUserData('trades', trades)) {
        updateTotalPL(profit);
        loadTrades();
        updatePerformanceAnalytics();
        updateAdvancedAnalytics();
        showNotification("Trade outcome updated successfully!", "success");
    }
}

// Avatar Upload Functions
function openAvatarModal() {
    // Reset avatar selection
    selectedAvatar = null;
    uploadedImage = null;
    document.getElementById('avatarPreview').style.display = 'none';
    document.getElementById('avatarModal').style.display = 'flex';
}

function closeAvatarModal() {
    document.getElementById('avatarModal').style.display = 'none';
}

function selectDefaultAvatar(avatarId) {
    selectedAvatar = avatarId;

    // Highlight selected avatar
    document.querySelectorAll('.avatar-option').forEach(option => {
        option.classList.remove('selected');
    });
    event.target.classList.add('selected');

    // Hide preview if showing
    document.getElementById('avatarPreview').style.display = 'none';
}

function handleImageUpload(event) {
    const file = event.target.files[0];

    if (!file) return;

    // Validate file type
    const validTypes = ['image/jpeg', 'image/png', 'image/gif'];
    if (!validTypes.includes(file.type)) {
        showNotification('Please select a valid image file (JPEG, PNG, GIF)', 'error');
        return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
        showNotification('File size exceeds 5MB limit', 'error');
        return;
    }

    const reader = new FileReader();
    reader.onload = function (e) {
        // Display preview
        const preview = document.getElementById('avatarPreview');
        preview.style.backgroundImage = `url(${e.target.result})`;
        preview.style.display = 'block';

        // Save uploaded image
        uploadedImage = e.target.result;

        // Clear any default avatar selection
        document.querySelectorAll('.avatar-option').forEach(option => {
            option.classList.remove('selected');
        });
    }

    reader.readAsDataURL(file);
}

function saveAvatar() {
    let avatarData = null;

    if (uploadedImage) {
        avatarData = uploadedImage;
    } else if (selectedAvatar) {
        // Get the SVG data for the selected avatar
        switch (selectedAvatar) {
            case 'default1':
                avatarData = 'data:image/svg+xml,<svg xmlns=%27http://www.w3.org/2000/svg%27 viewBox=%270 0 100 100%27><rect width=%27100%27 height=%27100%27 fill=%27%232962ff%27/><circle cx=%2750%27 cy=%2740%27 r=%2720%27 fill=%27%23fff%27/><path d=%27M20,85 L80,85 C65,70 35,70 20,85 Z%27 fill=%27%23fff%27/></svg>';
                break;
            case 'default2':
                avatarData = 'data:image/svg+xml,<svg xmlns=%27http://www.w3.org/2000/svg%27 viewBox=%270 0 100 100%27><rect width=%27100%27 height=%27100%27 fill=%27%23ff6d00%27/><circle cx=%2750%27 cy=%2740%27 r=%2720%27 fill=%27%23fff%27/><path d=%27M20,85 L80,85 C65,70 35,70 20,85 Z%27 fill=%27%23fff%27/></svg>';
                break;
            case 'default3':
                avatarData = 'data:image/svg+xml,<svg xmlns=%27http://www.w3.org/2000/svg%27 viewBox=%270 0 100 100%27><rect width=%27100%27 height=%27100%27 fill=%27%2300c853%27/><circle cx=%2750%27 cy=%2740%27 r=%2720%27 fill=%27%23fff%27/><path d=%27M20,85 L80,85 C65,70 35,70 20,85 Z%27 fill=%27%23fff%27/></svg>';
                break;
        }
    }

    if (!avatarData) {
        showNotification('Please select an avatar or upload an image', 'error');
        return;
    }

    // Update current user avatar
    if (currentUser) {
        currentUser.avatar = avatarData;
        localStorage.setItem('currentUser', JSON.stringify(currentUser));

        // Update avatar in header
        const avatar = document.getElementById('userAvatar');
        avatar.textContent = '';
        avatar.style.backgroundImage = `url(${avatarData})`;

        // Update registered user's avatar to persist after logout
        const users = JSON.parse(localStorage.getItem('registeredUsers') || '[]');
        const userIndex = users.findIndex(u => u.username === currentUser.username);
        if (userIndex !== -1) {
            users[userIndex].avatar = avatarData;
            localStorage.setItem('registeredUsers', JSON.stringify(users));
        }

        showNotification('Profile picture updated successfully!', 'success');
        closeAvatarModal();
    }
}

// Load saved risk settings on initialization
function loadRiskSettings() {
    const riskSettings = loadUserData('riskSettings');
    if (riskSettings) {
        document.getElementById('riskAccountBalance').value = riskSettings.accountBalance || 1000;
        document.getElementById('riskPerTradePercent').value = riskSettings.riskPerTradePercent || 2;
        document.getElementById('dailyRiskPercent').value = riskSettings.dailyRiskPercent || 5;
        document.getElementById('maxDrawdownLimit').value = riskSettings.maxDrawdownLimit || 15;
        updateRiskMetrics();
    }
}

// Initialize risk settings when app loads
document.addEventListener('DOMContentLoaded', function () {
    setTimeout(loadRiskSettings, 1000); // Load after main initialization
});