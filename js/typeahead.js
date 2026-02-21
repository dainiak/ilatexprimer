/**
 * Modern Vanilla JS Typeahead for Bootstrap 5.3
 * Replaces legacy twitter/typeahead.js and Bloodhound
 */
class Typeahead {
  constructor(inputElement, options = {}) {
    this.input = typeof inputElement === 'string' ? document.querySelector(inputElement) : inputElement;

    // Default Configuration
    this.options = Object.assign({
      source: [],          // Can be an array, or an async function: (query) => Promise<Array>
      minLength: 1,        // Minimum characters before triggering
      delay: 300,          // Debounce delay in ms
      limit: 5,            // Maximum number of results to show
      displayKey: 'name',  // Object key to display in the input upon selection
      renderItem: (item) => `<button class="dropdown-item" type="button">${item[this.options.displayKey] || item}</button>`,
      onSelect: (item) => {} // Callback when an item is chosen
    }, options);

    this.debounceTimeout = null;
    this.currentItems = [];
    this.activeIndex = -1;

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
    // Insert at end of wrapper so it doesn't interfere with input-group flex layout
    wrapper.appendChild(this.menu);

    // Turn off native browser autocomplete
    this.input.setAttribute('autocomplete', 'off');
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
      const lowerQuery = query.toLowerCase();
      results = this.options.source.filter(item => {
        const text = typeof item === 'object' ? item[this.options.displayKey] : item;
        return text.toLowerCase().includes(lowerQuery);
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

      element.addEventListener('click', () => this.selectItem(item));
      element.setAttribute('data-index', index);
      this.menu.appendChild(element);
    });

    this.openMenu();
  }

  selectItem(item) {
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
        e.preventDefault();
        if (this.activeIndex > -1) {
          items[this.activeIndex].click();
        }
        break;
      case 'Escape':
        this.closeMenu();
        break;
    }
  }

  highlightActive(items) {
    items.forEach(item => item.classList.remove('active'));
    if (this.activeIndex > -1) {
      items[this.activeIndex].classList.add('active');
    }
  }

  openMenu() {
    this.menu.classList.add('show');
  }

  closeMenu() {
    this.menu.classList.remove('show');
    this.activeIndex = -1;
  }
}
