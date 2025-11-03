// The deployment pipeline should overwrite this value with the GitHub secret holding the wishlist password.
// Example: echo "window.__WISHLIST_PASSWORD__ = '${WISHLIST_PASSWORD}'" > config.js
window.__WISHLIST_PASSWORD__ = window.__WISHLIST_PASSWORD__ ?? '';
