(function(window) {

  var Oauth = function(options) {
    // all necessary params provided?
    if(!options.hasOwnProperty('app_id') ||
       !options.hasOwnProperty('redirect_uri') ||
       !options.hasOwnProperty('scopes') ||
       !options.hasOwnProperty('endpoint')) {

      throw new Error('All of the - app_id, redirect_uri, scopes'+
                         ', endpoint - parameters must be provided');
      return;
    }
    // check for string types
    for(key in options) {
      if(typeof options[key] !== 'string') {
        throw new Error('All parameters should be of string type');
        return false;
      }
    }

    this.app_id = options.app_id;
    this.redirect_uri = options.redirect_uri;
    this.scopes = options.scopes.split(',');
    this.endpoint = options.endpoint;
    // if scopes returns empty array - that means scopes was not provided in
    // correct format - i.e comma seperated values
    if(!this.scopes.length) {
      throw new Error('`scopes` paramater must be a string of comma seperated scopes');
      return;
    }

    return this;
  };

  // callback function to click handler
  Oauth.prototype.login = function(event) {
    event.preventDefault();
    this.authorize();
  };

  Oauth.prototype.authorize = function() {
    var qs = 'scope=' + this.scopes.join('+') + '&' +
             'redirect_uri=' + encodeURIComponent(this.redirect_uri) + '&' +
             'response_type=code&'+
             'client_id=' + this.app_id;

    window.location.href = this.endpoint + '?' + qs;
  };

  window.Oauth = Oauth;
})(window);
