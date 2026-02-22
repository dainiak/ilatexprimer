/**
 * Modern Vanilla JS Typeahead for Bootstrap 5.3
 * Replaces legacy twitter/typeahead.js and Bloodhound
 */
class Typeahead {
    constructor(inputElement, options = {}) {
        this.input = typeof inputElement === 'string' ? document.querySelector(inputElement) : inputElement;

        // Default Configuration
        this.options = Object.assign(
            {
                source: [], // Can be an array, or an async function: (query) => Promise<Array>
                minLength: 1, // Minimum characters before triggering
                delay: 300, // Debounce delay in ms
                limit: 5, // Maximum number of results to show
                displayKey: 'name', // Object key to display in the input upon selection
                renderItem: (item) => {
                    const text = typeof item === 'object' ? item[this.options.displayKey] : String(item);
                    return `<button class="dropdown-item" type="button">${this.highlightMatches(text)}</button>`;
                },
                onSelect: () => {}, // Callback when an item is chosen
            },
            options,
        );

        this.debounceTimeout = null;
        this.currentItems = [];
        this.activeIndex = -1;
        this.queryTokens = [];
        this.menuId = `typeahead-listbox-${Date.now()}`;

        this.initUI();
        this.bindEvents();
    }

    initUI() {
        // Ensure the wrapper is relative for Bootstrap absolute dropdown positioning
        const wrapper = this.input.parentElement;
        if (!wrapper.classList.contains('position-relative')) {
            wrapper.classList.add('position-relative');
        }

        // Create the Bootstrap 5 dropdown menu
        this.menu = document.createElement('div');
        this.menu.classList.add('dropdown-menu', 'w-100');
        this.menu.style.top = '100%';
        this.menu.setAttribute('role', 'listbox');
        this.menu.id = this.menuId;
        // Insert at end of wrapper so it doesn't interfere with input-group flex layout
        wrapper.appendChild(this.menu);

        // ARIA combobox attributes on input
        this.input.setAttribute('autocomplete', 'off');
        this.input.setAttribute('role', 'combobox');
        this.input.setAttribute('aria-expanded', 'false');
        this.input.setAttribute('aria-autocomplete', 'list');
        this.input.setAttribute('aria-owns', this.menuId);
    }

    bindEvents() {
        this.input.addEventListener('input', (e) => this.onInput(e.target.value));
        this.input.addEventListener('keydown', (e) => this.onKeydown(e));

        // Close menu when clicking outside
        document.addEventListener('click', (e) => {
            if (!this.input.contains(e.target) && !this.menu.contains(e.target)) {
                this.closeMenu();
            }
        });
    }

    onInput(query) {
        clearTimeout(this.debounceTimeout);

        if (query.length < this.options.minLength) {
            this.closeMenu();
            return;
        }

        this.debounceTimeout = setTimeout(() => {
            this.fetchData(query);
        }, this.options.delay);
    }

    async fetchData(query) {
        let results = [];

        // Handle Function / Remote Fetch (Like Bloodhound)
        if (typeof this.options.source === 'function') {
            try {
                results = await this.options.source(query);
            } catch (error) {
                console.error('Typeahead fetch error:', error);
                results = [];
            }
        }
        // Handle static Array (Local Data)
        else if (Array.isArray(this.options.source)) {
            this.queryTokens = query
                .toLowerCase()
                .split(/\s+/)
                .filter((t) => t.length > 0);
            if (this.queryTokens.length === 0) {
                this.closeMenu();
                return;
            }
            results = this.options.source.filter((item) => {
                const text = (typeof item === 'object' ? item[this.options.displayKey] : String(item)).toLowerCase();
                return this.queryTokens.every((token) => text.includes(token));
            });
        }

        // Apply limit
        this.currentItems = results.slice(0, this.options.limit);
        this.renderMenu();
    }

    renderMenu() {
        this.menu.innerHTML = '';
        this.activeIndex = -1;

        if (this.currentItems.length === 0) {
            this.closeMenu();
            return;
        }

        this.currentItems.forEach((item, index) => {
            // Create a temporary wrapper to parse the HTML string from renderItem
            const div = document.createElement('div');
            div.innerHTML = this.options.renderItem(item).trim();
            const element = div.firstChild;

            element.addEventListener('mousedown', (e) => e.preventDefault());
            element.addEventListener('click', () => this.selectItem(item));
            element.setAttribute('data-index', index);
            element.setAttribute('role', 'option');
            element.id = `${this.menuId}-option-${index}`;
            this.menu.appendChild(element);
        });

        this.openMenu();
    }

    selectItem(item) {
        clearTimeout(this.debounceTimeout);
        const val = typeof item === 'object' ? item[this.options.displayKey] : item;
        this.input.value = val;
        this.closeMenu();
        this.options.onSelect(item);
    }

    onKeydown(e) {
        if (!this.menu.classList.contains('show')) return;

        const items = this.menu.querySelectorAll('.dropdown-item');
        if (items.length === 0) return;

        switch (e.key) {
            case 'ArrowDown':
                e.preventDefault();
                this.activeIndex = (this.activeIndex + 1) % items.length;
                this.highlightActive(items);
                break;
            case 'ArrowUp':
                e.preventDefault();
                this.activeIndex = this.activeIndex <= 0 ? items.length - 1 : this.activeIndex - 1;
                this.highlightActive(items);
                break;
            case 'Enter':
                if (this.activeIndex > -1) {
                    e.preventDefault();
                    items[this.activeIndex].click();
                } else {
                    this.closeMenu();
                }
                break;
            case 'Escape':
                this.closeMenu();
                break;
        }
    }

    highlightActive(items) {
        items.forEach((item) => {
            item.classList.remove('active');
            item.setAttribute('aria-selected', 'false');
        });
        if (this.activeIndex > -1) {
            items[this.activeIndex].classList.add('active');
            items[this.activeIndex].setAttribute('aria-selected', 'true');
            this.input.setAttribute('aria-activedescendant', items[this.activeIndex].id);
        } else {
            this.input.removeAttribute('aria-activedescendant');
        }
    }

    escapeHtml(text) {
        return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }

    highlightMatches(text) {
        if (!this.queryTokens.length) return this.escapeHtml(text);

        const lower = text.toLowerCase();
        const ranges = [];
        for (const token of this.queryTokens) {
            let pos = 0;
            while ((pos = lower.indexOf(token, pos)) !== -1) {
                ranges.push([pos, pos + token.length]);
                pos += 1;
            }
        }
        if (ranges.length === 0) return this.escapeHtml(text);

        // Sort and merge overlapping ranges
        ranges.sort((a, b) => a[0] - b[0] || b[1] - a[1]);
        const merged = [ranges[0].slice()];
        for (let i = 1; i < ranges.length; i++) {
            const last = merged[merged.length - 1];
            if (ranges[i][0] <= last[1]) {
                last[1] = Math.max(last[1], ranges[i][1]);
            } else {
                merged.push(ranges[i].slice());
            }
        }

        let result = '';
        let prev = 0;
        for (const [start, end] of merged) {
            result += this.escapeHtml(text.slice(prev, start));
            result += '<strong>' + this.escapeHtml(text.slice(start, end)) + '</strong>';
            prev = end;
        }
        result += this.escapeHtml(text.slice(prev));
        return result;
    }

    openMenu() {
        this.menu.classList.add('show');
        this.input.setAttribute('aria-expanded', 'true');
    }

    closeMenu() {
        this.menu.classList.remove('show');
        this.activeIndex = -1;
        this.input.setAttribute('aria-expanded', 'false');
        this.input.removeAttribute('aria-activedescendant');
    }
}

export default Typeahead;
