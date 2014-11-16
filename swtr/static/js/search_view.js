(function(window) {
  window.swtr = window.swtr || {};

  var SearchView = Backbone.View.extend({
    id: 'search-page-container',
    events: {
      'click #search-user-input-submit': 'userInputSubmit'
    },
    initialize: function() {
      this.template = _.template($('#search-page-template').html());
      this.helpview = new HelpView();
      this.render();
      this.helpview.step(11);
    },
    render: function() {
      this.$el.html(this.template());
      $('#search-page').html(this.$el);
    },
    userInputSubmit: function(event) {
      event.preventDefault();
      var input = $('#search-user-input').val();
      this.loadSearch(input);
      return false;
    },
    loadSearch: function(input) {
      var self = this;
      this.$el.append('<div id="ocd-view"></div>');
      $('#ocd-view').html('<h4 style="text-align: center;">Loading..</h4>');
      $.ajax({
        type: 'GET',
        url: '/search/ocd',
        data: {query: input},
        success: function(data) {
          self.ocd_view = new OCDView({
            el: $('#ocd-view'),
            query: input,
            data: data,
            model: data.hits.hits
          });
        }
      });
    },
    destroy: function() {
      this.helpview.remove();
      this.remove();
    }
  });

  var OCDView = Backbone.View.extend({
    el: $('#ocd-view'),
    events: {
      'click .ocd-item a': 'onImgClick',
      'click .ocd-item-cover .close': 'onCoverCloseClick',
      'click .ocd-item-mark': 'onMarkClick',
        'click .pager li': 'onPagerClick'
    },
    initialize: function(opts) {
      this.data = opts.data || {};
      this.query = opts.query || '';
      this.size = 9; // num of items per page
      this.page = 0;
      this.item_template = _.template($('#ocd-item-template').html());
      this.base_template = _.template($('#ocd-view-base-template').html());
      this.cover_template = _.template($('#ocd-item-cover-template').html());
      this.render();
    },
    render: function() {
      var $row_el;
      this.$el.html('');
      if(!this.model.length) {
        this.$el.html('No results could be found from your query.');
        return;
      }
      this.$el.html(this.base_template());
      var $el = $('#ocd-results');
      _.each(this.model, function(item, idx) {
        // put every 3 items in a row
        if(idx % 3 === 0) {
          $row_el = $('<div class="row"></div>');
          $el.append($row_el);
        }
        $row_el.append(this.item_template({
          title: item._source.title,
          media_url: item._source.media_urls[0].url,
          authors: item._source.authors,
          description: item._source.description
        }));
      }, this);
      this.resolveOCDURLs();
      this.appendTotal();
    },
    appendTotal: function() {
      $('#ocd-total-results').html(this.data.hits.total + ' results found.');
    },
      // resolve the OCD media URLs
    resolveOCDURLs: function() {
      var self = this;
      $('.ocd-item').each(function(idx, elem) {
        var temp_arr = self.model[idx]._source.media_urls[0].url.split('/');
        var media_hash = temp_arr[temp_arr.length - 1];
        $.get('/resolve-ocd-media', {hash: media_hash}, function(resp) {
          $(elem).find('img').attr('src', resp.url);
        });
      });
    },
    rerender: function(data) {
      this.data = data;
      this.model = data.hits.hits;
      this.render();
    },
    onPagerClick: function(event) {
      event.preventDefault();
      var elem = $(event.currentTarget);
      var self = this;
      if(elem.hasClass('next')) {
        if((this.page + 1) * this.size >= this.data.hits.total) {
          console.log('no next page to go to');
          return false;
        }
        console.log('clicked next');
        this.search({
          query: this.query,
          from: (this.page + 1) * this.size
        }, function(resp) {
          console.log('reached next page');
          self.page = self.page + 1;
          self.rerender(resp);
        });
      }
      else if (elem.hasClass('previous')) {
        if(this.page <= 0) {
          console.log('no prev page to go to');
          return false;
        }
        console.log('clicked prev');
        this.search({
          query: this.query,
          from: (this.page - 1) * this.size
        }, function(resp) {
          console.log('reached prev page');
          self.page = self.page - 1;
          self.rerender(resp);
        });
      }
      return false;
    },
    onImgClick: function(event) {
      //console.log('onImgClick');
      event.preventDefault();
      // TODO: init the image anno
      this.drawCoverOnImg(event);
      //swtr.appView.loadURL(url, 'image');
      return false;
    },
    drawCoverOnImg: function(event) {
      //console.log('highlightImg');
      var elem = $(event.currentTarget).parent().parent();
      // if .ocd-item-cover exists return
      if(elem.find('.ocd-item-cover').length) {
        $(elem.find('.ocd-item-cover')[0]).slideDown();
        return;
      }
      //console.log(elem);
      elem.prepend(this.cover_template());
      $(elem.find('.ocd-item-cover')[0]).slideDown();
    },
    onCoverCloseClick: function(event) {
      var elem = $(event.currentTarget).parent();
      elem.slideUp();
    },
    onMarkClick: function(event) {
      var url = $(event.currentTarget).parent().parent().
        find('img').attr('src');
      //TODO: load the image in the play area/workbench
      //console.log('load image anno', url);
      swtr.app_router.loadPlayArea(url, 'image');
    },
    search: function(data, cb) {
      swtr.appView.$overlay.show();
      var self = this;
      $.ajax({
        type: 'GET',
        url: '/search/ocd',
        data: data,
        success: function(resp) {
          swtr.appView.$overlay.hide();
          cb(resp);
        }
      });
    }
  });

  swtr.SearchView = SearchView;
})(window);
