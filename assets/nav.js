// スクロール後にヘッダーを縮小し、ページ上端へ戻ると元の大きさへ戻す。
(function () {
    var header = document.querySelector('.site-header');
    if (!header) return;

    var compact = false;
    var ticking = false;

    function updateHeader() {
        var scrollY = window.scrollY || document.documentElement.scrollTop || 0;
        // 開く位置と閉じる位置をずらし、ページ上端付近でのちらつきを防ぐ。
        var next = compact ? scrollY > 24 : scrollY > 112;

        if (next !== compact) {
            compact = next;
            document.body.classList.toggle('is-header-compact', compact);
        }
        ticking = false;
    }

    function requestUpdate() {
        if (ticking) return;
        ticking = true;
        window.requestAnimationFrame(updateHeader);
    }

    window.addEventListener('scroll', requestUpdate, { passive: true });
    updateHeader();
})();

// 上部ナビの現在地ハイライト。
// スクロール位置に応じて .on を付け替え、はみ出しているときは横スクロールで見える位置へ寄せる。
(function () {
    var nav = document.querySelector('.site-nav');
    if (!nav || !('IntersectionObserver' in window)) return;

    var map = {}, targets = [];
    Array.prototype.forEach.call(nav.querySelectorAll('a'), function (a) {
        var id = (a.getAttribute('href') || '').replace(/^#/, '');
        var el = id && document.getElementById(id);
        if (!el) return;
        map[id] = a;
        targets.push(el);
    });

    var current = null;
    var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) {
            if (!e.isIntersecting) return;
            var a = map[e.target.id];
            if (!a || a === current) return;
            if (current) current.classList.remove('on');
            a.classList.add('on');
            current = a;
            var box = a.getBoundingClientRect(), rail = nav.getBoundingClientRect();
            if (box.left < rail.left + 8 || box.right > rail.right - 8) {
                nav.scrollTo({ left: nav.scrollLeft + box.left - rail.left - 14, behavior: 'smooth' });
            }
        });
    }, { rootMargin: '-30% 0px -60% 0px' });

    targets.forEach(function (t) { io.observe(t); });
})();

// 図版と強調線を、それぞれページ内の初回表示時だけ再生する。
(function () {
    // 表示を検知してから再生を始めるまでの共通待ち時間（ミリ秒）。
    // この数値だけを変えれば、すべての図版と強調線へ一括で反映される。
    var REVEAL_DELAY_MS = 420;
    // 同時に見えたアンダーラインを、次のアンダーラインへ進める間隔（ミリ秒）。
    var UNDERLINE_STAGGER_MS = 1000;
    // 上下位置の差がこの範囲なら「同じ段」とみなし、左から右へ並べる。
    var UNDERLINE_ROW_TOLERANCE_PX = 12;
    var targets = document.querySelectorAll('[data-scroll-animation], .mark, .emphasis-marker');
    if (!targets.length || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    document.documentElement.classList.add('has-scroll-animations');

    function reveal(target, additionalDelayMs) {
        window.setTimeout(function () {
            target.classList.add('is-revealed');
        }, Math.max(0, REVEAL_DELAY_MS + (additionalDelayMs || 0)));
    }

    function isUnderline(target) {
        return target.classList.contains('mark') || target.classList.contains('emphasis-marker');
    }

    function revealInVisualOrder(visibleTargets) {
        var underlines = [];

        visibleTargets.forEach(function (target) {
            if (isUnderline(target)) {
                underlines.push({ target: target, box: target.getBoundingClientRect() });
            } else {
                reveal(target, 0);
            }
        });

        underlines.sort(function (a, b) {
            var topDifference = a.box.top - b.box.top;
            if (Math.abs(topDifference) > UNDERLINE_ROW_TOLERANCE_PX) return topDifference;
            return a.box.left - b.box.left;
        });

        underlines.forEach(function (item, index) {
            reveal(item.target, index * UNDERLINE_STAGGER_MS);
        });
    }

    if (!('IntersectionObserver' in window)) {
        Array.prototype.forEach.call(targets, function (target) { reveal(target, 0); });
        return;
    }

    var observer = new IntersectionObserver(function (entries, currentObserver) {
        var newlyVisible = [];

        entries.forEach(function (entry) {
            if (!entry.isIntersecting) return;
            newlyVisible.push(entry.target);
            currentObserver.unobserve(entry.target);
        });

        revealInVisualOrder(newlyVisible);
    }, { rootMargin: '0px 0px -8% 0px', threshold: .22 });

    Array.prototype.forEach.call(targets, function (target) { observer.observe(target); });
})();
