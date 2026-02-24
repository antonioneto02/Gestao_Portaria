document.addEventListener('DOMContentLoaded', function() {
    const isHomePage = window.location.pathname === '/' || window.location.pathname === '';
    if (isHomePage) {
        return;
    }
    
    const backToTopButton = document.createElement('button');
    backToTopButton.className = 'back-to-top';
    backToTopButton.innerHTML = '<i class="fas fa-arrow-up"></i>';
    backToTopButton.setAttribute('aria-label', 'Voltar ao topo');
    backToTopButton.setAttribute('title', 'Voltar ao topo');
    document.body.appendChild(backToTopButton);

    function toggleBackToTopButton() {
        const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
        const windowHeight = window.innerHeight;
        const documentHeight = document.documentElement.scrollHeight;
        if (scrollTop > 300 || (scrollTop + windowHeight) >= (documentHeight - 100)) {
            backToTopButton.classList.add('show');
        } else {
            backToTopButton.classList.remove('show');
        }
    }

    function scrollToTop() {
        if ('scrollBehavior' in document.documentElement.style) {
            window.scrollTo({
                top: 0,
                behavior: 'smooth'
            });
        } else {
            const scrollStep = -window.scrollY / (500 / 15);
            const scrollInterval = setInterval(function() {
                if (window.scrollY !== 0) {
                    window.scrollBy(0, scrollStep);
                } else {
                    clearInterval(scrollInterval);
                }
            }, 15);
        }
    }

    window.addEventListener('scroll', toggleBackToTopButton);
    backToTopButton.addEventListener('click', scrollToTop);
    toggleBackToTopButton();
    backToTopButton.addEventListener('keydown', function(e) {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            scrollToTop();
        }
    });
    backToTopButton.setAttribute('tabindex', '0');
    backToTopButton.setAttribute('role', 'button');
});
