// Smooth scrolling and page interactions
document.addEventListener('DOMContentLoaded', function() {
    // Initialize animations and interactions
    initializeAnimations();
    initializeForm();
    initializeScrollEffects();
    initializeParticleSystem();
});

// Animation initialization
function initializeAnimations() {
    // Add loading animation
    document.body.classList.add('loaded');
    
    // Intersection Observer for scroll animations
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };
    
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('animate-in');
            }
        });
    }, observerOptions);
    
    // Observe all sections
    document.querySelectorAll('section').forEach(section => {
        observer.observe(section);
    });
}

// Scroll to section function
function scrollToSection(sectionId) {
    const element = document.getElementById(sectionId);
    if (element) {
        element.scrollIntoView({
            behavior: 'smooth',
            block: 'start'
        });
    }
}

// Channel subscription function
function subscribeChannel() {
    // Create a futuristic notification
    showNotification('チャンネル登録ありがとうございます！🚀', 'success');
    
    // Add some visual effects
    createBurstEffect();
    
    // In a real implementation, this would redirect to YouTube
    setTimeout(() => {
        // window.open('https://youtube.com/channel/your-channel-id', '_blank');
        console.log('Would redirect to YouTube channel');
    }, 1500);
}

// Notification system
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.innerHTML = `
        <div class="notification-content">
            <span>${message}</span>
            <button class="notification-close" onclick="closeNotification(this)">×</button>
        </div>
    `;
    
    // Add styles
    notification.style.cssText = `
        position: fixed;
        top: 100px;
        right: 20px;
        background: linear-gradient(45deg, #00d4ff, #7c3aed);
        color: white;
        padding: 1rem 1.5rem;
        border-radius: 10px;
        box-shadow: 0 10px 30px rgba(0, 212, 255, 0.3);
        z-index: 10000;
        animation: slideInRight 0.5s ease-out, fadeOut 0.5s ease-out 3s forwards;
        backdrop-filter: blur(10px);
        border: 1px solid rgba(255, 255, 255, 0.2);
    `;
    
    document.body.appendChild(notification);
    
    // Auto remove after 3.5 seconds
    setTimeout(() => {
        if (notification.parentNode) {
            notification.remove();
        }
    }, 3500);
}

function closeNotification(button) {
    const notification = button.closest('.notification');
    notification.style.animation = 'slideOutRight 0.3s ease-out forwards';
    setTimeout(() => {
        if (notification.parentNode) {
            notification.remove();
        }
    }, 300);
}

// Burst effect for interactions
function createBurstEffect() {
    const burst = document.createElement('div');
    burst.className = 'burst-effect';
    burst.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        width: 100px;
        height: 100px;
        background: radial-gradient(circle, #00d4ff, transparent);
        border-radius: 50%;
        pointer-events: none;
        z-index: 9999;
        animation: burstAnimation 1s ease-out forwards;
        transform: translate(-50%, -50%);
    `;
    
    document.body.appendChild(burst);
    
    setTimeout(() => {
        burst.remove();
    }, 1000);
}

// Form handling and CSV functionality
function initializeForm() {
    const form = document.getElementById('contactForm');
    if (!form) return;
    
    form.addEventListener('submit', handleFormSubmit);
    
    // Add real-time validation
    const inputs = form.querySelectorAll('input, textarea');
    inputs.forEach(input => {
        input.addEventListener('blur', validateField);
        input.addEventListener('input', clearFieldError);
    });
}

function handleFormSubmit(e) {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const data = {
        company: formData.get('company'),
        name: formData.get('name'),
        email: formData.get('email'),
        message: formData.get('message'),
        timestamp: new Date().toISOString()
    };
    
    // Validate form
    if (!validateForm(data)) {
        showNotification('入力内容を確認してください', 'error');
        return;
    }
    
    // Show loading state
    const submitButton = e.target.querySelector('.form-submit');
    const originalText = submitButton.innerHTML;
    submitButton.innerHTML = '<span>送信中...</span><div class="btn-glow"></div>';
    submitButton.disabled = true;
    
    // Simulate form processing
    setTimeout(() => {
        // Save to CSV
        saveToCSV(data);
        
        // Show success message
        showNotification('お問い合わせありがとうございます！', 'success');
        
        // Reset form
        e.target.reset();
        
        // Reset button
        submitButton.innerHTML = originalText;
        submitButton.disabled = false;
        
        // Add success effect
        createBurstEffect();
    }, 2000);
}

function validateForm(data) {
    let isValid = true;
    
    // Validate required fields
    if (!data.company.trim()) {
        showFieldError('company', '会社名を入力してください');
        isValid = false;
    }
    
    if (!data.name.trim()) {
        showFieldError('name', 'お名前を入力してください');
        isValid = false;
    }
    
    if (!data.email.trim()) {
        showFieldError('email', 'メールアドレスを入力してください');
        isValid = false;
    } else if (!isValidEmail(data.email)) {
        showFieldError('email', '有効なメールアドレスを入力してください');
        isValid = false;
    }
    
    return isValid;
}

function validateField(e) {
    const field = e.target;
    const value = field.value.trim();
    
    clearFieldError(field);
    
    if (field.hasAttribute('required') && !value) {
        showFieldError(field.name, `${field.labels[0].textContent}を入力してください`);
        return false;
    }
    
    if (field.type === 'email' && value && !isValidEmail(value)) {
        showFieldError(field.name, '有効なメールアドレスを入力してください');
        return false;
    }
    
    return true;
}

function showFieldError(fieldName, message) {
    const field = document.querySelector(`[name="${fieldName}"]`);
    if (!field) return;
    
    field.style.borderColor = '#ff4757';
    
    // Remove existing error message
    const existingError = field.parentNode.querySelector('.field-error');
    if (existingError) {
        existingError.remove();
    }
    
    // Add error message
    const errorDiv = document.createElement('div');
    errorDiv.className = 'field-error';
    errorDiv.textContent = message;
    errorDiv.style.cssText = `
        color: #ff4757;
        font-size: 0.875rem;
        margin-top: 0.25rem;
        animation: slideInDown 0.3s ease-out;
    `;
    
    field.parentNode.appendChild(errorDiv);
}

function clearFieldError(e) {
    const field = e.target || e;
    field.style.borderColor = 'rgba(255, 255, 255, 0.3)';
    
    const errorDiv = field.parentNode.querySelector('.field-error');
    if (errorDiv) {
        errorDiv.remove();
    }
}

function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

// CSV functionality
function saveToCSV(data) {
    // Create CSV content
    const csvContent = createCSVContent(data);
    
    // Download CSV file
    downloadCSV(csvContent, `contact_${Date.now()}.csv`);
    
    // Also save to localStorage for demonstration
    saveToLocalStorage(data);
}

function createCSVContent(data) {
    const headers = ['会社名', 'お名前', 'メールアドレス', 'メッセージ', '送信日時'];
    const values = [
        data.company,
        data.name,
        data.email,
        data.message || '',
        new Date(data.timestamp).toLocaleString('ja-JP')
    ];
    
    // Escape commas and quotes in CSV
    const escapeCSV = (field) => {
        if (field.includes(',') || field.includes('"') || field.includes('\n')) {
            return `"${field.replace(/"/g, '""')}"`;
        }
        return field;
    };
    
    const headerRow = headers.map(escapeCSV).join(',');
    const dataRow = values.map(escapeCSV).join(',');
    
    return `\ufeff${headerRow}\n${dataRow}`;
}

function downloadCSV(content, filename) {
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    
    if (link.download !== undefined) {
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', filename);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }
}

function saveToLocalStorage(data) {
    let contacts = JSON.parse(localStorage.getItem('pepacomi_contacts') || '[]');
    contacts.push(data);
    localStorage.setItem('pepacomi_contacts', JSON.stringify(contacts));
    
    console.log('Contact saved to localStorage:', data);
}

// Scroll effects
function initializeScrollEffects() {
    let lastScrollTop = 0;
    const header = document.querySelector('.header');
    
    window.addEventListener('scroll', () => {
        const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
        
        // Header hide/show on scroll
        if (scrollTop > lastScrollTop && scrollTop > 100) {
            header.style.transform = 'translateY(-100%)';
        } else {
            header.style.transform = 'translateY(0)';
        }
        
        lastScrollTop = scrollTop;
        
        // Parallax effect for hero
        const hero = document.querySelector('.hero');
        if (hero) {
            const scrolled = window.pageYOffset;
            const parallaxSpeed = scrolled * 0.5;
            hero.style.transform = `translateY(${parallaxSpeed}px)`;
        }
    });
}

// Particle system enhancement
function initializeParticleSystem() {
    // Add mouse interaction particles
    document.addEventListener('mousemove', (e) => {
        if (Math.random() > 0.95) { // Only create particles occasionally
            createMouseParticle(e.clientX, e.clientY);
        }
    });
}

function createMouseParticle(x, y) {
    const particle = document.createElement('div');
    particle.style.cssText = `
        position: fixed;
        left: ${x}px;
        top: ${y}px;
        width: 4px;
        height: 4px;
        background: linear-gradient(45deg, #00d4ff, #7c3aed);
        border-radius: 50%;
        pointer-events: none;
        z-index: 1000;
        animation: mouseParticle 2s ease-out forwards;
    `;
    
    document.body.appendChild(particle);
    
    setTimeout(() => {
        particle.remove();
    }, 2000);
}

// Add CSS animations dynamically
const style = document.createElement('style');
style.textContent = `
    @keyframes slideInRight {
        from {
            opacity: 0;
            transform: translateX(100px);
        }
        to {
            opacity: 1;
            transform: translateX(0);
        }
    }
    
    @keyframes slideOutRight {
        from {
            opacity: 1;
            transform: translateX(0);
        }
        to {
            opacity: 0;
            transform: translateX(100px);
        }
    }
    
    @keyframes fadeOut {
        from {
            opacity: 1;
        }
        to {
            opacity: 0;
        }
    }
    
    @keyframes burstAnimation {
        0% {
            transform: translate(-50%, -50%) scale(0);
            opacity: 1;
        }
        50% {
            transform: translate(-50%, -50%) scale(2);
            opacity: 0.7;
        }
        100% {
            transform: translate(-50%, -50%) scale(4);
            opacity: 0;
        }
    }
    
    @keyframes slideInDown {
        from {
            opacity: 0;
            transform: translateY(-10px);
        }
        to {
            opacity: 1;
            transform: translateY(0);
        }
    }
    
    @keyframes mouseParticle {
        0% {
            opacity: 0.8;
            transform: scale(1);
        }
        100% {
            opacity: 0;
            transform: scale(0) translateY(-50px);
        }
    }
    
    .notification-content {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 1rem;
    }
    
    .notification-close {
        background: none;
        border: none;
        color: white;
        font-size: 1.5rem;
        cursor: pointer;
        padding: 0;
        width: 24px;
        height: 24px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 50%;
        transition: background 0.3s ease;
    }
    
    .notification-close:hover {
        background: rgba(255, 255, 255, 0.2);
    }
    
    .animate-in {
        animation: fadeInUp 0.8s ease-out forwards;
    }
    
    @keyframes fadeInUp {
        from {
            opacity: 0;
            transform: translateY(30px);
        }
        to {
            opacity: 1;
            transform: translateY(0);
        }
    }
`;
document.head.appendChild(style);