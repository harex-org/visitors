(function () {
    'use strict';

    var search = document.getElementById('alumni-search');
    var clearSearch = document.getElementById('alumni-search-clear');
    var resetButton = document.getElementById('alumni-reset-filters');
    var noResultsReset = document.getElementById('alumni-no-results-reset');
    var list = document.getElementById('alumni-list');
    var cards = Array.prototype.slice.call(document.querySelectorAll('.alumni-card'));
    var visibleCount = document.getElementById('alumni-visible-count');
    var resultCount = document.getElementById('result-count');
    var description = document.getElementById('alumni-filter-description');
    var noResults = document.getElementById('alumni-no-results');
    var selectedRole = 'all';

    if (!search || !list || !cards.length) return;

    var synonymGroups = [
        ['ai', '人工知能', '機械学習', '深層学習', 'ディープラーニング'],
        ['vr', '仮想現実', 'バーチャルリアリティ'],
        ['ロボット', 'ロボ', '倒立振子', 'セグウェイ'],
        ['暗号', 'セキュリティ', '秘密計算'],
        ['防災', '災害', '減災'],
        ['画像', '視覚', 'イメージング', 'コンピュータビジョン'],
        ['虫', '昆虫', 'クワガタ'],
        ['歯', '歯科', '歯学', '歯医者'],
        ['農学', '生命', '生物'],
        ['数学', '数理'],
        ['哲学', '思想'],
        ['東京大学', '東大', 'とうだい', 'utokyo'],
        ['京都大学', '京大', 'きょうだい', 'kyotou'],
        ['大阪大学', '阪大', 'はんだい', 'osakau'],
        ['神戸大学', '神大', 'しんだい', 'kobeu'],
        ['兵庫県立大学', '兵庫県大', '県立大', 'けんりつだい'],
        ['岡山大学', '岡大', 'おかだい'],
        ['大阪医科薬科大学', '大阪医薬大', '大医薬'],
        ['理系', '科学', 'サイエンス'],
        ['文系', '人文科学', '社会科学'],
        ['医療', '医学', 'ヘルスケア'],
        ['工学', 'エンジニアリング'],
        ['環境', 'エコロジー'],
        ['ものづくり', 'メイカー']
    ];

    function normalize(value) {
        var normalized = String(value || '');
        if (normalized.normalize) normalized = normalized.normalize('NFKC');
        return normalized.toLocaleLowerCase('ja')
            .replace(/[ァ-ヶ]/g, function (character) {
                return String.fromCharCode(character.charCodeAt(0) - 0x60);
            })
            .replace(/[\s　・･\-‐‑–—―~〜～_＿:：/／,，、。!！?？「」『』（）()]+/g, '');
    }

    var normalizedSynonymGroups = synonymGroups.map(function (group) { return group.map(normalize); });

    function relatedTerms(token) {
        var terms = [token];
        normalizedSynonymGroups.forEach(function (group) {
            if (group.indexOf(token) !== -1) terms = terms.concat(group);
        });
        return terms.filter(function (term, index) { return terms.indexOf(term) === index; });
    }

    function editDistanceWithin(left, right, limit) {
        if (Math.abs(left.length - right.length) > limit) return false;
        var previous = [];
        var current = [];
        var i;
        var j;
        for (j = 0; j <= right.length; j += 1) previous[j] = j;
        for (i = 1; i <= left.length; i += 1) {
            current = [i];
            var rowMinimum = current[0];
            for (j = 1; j <= right.length; j += 1) {
                current[j] = Math.min(
                    current[j - 1] + 1,
                    previous[j] + 1,
                    previous[j - 1] + (left.charAt(i - 1) === right.charAt(j - 1) ? 0 : 1)
                );
                rowMinimum = Math.min(rowMinimum, current[j]);
            }
            if (rowMinimum > limit) return false;
            previous = current;
        }
        return previous[right.length] <= limit;
    }

    function fuzzyContains(text, token) {
        if (token.length < 3) return false;
        var limit = token.length >= 7 ? 2 : 1;
        var minimumLength = Math.max(1, token.length - limit);
        var maximumLength = Math.min(text.length, token.length + limit);
        var length;
        var start;
        for (length = minimumLength; length <= maximumLength; length += 1) {
            for (start = 0; start + length <= text.length; start += 1) {
                if (editDistanceWithin(token, text.slice(start, start + length), limit)) return true;
            }
        }
        return false;
    }

    function buildSearchIndex(value) {
        return {
            text: normalize(value),
            words: String(value || '').split(/[\s　,，、]+/).map(normalize).filter(Boolean)
        };
    }

    function containsExactTerm(searchIndex, term) {
        if (term.length <= 2) return searchIndex.words.indexOf(term) !== -1;
        return searchIndex.text.indexOf(term) !== -1;
    }

    function exactScore(searchIndex, token) {
        if (containsExactTerm(searchIndex, token)) return 140;
        var terms = relatedTerms(token);
        var index;
        for (index = 1; index < terms.length; index += 1) {
            if (containsExactTerm(searchIndex, terms[index])) return 100;
        }
        return 0;
    }

    function tokenScore(searchIndex, token, allowFuzzy) {
        var score = exactScore(searchIndex, token);
        if (score || !allowFuzzy) return score;
        if (fuzzyContains(searchIndex.text, token)) return 60;
        return relatedTerms(token).slice(1).some(function (term) {
            return fuzzyContains(searchIndex.text, term);
        }) ? 45 : 0;
    }

    cards.forEach(function (card) {
        card._searchIndex = buildSearchIndex(card.dataset.search + ' 白陵 白陵56期 56期 56期生 五十六期');
    });

    function update() {
        var queryTokens = search.value.split(/[\s　,，、]+/).map(normalize).filter(Boolean);
        var exactMatchesExist = queryTokens.map(function (token) {
            return cards.some(function (card) { return exactScore(card._searchIndex, token) > 0; });
        });
        var results = cards.map(function (card) {
            var roleMatches = selectedRole === 'all' || card.dataset.role.split(/\s+/).indexOf(selectedRole) !== -1;
            var score = 0;
            var queryMatches = queryTokens.every(function (token, tokenIndex) {
                var currentScore = tokenScore(card._searchIndex, token, !exactMatchesExist[tokenIndex]);
                score += currentScore;
                return currentScore > 0;
            });
            return { card: card, visible: roleMatches && queryMatches, score: score };
        });

        results.sort(function (left, right) {
            if (left.visible !== right.visible) return left.visible ? -1 : 1;
            if (queryTokens.length && right.score !== left.score) return right.score - left.score;
            if (left.card.dataset.sort < right.card.dataset.sort) return -1;
            if (left.card.dataset.sort > right.card.dataset.sort) return 1;
            return 0;
        });

        var shown = 0;
        results.forEach(function (result) {
            result.card.hidden = !result.visible;
            if (result.visible) shown += 1;
            list.appendChild(result.card);
        });

        visibleCount.textContent = shown;
        resultCount.textContent = shown;
        noResults.hidden = shown !== 0;
        clearSearch.classList.toggle('is-visible', search.value.length > 0);

        var labels = [];
        if (selectedRole !== 'all') labels.push(selectedRole);
        if (search.value.trim()) labels.push('「' + search.value.trim() + '」');
        description.textContent = labels.length ? labels.join('・') + 'で絞り込み中' : '五十音順で表示しています';
    }

    function reset() {
        search.value = '';
        selectedRole = 'all';
        Array.prototype.forEach.call(document.querySelectorAll('[data-filter-group="role"] .filter-chip'), function (chip) {
            var active = chip.dataset.filter === 'all';
            chip.classList.toggle('is-active', active);
            chip.setAttribute('aria-pressed', active ? 'true' : 'false');
        });
        update();
        search.focus();
    }

    document.querySelector('[data-filter-group="role"]').addEventListener('click', function (event) {
        var button = event.target.closest('.filter-chip');
        if (!button) return;
        selectedRole = button.dataset.filter;
        Array.prototype.forEach.call(this.querySelectorAll('.filter-chip'), function (chip) {
            var active = chip === button;
            chip.classList.toggle('is-active', active);
            chip.setAttribute('aria-pressed', active ? 'true' : 'false');
        });
        update();
    });

    search.addEventListener('input', update);
    clearSearch.addEventListener('click', function () { search.value = ''; update(); search.focus(); });
    resetButton.addEventListener('click', reset);
    noResultsReset.addEventListener('click', reset);
    update();
})();
