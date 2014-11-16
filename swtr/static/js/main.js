(function(window) {

  window.swtr = window.swtr || {};

  // init the app..
  swtr.init = function() {
    this.sweets = new swtr.ImgAnnoSwts();
    this.appView = new AppView();
    this.who = 'Guest';

    this.app_router = new AppRouter();
    Backbone.history.start();
    this.app_router.start();

    $.ajaxSetup({
      xhrFields: {
        // we need this to send cookies to cross-domain requests
        withCredentials: true
      },
      //some browsers won't make cross-domain ajax until it is explicitly set
      crossDomain: true
    });
    this.handleOAuth();
    // handle if application state was saved previously..
    this.appView.handleState();
  };

  swtr.handleOAuth = function() {
    if(swtr.access_token) {
      $('#signinview').html('Signing you in..');
      $.ajax({
        url: swtr.swtstoreURL()+'/api/users/me?access_token='+
          swtr.access_token,
        success: function(data) {
          swtr.appView.userLoggedIn(data.username);
        },
        error: function() {
          $('#signinview').html('Error signing in! Please try again');
        }
      });
    }
  };

  var SweetsView = Backbone.View.extend({
    el: $('#sweet-list-wrapper'),
    events: {
      'click #sweet-cancel': 'cancelSweeting',
      'click #post-sweet': 'postSweets'
    },
    initialize: function(opts) {
      this.template = _.template($('#sweet-template').html());
      this.helpview = opts.helpview;
    },
    render: function() {
      console.log('sweetsview rendering');
      $('#sweet-list').html('<h4>These are your sweet annotations!</h4>');
      _.each(this.collection.models, function(swt) {
        if(swt.has('id')) {
          return false;
        }
        $('#sweet-list').append(this.template({
          who: swt.get('who'),
          what: swt.get('what'),
          where: swt.get('where'),
          how: JSON.stringify(this.getHumanReadableParts(swt.get('how')))
        }));
      }, this);
      this.$el.fadeIn(300);
    },
    getHumanReadableParts: function(how) {
      var human_readable_json = {};
      if(how.comment) {
        human_readable_json['comment'] = how.comment;
      }
      if(how.title) {
        human_readable_json['title'] = how.title;
      }
      if(how.tags) {
        human_readable_json['tags'] = how.tags;
      }
      if(how.link) {
        human_readable_json['link'] = how.link;
      }
      if(how.quote) {
        human_readable_json['quote'] = how.quote;
      }
      if(how.text) {
        human_readable_json['text'] = how.text;
      }
      return human_readable_json;
    },
    cancelSweeting: function() {
      this.removeSwtsNotPosted();
      this.cleanUp();
    },
    removeSwtsNotPosted: function() {
      var notPosted = this.collection.filter(function(model) {
        return !model.has('id');
      });
      this.collection.remove(notPosted);
    },
    postSweets: function(event) {
      event.preventDefault();
      console.log('posting swts');
      var appView = swtr.appView;
      var self = this;
      this.helpview.step(5);
      appView.$overlay.show();
      try {
        this.collection.post({
          success: function(collection, response) {
            console.log('updated', collection, response);
            // update img anno view if exists..
            if(anno && swtr.imgAnnoView) {
              anno.reset();
              anno.makeAnnotatable($("#annotatable-img")[0]);
              swtr.imgAnnoView.renderWith();
            }

            swtr.sweets.add(collection);
            //HACK! somehow updated models from the server don't get merged
            //with existing models, they duplicate. this is probably because of
            //some attribute change that backbone is not able to detect the
            //models are same. FIX for now is to update the collection with
            //updated models from the server and delete the older ones(w/o
            //id's)..
            self.removeSwtsNotPosted();

            console.log('new swtr coll', swtr.sweets);
            appView.$overlay.hide();
            self.helpview.step(6);
            self.trigger('postedSweets');
          },
          error: function(jqxhr, error, text) {
            console.log(jqxhr, error, text);
            appView.$overlay.hide();
            self.helpview.step(10);
          }
        });
      } catch(e) {
        if(e.message == 'Access Token is required to sweet') {
          appView.$overlay.hide();
          self.helpview.step(9);
        }
      }
      this.cleanUp();
      return false;
    },
    cleanUp: function() {
      //console.log('cleaning up');
      this.$el.hide();
    }
  });

  var AppView = Backbone.View.extend({
    el: $('body'),
    events: {
      'click #sign-in': 'signIn'
      //'mouseup .annotorious-editor-button-save': 'addnew_anno'
    },
    initialize: function() {
      // initialize components
      this.source = 'none';
      //this.helpview = new HelpView();
      // cache jquery selected DOM elements which are used frequently
      this.$overlay = $('#app-overlay');

      //this.helpview.step(1);
      // initialize the oauth stuff
      this.oauth = new Oauth({
        app_id: swtr.app_id,
        endpoint: swtr.swtstoreURL() + swtr.endpoints.auth,
        redirect_uri: swtr.oauth_redirect_uri,
        scopes: 'email,sweet'
      });
    },
    signIn: function(event) {
      event.preventDefault();
      // if user is Guest.. sign them in..
      if(swtr.who === 'Guest') {
        // check if user has loaded any URL to annotate
        if(swtr.app_router.mounted_component.loaded_url) {
          this.saveState();
        }
        debugger;
        console.log('oauth.authorize');
        this.oauth.authorize();
      }
      return false;
    },
    // saves the state of the application in localStorage
    saveState: function() {
      // get the current state
      var current_state = {};
      var unpublished_annotations = swtr.sweets.getNew().map(function(swt) {
        return {'what': swt.get('what'), 'how': swt.get('how')};
      });
      // the loaded URL
      current_state['loaded_url'] =
        swtr.app_router.mounted_component.loaded_url;
      // unsaved annotations that are there
      current_state['unpublished_annotations'] = unpublished_annotations;
      // checkbox to show annotation boxes
      current_state['show_annotated_areas'] =
        $('#toggle-anno-areas').is(':checked');
      // timestamp
      current_state['timestamp'] = Date.now();

      console.log('current state', current_state);
      console.log('saving state..');
      if(window.localStorage) {
        localStorage.setItem('swtr-state', JSON.stringify(current_state));
      }
      else {
        //TODO: handle fallback for localStorage
      }
    },
    // handle state when the application is loaded; check if the application
    // has previous state saved in the browser..
    handleState: function() {
      var saved_state = JSON.parse(localStorage.getItem('swtr-state'));
      if(!saved_state) {
        return;
      }
      console.log('found previous state');
      console.log('swtr-state', saved_state);

      var type = (saved_state.what === 'img-anno') ? 'image' : 'text';
      console.log('type', type);
      swtr.app_router.loadPlayArea(saved_state.loaded_url, type);
      localStorage.removeItem('swtr-state');
    },
    userLoggedIn: function(username) {
      swtr.who = username;
      var text = 'Signed in as <b><u>' + swtr.who + '</u></b>';
      $('#signinview').html(text);
    },
    userLoggedOut: function() {
      swtr.who = 'Guest';
      $('#signinview').html('Logged out');
    }
  });

  var DummyView = Backbone.View.extend({
    intialize: function() {
      this.render();
    },
    render: function() {
      $('#swtr-root').append('dummy view');
    },
    destroy: function() {
      this.remove();
      this.undelegateEvents();
    }
  });

  // utilities and helper functions to go here
  swtr.utils = {
    linkify: function(link) {
      if(link.match('http')) {
        return link;
      }
      else {
        return 'http://' + link;
      }
    }
  };

  var AppRouter = Backbone.Router.extend({
    routes: {
      'home': 'home',
      'linked-data': 'linkedData',
      'play': 'play'
      // 'search': 'search'
    },
    components: {
      'linked-data': swtr.LDView,
      'play': swtr.PlayAreaView
      //'search': swtr.SearchView
    },
    home: function() {
      this.hideAll();
      this.show('home-page');
    },
    linkedData: function() {
      this.hideAll();
      this.show('linked-data-page');
    },
    play: function() {
      this.hideAll();
      this.show('play-page');
    },
    search: function() {
      this.hideAll();
      this.show('search-page');
    },
    hideAll: function() {
      $('.page').hide();
    },
    show: function(id) {
      if(this.mounted_component) {
        this.mounted_component.destroy();
      }
      if(id !== 'home-page') {
        var component = id.split('-page')[0];
        this.mounted_component = new this.components[component];
      }
      $('#' + id).show();
      this.highlight(id);
      //console.log('shown', id);
    },
    highlight: function(id) {
      $('#swtr-navbar-collapse li').removeClass('active');
      var href = id.split('-page')[0];
      var selector = '#swtr-navbar-collapse a[href="#/' + href + '"]';
      $(selector).parent('li').addClass('active');
    },
    start: function() {
      var fragment = window.location.hash.split('#')[1];
      if(!fragment) {
        this.navigate('home', {trigger: true});
        return;
      }
      var route = fragment.split('/')[1];
      if(_.indexOf(_.keys(this.routes), route) > -1) {
        this.navigate(fragment, {trigger: true});
      }
    },
    loadPlayArea: function(url, type) {
      this.navigate('play', {trigger: true});
      this.mounted_component.loadURL(url, type);
    }
  });

  // NOT used right now. DO NOT REMOVE. maybe needed later.
  /*var FilterView = Backbone.View.extend({
    el: $('#filter-div'),
    events: {
      'click #filter-user-div input': 'filter',
      'click #filter-tags-div input': 'filter'
    },
    initialize: function() {
      this.filter_users_template = _.template($('#filter-users').html());
      this.filter_tags_template = _.template($('#filter-tags').html());
      this.render();
    },
    render: function() {
      //console.log(this.collection);
      // pluck uniq authors of sweets
      var authors = _.uniq(this.collection.pluck('who'));
      // render them as filter controls
      _.each(authors, function(author) {
        $('#filter-user-div').append(this.filter_users_template({
          who: author
        }));
      }, this);

      // pluck uniq tags of sweets
      var tags = _.chain(this.collection.pluck('how')).pluck('tags').flatten().
        uniq().value();

      // render them as filter controls
      _.each(tags, function(tag) {
        if(tag) {
          $('#filter-tags-div').append(this.filter_tags_template({
            tag: tag
          }));
        }
      }, this);

      //this.delegateEvents();
    },
    filter: function(event) {
      // get id of div - parent to parent to the clicked input
      var target_id = $(event.currentTarget).parent().parent().attr('id');
      // find out user/tag div
      var which = target_id.split('-')[1];

      var selected = [];
      $('#'+target_id + ' input:checked').each(function() {
        selected.push($(this).attr('name'));
      });

      if(which === 'user') {
        this.filterUsers(selected);
      }
      else if(which === 'tags') {
        this.filterTags(selected);
      }
    },
    filterUsers: function(users) {
      if(!users.length) {
        return;
      }
      var filtered_swts = this.collection.filter(function(model) {
        if(_.indexOf(users, model.get('who')) > -1) {
          return model;
        }
      });
      if(filtered_swts.length) {
        anno.removeAll();
        _.each(filtered_swts, function(swt) {
          anno.addAnnotation(swt.get('how'));
        });
      }
    },
    filterTags: function(tags) {
      if(!tags.length) {
        return;
      }
      var filtered_swts = this.collection.filter(function(model) {
        //TODO: find a better way of doing this..
        var flag = false;
        _.each(model.get('how').tags, function(tag) {
          if(_.indexOf(tags, tag) > -1) {
            flag = true;
          }
        });
        if(flag === true) {
          return model;
        }
      });
      if(filtered_swts.length) {
        anno.removeAll();
        _.each(filtered_swts, function(swt) {
          anno.addAnnotation(swt.get('how'));
        });
      }
    }
  });*/

  swtr.SweetsView = SweetsView;

  window.onload = function() {
    swtr.init();
  };
})(window);
