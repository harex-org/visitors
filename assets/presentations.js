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

    function normalize(value) {
        return (value || '').toLocaleLowerCase('ja').replace(/[\s　・･\-―~〜～]+/g, '');
    }

    function update() {
        var queryTokens = search.value.toLocaleLowerCase('ja').split(/[\s　]+/).map(normalize).filter(Boolean);
        var shown = 0;

        cards.forEach(function (card) {
            var matchesType = selected.type === 'all' || card.dataset.type === selected.type;
            var matchesField = selected.field === 'all' || card.dataset.field === selected.field;
            var searchableText = normalize(card.dataset.search);
            var matchesQuery = queryTokens.every(function (token) { return searchableText.indexOf(token) !== -1; });
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
