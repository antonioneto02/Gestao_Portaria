(function() {
  function handleDropdownTouch($dropdown) {
    let touchMoved = false;
    $dropdown.on('touchstart', '.dropdown-item', function(e) {
      touchMoved = false;
    });
    $dropdown.on('touchmove', '.dropdown-item', function(e) {
      touchMoved = true;
    });
    $dropdown.on('touchend', '.dropdown-item', function(e) {
      if (!touchMoved) {
        if (!(this.tagName === 'A' && this.getAttribute('href') && this.getAttribute('href') !== '#')) {
          e.preventDefault();
        }
        $(this).trigger('dropdown:select');
      }
    });
    $dropdown.on('mousedown', '.dropdown-item', function(e) {
      if (e.which !== 1) return;
      if (!(this.tagName === 'A' && this.getAttribute('href') && this.getAttribute('href') !== '#')) {
        e.preventDefault();
      }
      $(this).trigger('dropdown:select');
    });
  }

  window.initGlobalDropdownTouchHandler = function(dropdownSelector) {
    $(dropdownSelector).each(function() {
      handleDropdownTouch($(this));
    });
  };
})();
