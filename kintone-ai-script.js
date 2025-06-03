// ==========================================================================
// kintone × AI Landing Page JavaScript
// ==========================================================================

document.addEventListener('DOMContentLoaded', function() {
    
    // ==========================================================================
    // スムーズスクロール
    // ==========================================================================
    
    const navLinks = document.querySelectorAll('.nav-link[href^="#"]');
    navLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const targetId = this.getAttribute('href').substring(1);
            const targetElement = document.getElementById(targetId);
            
            if (targetElement) {
                const headerHeight = document.querySelector('.header').offsetHeight;
                const targetPosition = targetElement.offsetTop - headerHeight - 20;
                
                window.scrollTo({
                    top: targetPosition,
                    behavior: 'smooth'
                });
            }
        });
    });
    
    // ==========================================================================
    // ヘッダーのスクロール効果
    // ==========================================================================
    
    const header = document.querySelector('.header');
    let lastScrollTop = 0;
    
    window.addEventListener('scroll', function() {
        const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
        
        if (scrollTop > lastScrollTop && scrollTop > 100) {
            // 下スクロール時にヘッダーを隠す
            header.style.transform = 'translateY(-100%)';
        } else {
            // 上スクロール時にヘッダーを表示
            header.style.transform = 'translateY(0)';
        }
        
        // スクロール位置に応じてヘッダーの背景を調整
        if (scrollTop > 50) {
            header.style.background = 'rgba(255, 255, 255, 0.98)';
            header.style.boxShadow = '0 2px 20px rgba(0, 0, 0, 0.1)';
        } else {
            header.style.background = 'rgba(255, 255, 255, 0.95)';
            header.style.boxShadow = 'none';
        }
        
        lastScrollTop = scrollTop;
    });
    
    // ==========================================================================
    // インtersection Observer - スクロールアニメーション
    // ==========================================================================
    
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };
    
    const observer = new IntersectionObserver(function(entries) {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
            }
        });
    }, observerOptions);
    
    // アニメーション対象要素を監視
    const animateElements = document.querySelectorAll('.category-card, .benefit-item, .partner-card, .step');
    animateElements.forEach(el => {
        el.classList.add('fade-in');
        observer.observe(el);
    });
    
    // ==========================================================================
    // カテゴリカードのホバー効果
    // ==========================================================================
    
    const categoryCards = document.querySelectorAll('.category-card');
    categoryCards.forEach(card => {
        card.addEventListener('mouseenter', function() {
            // カードアニメーション
            this.style.transform = 'translateY(-15px) scale(1.02)';
            
            // アイコンアニメーション
            const icon = this.querySelector('.card-icon');
            if (icon) {
                icon.style.transform = 'scale(1.2) rotate(5deg)';
                icon.style.transition = 'transform 0.3s ease';
            }
            
            // 特徴タグのアニメーション
            const tags = this.querySelectorAll('.feature-tag');
            tags.forEach((tag, index) => {
                setTimeout(() => {
                    tag.style.transform = 'translateY(-3px)';
                    tag.style.transition = 'transform 0.2s ease';
                }, index * 50);
            });
        });
        
        card.addEventListener('mouseleave', function() {
            this.style.transform = 'translateY(-10px) scale(1)';
            
            const icon = this.querySelector('.card-icon');
            if (icon) {
                icon.style.transform = 'scale(1) rotate(0deg)';
            }
            
            const tags = this.querySelectorAll('.feature-tag');
            tags.forEach(tag => {
                tag.style.transform = 'translateY(0)';
            });
        });
    });
    
    // ==========================================================================
    // パーティクルアニメーション
    // ==========================================================================
    
    function createParticle() {
        const hero = document.querySelector('.hero');
        const particle = document.createElement('div');
        particle.style.cssText = `
            position: absolute;
            width: 4px;
            height: 4px;
            background: rgba(0, 184, 212, 0.6);
            border-radius: 50%;
            pointer-events: none;
            z-index: 1;
        `;
        
        const startX = Math.random() * window.innerWidth;
        const startY = window.innerHeight + 10;
        const endY = -10;
        const duration = 3000 + Math.random() * 2000;
        
        particle.style.left = startX + 'px';
        particle.style.top = startY + 'px';
        
        hero.appendChild(particle);
        
        // アニメーション
        particle.animate([
            { 
                transform: `translateY(0) translateX(0) scale(0)`,
                opacity: 0
            },
            { 
                transform: `translateY(-50px) translateX(${(Math.random() - 0.5) * 100}px) scale(1)`,
                opacity: 1,
                offset: 0.1
            },
            { 
                transform: `translateY(${endY - startY}px) translateX(${(Math.random() - 0.5) * 200}px) scale(0)`,
                opacity: 0
            }
        ], {
            duration: duration,
            easing: 'ease-out'
        }).onfinish = () => {
            particle.remove();
        };
    }
    
    // パーティクルを定期的に生成
    setInterval(createParticle, 300);
    
    // ==========================================================================
    // 数値カウントアニメーション
    // ==========================================================================
    
    function animateNumber(element, start, end, duration) {
        const startTime = performance.now();
        
        function update(currentTime) {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            const current = Math.round(start + (end - start) * easeOutQuart(progress));
            element.textContent = current + '%';
            
            if (progress < 1) {
                requestAnimationFrame(update);
            }
        }
        
        requestAnimationFrame(update);
    }
    
    function easeOutQuart(t) {
        return 1 - Math.pow(1 - t, 4);
    }
    
    // ==========================================================================
    // ダッシュボードプレビューのアニメーション
    // ==========================================================================
    
    const dashboardCards = document.querySelectorAll('.dashboard-card');
    dashboardCards.forEach((card, index) => {
        // 遅延付きでカードを表示
        setTimeout(() => {
            card.style.opacity = '0';
            card.style.transform = 'translateY(30px)';
            card.style.transition = 'all 0.6s ease';
            
            setTimeout(() => {
                card.style.opacity = '1';
                card.style.transform = 'translateY(0)';
            }, 100);
        }, index * 200);
    });
    
    // ==========================================================================
    // フローティングアイコンのランダムアニメーション
    // ==========================================================================
    
    const floatingIcons = document.querySelectorAll('.floating-icons .icon');
    floatingIcons.forEach(icon => {
        // ランダムな位置に移動するアニメーション
        setInterval(() => {
            const newX = Math.random() * 100;
            const newY = Math.random() * 100;
            icon.style.transform = `translate(${newX}px, ${newY}px)`;
        }, 5000 + Math.random() * 3000);
    });
    
    // ==========================================================================
    // ボタンのクリック効果
    // ==========================================================================
    
    const buttons = document.querySelectorAll('.btn');
    buttons.forEach(button => {
        button.addEventListener('click', function(e) {
            // リップル効果
            const ripple = document.createElement('span');
            const rect = this.getBoundingClientRect();
            const size = Math.max(rect.width, rect.height);
            const x = e.clientX - rect.left - size / 2;
            const y = e.clientY - rect.top - size / 2;
            
            ripple.style.cssText = `
                position: absolute;
                width: ${size}px;
                height: ${size}px;
                left: ${x}px;
                top: ${y}px;
                background: rgba(255, 255, 255, 0.3);
                border-radius: 50%;
                transform: scale(0);
                pointer-events: none;
                z-index: 1;
            `;
            
            this.style.position = 'relative';
            this.style.overflow = 'hidden';
            this.appendChild(ripple);
            
            ripple.animate([
                { transform: 'scale(0)', opacity: 1 },
                { transform: 'scale(1)', opacity: 0 }
            ], {
                duration: 600,
                easing: 'ease-out'
            }).onfinish = () => {
                ripple.remove();
            };
        });
    });
    
    // ==========================================================================
    // パララックス効果
    // ==========================================================================
    
    window.addEventListener('scroll', function() {
        const scrolled = window.pageYOffset;
        const parallaxElements = document.querySelectorAll('.floating-icons');
        
        parallaxElements.forEach(element => {
            const speed = 0.5;
            element.style.transform = `translateY(${scrolled * speed}px)`;
        });
    });
    
    // ==========================================================================
    // レスポンシブメニュー（モバイル対応）
    // ==========================================================================
    
    function createMobileMenu() {
        if (window.innerWidth <= 768) {
            const header = document.querySelector('.header .container');
            const nav = document.querySelector('.nav');
            
            if (!document.querySelector('.mobile-menu-toggle')) {
                const toggleButton = document.createElement('button');
                toggleButton.className = 'mobile-menu-toggle';
                toggleButton.innerHTML = '☰';
                toggleButton.style.cssText = `
                    background: none;
                    border: none;
                    font-size: 1.5rem;
                    color: #333;
                    cursor: pointer;
                    padding: 10px;
                `;
                
                header.appendChild(toggleButton);
                
                toggleButton.addEventListener('click', function() {
                    nav.style.display = nav.style.display === 'flex' ? 'none' : 'flex';
                    nav.style.position = 'absolute';
                    nav.style.top = '100%';
                    nav.style.left = '0';
                    nav.style.right = '0';
                    nav.style.background = 'white';
                    nav.style.flexDirection = 'column';
                    nav.style.padding = '20px';
                    nav.style.boxShadow = '0 5px 15px rgba(0,0,0,0.1)';
                });
            }
        }
    }
    
    createMobileMenu();
    window.addEventListener('resize', createMobileMenu);
    
    // ==========================================================================
    // パフォーマンス最適化
    // ==========================================================================
    
    // Intersection Observerの最適化
    if ('IntersectionObserver' in window) {
        // 遅延読み込みのための処理
        const lazyElements = document.querySelectorAll('[data-lazy]');
        const lazyObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('loaded');
                    lazyObserver.unobserve(entry.target);
                }
            });
        });
        
        lazyElements.forEach(el => lazyObserver.observe(el));
    }
    
    // スクロール処理のthrottle
    let ticking = false;
    function updateOnScroll() {
        // スクロール関連の処理をここに集約
        if (!ticking) {
            requestAnimationFrame(function() {
                // パフォーマンスが重要なスクロール処理
                ticking = false;
            });
            ticking = true;
        }
    }
    
    window.addEventListener('scroll', updateOnScroll);
    
});

// ==========================================================================
// ユーティリティ関数
// ==========================================================================

// デバウンス関数
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// スロットル関数
function throttle(func, limit) {
    let inThrottle;
    return function() {
        const args = arguments;
        const context = this;
        if (!inThrottle) {
            func.apply(context, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
}