(() => {
    'use strict';

    const page = document.body.dataset.readinessPage;
    const parameters = new URLSearchParams(location.search);
    const playful = parameters.get('cta') === 'playful';
    const qualified = parameters.get('form') === 'qualified';
    const campaign = parameters.get('utm_content');
    const allowedCampaigns = ['booking', 'pricing', 'plain_english', 'site_access', 'first_fix'];
    const requestKey = 'heimdell_readiness_request_pending';
    const eventNames = new Set(['scan_cta', 'review_cta', 'example_cta', 'checklist_cta']);
    let analyticsReady = false;
    let returnedRequest;

    function hasAnalyticsConsent() {
        try {
            return localStorage.getItem('heimdell_cookie_consent') === 'accepted';
        } catch {
            return false;
        }
    }

    function track(stage) {
        if (!hasAnalyticsConsent()) return;
        if (!analyticsReady && !window.gtag) {
            analyticsReady = true;
            window.dataLayer = window.dataLayer || [];
            window.gtag = window.gtag || function () { window.dataLayer.push(arguments); };
            window.gtag('js', new Date());
            window.gtag('config', 'G-1WS6V6MJ35', {
                send_page_view: false,
                allow_google_signals: false,
                allow_ad_personalization_signals: false
            });
            const tag = document.createElement('script');
            tag.async = true;
            tag.src = 'https://www.googletagmanager.com/gtag/js?id=G-1WS6V6MJ35';
            document.head.append(tag);
        }
        const event = {
            funnel_stage: stage,
            funnel_page: page,
            cta_variant: (returnedRequest?.playful ?? playful) ? 'playful' : 'neutral',
            form_variant: (returnedRequest?.qualified ?? qualified) ? 'qualified' : 'short',
            page_location: location.origin + location.pathname
        };
        const angle = returnedRequest?.angle ?? campaign;
        if (allowedCampaigns.includes(angle)) event.campaign_angle = angle;
        if (stage === 'view') window.gtag('event', 'page_view', { page_location: event.page_location });
        window.gtag('event', 'heimdell_readiness', event);
    }

    if (page !== 'confirmation') {
        if (hasAnalyticsConsent()) {
            track('view');
        } else {
            document.addEventListener('click', function onAccept(event) {
                if (event.target.id !== 'hcb-accept-btn' || !hasAnalyticsConsent()) return;
                document.removeEventListener('click', onAccept);
                track('view');
            });
        }
    }

    document.addEventListener('click', event => {
        const stage = event.target.closest('[data-funnel-event]')?.dataset.funnelEvent;
        if (eventNames.has(stage)) track(stage);
    });

    for (const video of document.querySelectorAll('[data-funnel-video]')) {
        video.addEventListener('play', () => track('video_' + video.dataset.funnelVideo + '_play'), { once: true });
        video.addEventListener('ended', () => track('video_' + video.dataset.funnelVideo + '_complete'), { once: true });
    }

    const form = document.getElementById('readiness-request');
    if (form) {
        if (playful) {
            document.getElementById('readiness-decline').textContent = 'I’ll stick with guesswork for now';
        }
        if (qualified) {
            document.getElementById('readiness-goal').required = true;
            document.getElementById('readiness-goal-hint').textContent = '(required)';
            document.getElementById('readiness-form-variant').value = 'qualified';
        }
        form.addEventListener('submit', () => {
            track('request_submitted');
            try {
                sessionStorage.setItem(requestKey, JSON.stringify({
                    time: Date.now(), playful, qualified, angle: allowedCampaigns.includes(campaign) ? campaign : null
                }));
            } catch {
                // The enquiry form also works when browser storage is unavailable.
            }
        });
    }

    const confirmation = document.getElementById('readiness-confirmation');
    if (confirmation && parameters.get('sent') === '1') {
        try {
            returnedRequest = JSON.parse(sessionStorage.getItem(requestKey) || 'null');
            sessionStorage.removeItem(requestKey);
            if (returnedRequest && Date.now() - returnedRequest.time < 15 * 60 * 1000) {
                confirmation.hidden = false;
                track('request_returned');
            }
        } catch {
            // The gateway's standard confirmation still displays.
        }
    }

    // The existing scanner exposes its successful result in its open shadow root.
    const scanner = document.getElementById('agentready-scan');
    if (scanner?.shadowRoot) {
        const widget = scanner.shadowRoot;
        widget.addEventListener('submit', event => {
            if (event.target.matches('.f') && event.target.querySelector('.in')?.value.trim()) {
                track('scan_submitted');
            }
            if (event.target.matches('.lf') && event.target.querySelector('.cb')?.checked) {
                track('report_requested');
            }
        });
        widget.addEventListener('click', event => {
            if (event.target.closest('a.cta')) track('review_from_result');
        });
        const output = widget.querySelector('.out');
        if (output) {
            let result = output.querySelector('.lead');
            new MutationObserver(() => {
                const nextResult = output.querySelector('.lead');
                if (nextResult && nextResult !== result) track('scan_completed');
                result = nextResult;
            }).observe(output, { childList: true });
        }
    }
})();
