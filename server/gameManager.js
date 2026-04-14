// Placeholder game manager for future expansion. Keep game rules, scoring, and validation centralized here.

module.exports = {
  validateWord: function(w){
    return /^[a-z]{2,20}$/.test((w||'').toLowerCase());
  }
}
