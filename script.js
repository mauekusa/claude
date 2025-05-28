document.addEventListener('DOMContentLoaded', function() {
    createParticles();
    initializeVideoPlayer();
    initializeForm();
    initializeAnimations();
    initializeSubscribeButton();
});

function createParticles() {
    const particleContainer = document.getElementById('particles');
    const particleCount = 50;

    for (let i = 0; i < particleCount; i++) {
        const particle = document.createElement('div');
        particle.className = 'particle';
        
        const size = Math.random() * 4 + 1;
        particle.style.width = `${size}px`;
        particle.style.height = `${size}px`;
        particle.style.left = `${Math.random() * 100}%`;
        particle.style.top = `${Math.random() * 100}%`;
        particle.style.animationDelay = `${Math.random() * 6}s`;
        particle.style.animationDuration = `${Math.random() * 3 + 4}s`;
        
        particleContainer.appendChild(particle);
    }
}

function initializeVideoPlayer() {
    const videoItems = document.querySelectorAll('.video-item');
    const videoPlayer = document.getElementById('videoPlayer');
    const youtubeFrame = document.getElementById('youtubeFrame');
    
    videoItems.forEach(item => {
        item.addEventListener('click', function() {
            const videoId = this.getAttribute('data-video-id');
            playVideo(videoId);
        });
    });
}

function playVideo(videoId) {
    const videoPlayer = document.getElementById('videoPlayer');
    const youtubeFrame = document.getElementById('youtubeFrame');
    
    const embedUrl = `https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0&modestbranding=1`;
    youtubeFrame.src = embedUrl;
    
    videoPlayer.style.display = 'flex';
    document.body.style.overflow = 'hidden';
    
    videoPlayer.addEventListener('click', function(e) {
        if (e.target === videoPlayer) {
            closeVideo();
        }
    });
}

function closeVideo() {
    const videoPlayer = document.getElementById('videoPlayer');
    const youtubeFrame = document.getElementById('youtubeFrame');
    
    videoPlayer.style.display = 'none';
    youtubeFrame.src = '';
    document.body.style.overflow = '';
}

function scrollToVideos() {
    const videosSection = document.getElementById('videos');
    videosSection.scrollIntoView({ behavior: 'smooth' });
}

function initializeForm() {
    const form = document.getElementById('contactForm');
    const submitBtn = form.querySelector('.submit-btn');
    const loadingSpinner = submitBtn.querySelector('.loading-spinner');
    const btnText = submitBtn.querySelector('.btn-text');

    form.addEventListener('submit', function(e) {
        e.preventDefault();
        
        if (validateForm()) {
            showLoading(true);
            
            setTimeout(() => {
                const formData = new FormData(form);
                const data = {
                    company: formData.get('company'),
                    name: formData.get('name'),
                    email: formData.get('email'),
                    timestamp: new Date().toISOString()
                };
                
                saveToCSV(data);
                showSuccess();
                form.reset();
                showLoading(false);
            }, 2000);
        }
    });

    function showLoading(show) {
        if (show) {
            loadingSpinner.style.display = 'block';
            btnText.textContent = '送信中...';
            submitBtn.disabled = true;
        } else {
            loadingSpinner.style.display = 'none';
            btnText.textContent = '送信';
            submitBtn.disabled = false;
        }
    }
}

function validateForm() {
    const company = document.getElementById('company');
    const name = document.getElementById('name');
    const email = document.getElementById('email');
    
    let isValid = true;
    
    clearErrors();
    
    if (!company.value.trim()) {
        showError('companyError', '会社名を入力してください');
        isValid = false;
    }
    
    if (!name.value.trim()) {
        showError('nameError', 'お名前を入力してください');
        isValid = false;
    }
    
    if (!email.value.trim()) {
        showError('emailError', 'メールアドレスを入力してください');
        isValid = false;
    } else if (!isValidEmail(email.value)) {
        showError('emailError', '有効なメールアドレスを入力してください');
        isValid = false;
    }
    
    return isValid;
}

function clearErrors() {
    const errorElements = document.querySelectorAll('.error-message');
    errorElements.forEach(element => element.textContent = '');
}

function showError(elementId, message) {
    document.getElementById(elementId).textContent = message;
}

function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

function saveToCSV(data) {
    const existingData = JSON.parse(localStorage.getItem('contactData') || '[]');
    existingData.push(data);
    localStorage.setItem('contactData', JSON.stringify(existingData));
    
    const csvContent = convertToCSV(existingData);
    downloadCSV(csvContent, 'contact_data.csv');
}

function convertToCSV(data) {
    if (data.length === 0) return '';
    
    const headers = ['会社名', 'お名前', 'メールアドレス', '送信日時'];
    const rows = data.map(item => [
        item.company,
        item.name,
        item.email,
        new Date(item.timestamp).toLocaleString('ja-JP')
    ]);
    
    const csvArray = [headers, ...rows];
    return csvArray.map(row => 
        row.map(field => `"${String(field).replace(/"/g, '""')}"`).join(',')
    ).join('\n');
}

function downloadCSV(csvContent, filename) {
    const BOM = '\uFEFF';
    const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    
    if (link.download !== undefined) {
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', filename);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
}

function showSuccess() {
    const successMessage = document.createElement('div');
    successMessage.className = 'success-notification';
    successMessage.innerHTML = `
        <div style="
            position: fixed;
            top: 20px;
            right: 20px;
            background: linear-gradient(45deg, #00ffff, #ff00ff);
            color: #0a0a0a;
            padding: 15px 25px;
            border-radius: 10px;
            font-weight: bold;
            z-index: 10000;
            box-shadow: 0 0 20px #00ffff;
            animation: slideIn 0.5s ease-out;
        ">
            ✓ お問い合わせを受け付けました
        </div>
    `;
    
    document.body.appendChild(successMessage);
    
    setTimeout(() => {
        successMessage.remove();
    }, 3000);
}

function initializeAnimations() {
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

    const animateElements = document.querySelectorAll('.feature-card, .video-item');
    animateElements.forEach(element => {
        observer.observe(element);
    });
}

function initializeSubscribeButton() {
    const subscribeBtn = document.getElementById('subscribeBtn');
    
    subscribeBtn.addEventListener('click', function() {
        createExplosionEffect(this);
        
        setTimeout(() => {
            window.open('https://www.youtube.com/@kintonech?sub_confirmation=1', '_blank');
        }, 500);
    });
}

function createExplosionEffect(button) {
    const rect = button.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    
    for (let i = 0; i < 20; i++) {
        const particle = document.createElement('div');
        particle.style.cssText = `
            position: fixed;
            width: 4px;
            height: 4px;
            background: #00ffff;
            border-radius: 50%;
            pointer-events: none;
            z-index: 10000;
            left: ${centerX}px;
            top: ${centerY}px;
        `;
        
        document.body.appendChild(particle);
        
        const angle = (Math.PI * 2 * i) / 20;
        const velocity = 100 + Math.random() * 50;
        const vx = Math.cos(angle) * velocity;
        const vy = Math.sin(angle) * velocity;
        
        let x = 0, y = 0;
        const animate = () => {
            x += vx * 0.02;
            y += vy * 0.02 + 2;
            vy += 2;
            
            particle.style.transform = `translate(${x}px, ${y}px)`;
            particle.style.opacity = Math.max(0, 1 - Math.abs(y) / 200);
            
            if (particle.style.opacity > 0) {
                requestAnimationFrame(animate);
            } else {
                particle.remove();
            }
        };
        
        requestAnimationFrame(animate);
    }
}

document.addEventListener('mousemove', function(e) {
    if (Math.random() > 0.95) {
        createTrailParticle(e.clientX, e.clientY);
    }
});

function createTrailParticle(x, y) {
    const particle = document.createElement('div');
    particle.style.cssText = `
        position: fixed;
        width: 3px;
        height: 3px;
        background: #00ffff;
        border-radius: 50%;
        pointer-events: none;
        z-index: 1;
        left: ${x}px;
        top: ${y}px;
        animation: trailFade 1s ease-out forwards;
    `;
    
    document.body.appendChild(particle);
    
    setTimeout(() => particle.remove(), 1000);
}

const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
    
    @keyframes trailFade {
        0% { opacity: 1; transform: scale(1); }
        100% { opacity: 0; transform: scale(0); }
    }
    
    .animate-in {
        animation: slideInUp 0.8s ease-out forwards;
    }
    
    @keyframes slideInUp {
        from { 
            transform: translateY(50px);
            opacity: 0;
        }
        to { 
            transform: translateY(0);
            opacity: 1;
        }
    }
`;
document.head.appendChild(style);

window.addEventListener('scroll', function() {
    const scrolled = window.pageYOffset;
    const parallax = document.querySelector('.hero-section');
    const speed = scrolled * 0.5;
    
    if (parallax) {
        parallax.style.transform = `translateY(${speed}px)`;
    }
});

document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
        closeVideo();
    }
});