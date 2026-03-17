/**
 * Nominatim Address Autocomplete
 * Uses OpenStreetMap Nominatim API for free address lookups
 * Rate limit: 1 request/second (respect fair use policy)
 */

(function() {
  let searchTimeout = null;
  let lastRequestTime = 0;
  const MIN_REQUEST_INTERVAL = 1000; // 1 second between requests

  /**
   * Debounced address search
   */
  function searchAddress(query, countryCode) {
    clearTimeout(searchTimeout);

    if (query.length < 3) {
      hideSuggestions();
      return;
    }

    searchTimeout = setTimeout(function() {
      const now = Date.now();
      const timeSinceLastRequest = now - lastRequestTime;

      // Respect 1 request/second rate limit
      if (timeSinceLastRequest < MIN_REQUEST_INTERVAL) {
        setTimeout(function() {
          performSearch(query, countryCode);
        }, MIN_REQUEST_INTERVAL - timeSinceLastRequest);
      } else {
        performSearch(query, countryCode);
      }
    }, 500); // Wait 500ms after user stops typing
  }

  /**
   * Perform actual API request to Nominatim
   */
  function performSearch(query, countryCode) {
    lastRequestTime = Date.now();

    const url = 'https://nominatim.openstreetmap.org/search?' +
      'q=' + encodeURIComponent(query) +
      '&format=json' +
      '&addressdetails=1' +
      '&limit=5' +
      '&countrycodes=' + countryCode.toLowerCase();

    fetch(url, {
      headers: {
        'Accept': 'application/json'
      }
    })
    .then(function(response) {
      return response.json();
    })
    .then(function(data) {
      showSuggestions(data);
    })
    .catch(function(error) {
      console.error('Address autocomplete error:', error);
      hideSuggestions();
    });
  }

  /**
   * Display address suggestions dropdown
   */
  function showSuggestions(results) {
    const addressInput = document.getElementById('address');
    const suggestionsDiv = document.getElementById('address-suggestions');

    if (!results || results.length === 0) {
      hideSuggestions();
      return;
    }

    let html = '<ul class="list-group">';
    results.forEach(function(result, index) {
      const addr = result.address || {};
      const displayName = result.display_name || '';

      html += '<li class="list-group-item address-suggestion-item" data-index="' + index + '">' +
        '<div>' + displayName + '</div>' +
        '</li>';
    });
    html += '</ul>';

    suggestionsDiv.innerHTML = html;
    suggestionsDiv.style.display = 'block';

    // Add click handlers
    const items = suggestionsDiv.querySelectorAll('.address-suggestion-item');
    items.forEach(function(item) {
      item.addEventListener('click', function() {
        const index = parseInt(this.getAttribute('data-index'));
        selectAddress(results[index]);
      });
    });
  }

  /**
   * Hide suggestions dropdown
   */
  function hideSuggestions() {
    const suggestionsDiv = document.getElementById('address-suggestions');
    if (suggestionsDiv) {
      suggestionsDiv.style.display = 'none';
      suggestionsDiv.innerHTML = '';
    }
  }

  /**
   * User selected an address from suggestions
   */
  function selectAddress(result) {
    const addr = result.address || {};

    // Build street address from components
    let streetAddress = '';
    if (addr.house_number) streetAddress += addr.house_number + ' ';
    if (addr.road) streetAddress += addr.road;

    // Populate form fields
    document.getElementById('address').value = streetAddress || result.display_name;
    document.getElementById('city').value = addr.city || addr.town || addr.village || '';
    document.getElementById('state').value = addr.state || '';
    document.getElementById('postal_code').value = addr.postcode || '';

    hideSuggestions();

    // Trigger validation for auto-filled fields
    $('form').data('bootstrapValidator').revalidateField('address');
    $('form').data('bootstrapValidator').revalidateField('city');
    $('form').data('bootstrapValidator').revalidateField('state');
    $('form').data('bootstrapValidator').revalidateField('postal_code');
  }

  /**
   * Initialize address autocomplete when DOM is ready
   */
  window.initAddressAutocomplete = function() {
    const addressInput = document.getElementById('address');
    const countrySelect = document.getElementById('country');

    if (!addressInput) return;

    // Create suggestions container if it doesn't exist
    let suggestionsDiv = document.getElementById('address-suggestions');
    if (!suggestionsDiv) {
      suggestionsDiv = document.createElement('div');
      suggestionsDiv.id = 'address-suggestions';
      suggestionsDiv.className = 'address-suggestions';
      suggestionsDiv.style.display = 'none';
      addressInput.parentNode.appendChild(suggestionsDiv);
    }

    // Listen for address input
    addressInput.addEventListener('input', function() {
      const countryCode = countrySelect ? countrySelect.value : 'us';
      searchAddress(this.value, countryCode);
    });

    // Hide suggestions when clicking outside
    document.addEventListener('click', function(e) {
      if (e.target !== addressInput && !suggestionsDiv.contains(e.target)) {
        hideSuggestions();
      }
    });
  };
})();
