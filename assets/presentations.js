(function () {
    'use strict';

    var search = document.getElementById('presentation-search');
    var clearSearch = document.getElementById('search-clear');
    var resetButton = document.getElementById('reset-filters');
    var noResultsReset = document.getElementById('no-results-reset');
    var cards = Array.prototype.slice.call(document.querySelectorAll('.presentation-card'));
    var visibleCount = document.getElementById('visible-count');
    var resultCount = document.getElementById('result-count');
    var description = document.getElementById('filter-description');
    var noResults = document.getElementById('no-results');
    var selected = { type: 'all', field: 'all' };

    if (!search || !cards.length) return;

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

    var normalizedSynonymGroups = synonymGroups.map(function (group) {
        return group.map(normalize);
    });

    function relatedTerms(token) {
        var terms = [token];
        normalizedSynonymGroups.forEach(function (group) {
            if (group.indexOf(token) !== -1) terms = terms.concat(group);
        });
        return terms.filter(function (term, index) { return terms.indexOf(term) === index; });
    }

    // 上限を超えた時点で計算を打ち切る、検索用の編集距離。
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
        // 「京大」が「東京大学」の内部にも現れるような、短い語の誤判定を防ぐ。
        if (term.length <= 2) return searchIndex.words.indexOf(term) !== -1;
        return searchIndex.text.indexOf(term) !== -1;
    }

    function matchesExactly(searchIndex, token) {
        return relatedTerms(token).some(function (term) {
            return containsExactTerm(searchIndex, term);
        });
    }

    function matchesSearch(searchIndex, token, allowFuzzy) {
        if (matchesExactly(searchIndex, token)) return true;
        if (!allowFuzzy) return false;
        return relatedTerms(token).some(function (term) {
            return fuzzyContains(searchIndex.text, term);
        });
    }

    function update() {
        var queryTokens = search.value.split(/[\s　,，、]+/).map(normalize).filter(Boolean);
        var searchableIndexes = cards.map(function (card) { return buildSearchIndex(card.dataset.search); });
        var exactMatchesExist = queryTokens.map(function (token) {
            return searchableIndexes.some(function (searchIndex) {
                return matchesExactly(searchIndex, token);
            });
        });
        var shown = 0;

        cards.forEach(function (card, cardIndex) {
            var matchesType = selected.type === 'all' || card.dataset.type === selected.type;
            var matchesField = selected.field === 'all' || card.dataset.field === selected.field;
            var searchIndex = searchableIndexes[cardIndex];
            var matchesQuery = queryTokens.every(function (token, tokenIndex) {
                return matchesSearch(searchIndex, token, !exactMatchesExist[tokenIndex]);
            });
            var visible = matchesType && matchesField && matchesQuery;
            card.hidden = !visible;
            if (visible) shown += 1;
        });

        visibleCount.textContent = shown;
        resultCount.textContent = shown;
        noResults.hidden = shown !== 0;
        clearSearch.classList.toggle('is-visible', search.value.length > 0);

        var labels = [];
        if (selected.type !== 'all') labels.push(selected.type);
        if (selected.field !== 'all') labels.push(selected.field);
        if (search.value.trim()) labels.push('「' + search.value.trim() + '」');
        description.textContent = labels.length ? labels.join('・') + 'で絞り込み中' : 'すべて表示しています';
    }

    function selectFilter(group, value, button) {
        selected[group] = value;
        var parent = button.closest('.filter-group');
        Array.prototype.forEach.call(parent.querySelectorAll('.filter-chip'), function (chip) {
            var active = chip === button;
            chip.classList.toggle('is-active', active);
            chip.setAttribute('aria-pressed', active ? 'true' : 'false');
        });
        update();
    }

    function reset() {
        search.value = '';
        selected.type = 'all';
        selected.field = 'all';
        Array.prototype.forEach.call(document.querySelectorAll('.filter-group'), function (group) {
            Array.prototype.forEach.call(group.querySelectorAll('.filter-chip'), function (chip) {
                var active = chip.dataset.filter === 'all';
                chip.classList.toggle('is-active', active);
                chip.setAttribute('aria-pressed', active ? 'true' : 'false');
            });
        });
        update();
        search.focus();
    }

    Array.prototype.forEach.call(document.querySelectorAll('.filter-group'), function (group) {
        group.addEventListener('click', function (event) {
            var button = event.target.closest('.filter-chip');
            if (!button) return;
            selectFilter(group.dataset.filterGroup, button.dataset.filter, button);
        });
    });

    search.addEventListener('input', update);
    clearSearch.addEventListener('click', function () { search.value = ''; update(); search.focus(); });
    resetButton.addEventListener('click', reset);
    noResultsReset.addEventListener('click', reset);
    update();
})();
