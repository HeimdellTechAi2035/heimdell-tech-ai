/* Cookie Consent Bar — Heimdell Tech AI
   Injects a GDPR-compliant cookie consent banner.
   When the user clicks "Accept All", they consent to:
     1. Website cookies (analytics, functionality)
     2. Receiving automated calls from Heimdell Tech AI
   Consent is stored in localStorage so the bar only shows once. */

(function () {
    'use strict';

    var CONSENT_KEY = 'heimdell_cookie_consent';
    var CLARITY_PROJECT_ID = 'voj30qrhuu';

    // Load Microsoft Clarity with consent
    function loadClarity(consentGranted) {
        if (window.clarity) return; // Already loaded
        (function(c,l,a,r,i,t,y){
            c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
            t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i+"?ref=bwt";
            y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
        })(window, document, "clarity", "script", CLARITY_PROJECT_ID);
        
        // Set consent status
        if (consentGranted) {
            window.clarity('consent');
        }
    }

    // If already accepted, load Clarity and exit
    if (localStorage.getItem(CONSENT_KEY) === 'accepted') {
        loadClarity(true);
        return;
    }
    
    // If essential only, load Clarity without consent (no cookies)
    if (localStorage.getItem(CONSENT_KEY) === 'essential') {
        loadClarity(false);
        return;
    }

    /* ── CSS ────────────────────────────────────────────────── */
    var style = document.createElement('style');
    style.textContent = '' +
        '#heimdell-cookie-bar{' +
            'position:fixed;bottom:0;left:0;right:0;z-index:99999;' +
            'background:rgba(26,14,51,0.97);backdrop-filter:blur(16px);' +
            'border-top:1px solid rgba(74,45,143,0.4);' +
            'padding:20px 24px;' +
            'font-family:"Inter",-apple-system,sans-serif;' +
            'color:#E8DBFD;font-size:0.88rem;line-height:1.65;' +
            'display:flex;align-items:center;justify-content:center;gap:20px;flex-wrap:wrap;' +
            'animation:heimCookieSlide .4s ease-out;' +
        '}' +
        '@keyframes heimCookieSlide{from{transform:translateY(100%)}to{transform:translateY(0)}}' +
        '#heimdell-cookie-bar .hcb-text{max-width:720px;flex:1 1 400px;}' +
        '#heimdell-cookie-bar .hcb-text a{color:#D4C2F0;text-decoration:underline;transition:color .2s;}' +
        '#heimdell-cookie-bar .hcb-text a:hover{color:#fff;}' +
        '#heimdell-cookie-bar .hcb-actions{display:flex;gap:10px;flex-shrink:0;flex-wrap:wrap;}' +
        '#heimdell-cookie-bar button{' +
            'border:none;cursor:pointer;font-family:"Inter",sans-serif;font-weight:600;' +
            'font-size:0.82rem;padding:10px 22px;border-radius:8px;transition:all .25s ease;white-space:nowrap;' +
        '}' +
        '#heimdell-cookie-bar .hcb-accept{background:#2D1B69;color:#fff;}' +
        '#heimdell-cookie-bar .hcb-accept:hover{background:#4A2D8F;transform:translateY(-1px);}' +
        '#heimdell-cookie-bar .hcb-decline{background:transparent;color:#D4C2F0;border:1px solid rgba(212,194,240,0.3);}' +
        '#heimdell-cookie-bar .hcb-decline:hover{background:rgba(212,194,240,0.08);transform:translateY(-1px);}' +
        '@media(max-width:600px){' +
            '#heimdell-cookie-bar{flex-direction:column;text-align:center;padding:18px 16px;}' +
            '#heimdell-cookie-bar .hcb-actions{justify-content:center;width:100%;}' +
        '}';
    document.head.appendChild(style);

    /* ── HTML ───────────────────────────────────────────────── */
    var bar = document.createElement('div');
    bar.id = 'heimdell-cookie-bar';
    bar.setAttribute('role', 'dialog');
    bar.setAttribute('aria-label', 'Cookie and communication consent');
    bar.innerHTML = '' +
        '<div class="hcb-text">' +
            'We use cookies to improve your experience on our site. By clicking <strong>"Accept All"</strong>, you also consent to receiving ' +
            '<strong>automated telephone calls</strong> from Heimdell Tech AI regarding our services, in accordance with UK regulations. ' +
            'You can withdraw consent at any time. ' +
            '<a href="privacy-policy.html">Privacy Policy</a>' +
        '</div>' +
        '<div class="hcb-actions">' +
            '<button class="hcb-accept" id="hcb-accept-btn">Accept All</button>' +
            '<button class="hcb-decline" id="hcb-decline-btn">Essential Only</button>' +
        '</div>';

    document.body.appendChild(bar);

    /* ── Events ─────────────────────────────────────────────── */
    document.getElementById('hcb-accept-btn').addEventListener('click', function () {
        localStorage.setItem(CONSENT_KEY, 'accepted');
        localStorage.setItem('heimdell_consent_date', new Date().toISOString());
        localStorage.setItem('heimdell_automated_calls', 'yes');
        loadClarity(true); // Load Clarity with full consent
        bar.style.animation = 'none';
        bar.style.transition = 'transform .3s ease, opacity .3s ease';
        bar.style.transform = 'translateY(100%)';
        bar.style.opacity = '0';
        setTimeout(function () { bar.remove(); }, 350);
    });

    document.getElementById('hcb-decline-btn').addEventListener('click', function () {
        localStorage.setItem(CONSENT_KEY, 'essential');
        localStorage.setItem('heimdell_consent_date', new Date().toISOString());
        localStorage.setItem('heimdell_automated_calls', 'no');
        loadClarity(false); // Load Clarity without cookie consent
        bar.style.animation = 'none';
        bar.style.transition = 'transform .3s ease, opacity .3s ease';
        bar.style.transform = 'translateY(100%)';
        bar.style.opacity = '0';
        setTimeout(function () { bar.remove(); }, 350);
    });
})();
