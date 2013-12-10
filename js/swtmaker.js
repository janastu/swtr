(function(swtmkr) {

  //TODO: find a better way to init.
  //Find a better way to do closure
  //Remove script code from the HTML page
  swtmkr.init = function() {
    swtmkr.appView = new AppView();
    swtmkr.img = {};
    swtmkr.img.H = 300;
    swtmkr.img.W = 800;
    swtmkr.sweets = new Sweets();
    swtmkr.who = 'Guest';
  };

  var ImgAnnoSwt = Backbone.Model.extend({
    defaults: {
      '__sweeted__': false,
      'who': '',
      'what': 'img-anno',
      'where': '',
      'how': {}
    }
  });

  var Sweets = Backbone.Collection.extend({
    model: ImgAnnoSwt
  });

  var AppView = Backbone.View.extend({
    el: $('#swt-maker'),
    events: {
      'click #img-url-submit': 'setImage',
      'click #sweet': 'makeSweet'
    },
    initialize: function() {
      //var allElements = $('body *');
      this.helpview = new HelpView();
      anno.addHandler('onAnnotationCreated', this.showSwtHelp);
      anno.addHandler('onAnnotationUpdated', this.showSwtHelp);
    },
    setImage: function() {
      anno.reset();
      this.helpview.step(2);
      var img = $('#annotatable-img');
      img.attr('src', $('#img-url-input').val());
      img.attr('height', 500);
      img.attr('width', 800);
      // img is a jquery object which annotorious doesn't accept; instead it
      // takes the native object returned by a browser API; fortunately, jqeury
      // stores a copy of the native object too!
      anno.makeAnnotatable(img[0]);
    },
    showSwtHelp: function(annotation) {
      var self = swtmkr.appView;//TODO: figure out how we can bind the scope when this func is called as a callback
      self.helpview.step(3);
      $('#sweet-button').html('<button id="sweet">Sweet</button>');
    },
    makeSweet: function() {
      var annos = anno.getAnnotations();
      var template = _.template($('#sweet-template').html());
      _.each(annos, function(anno) {
        swtmkr.sweets.add({
          who: swtmkr.who,
          where: anno.src,
          how: anno
        });
      });
      $('#sweet-list').html('Your sweet(s)');
      _.each(swtmkr.sweets.models, function(swt) {
        $('#sweet-list').append(template({
          who: swt.get('who'),
          what: swt.get('what'),
          where: swt.get('where'),
          how: JSON.stringify(swt.get('how').text)
        }));
      });
    }
  });

  var HelpView = Backbone.View.extend({
    el: $('#helpview'),
    events: {
    },
    initialize: function() {
      this.step(1);
    },
    step: function(n) {
      var text = '';
      switch (n) {
        case 1: text = 'Enter the URL of an image below, and start annotating!';
                break;
        case 2: text = '';
                break;
        case 3: text = 'Now you can sweet this annotation';
                break;
      }
      $(this.el).html(text);
    }
  });

  swtmkr.AppView = AppView;
})(swtmkr);
