(function(window) {
  window.swtr = window.swtr || {};

  var HelpView = Backbone.View.extend({
    id: 'helpview-wrapper',
    events: {
      'click .close': 'clickedClose'
    },
    initialize: function() {
      this.template = _.template($('#helpview-template').html());
      this.render();
      this.$text_el = $('#helpview-text');
    },
    render: function() {
      $('#helpview-container').html(this.$el);
      this.$el.html(this.template({}));
    },
    clickedClose: function(event) {
      this.remove();
    },
    //TODO: move from number based steps to something else. number based steps
    //implicitly imply sequential processing..which does not happen in this
    //case..
    //following helps can be async..
    step: function(n) {
      var text = '';
      switch (n) {

      case 0 : text = 'Getting annotations..';
               break;
      case 1: text = 'Enter URL of an image or web page below, and start annotating!';
              break;
      case 2: text = 'Annotate the image, or see other annotations';
              break;
      case 3: text = 'Now you can publish this annotation, or add more annotations';
              break;
      case 4: text = 'Click Sweet button to publish these annotations to the Sweet Store';
              break;
      case 5: text = 'Publishing your sweets';
              break;
      case 6: text = 'Sweets successfully posted';
              break;
      case 7: text = 'Fetching your image..';
              break;
      case 8: text = 'Oops! Seems like the image URL is wrong! Or we couldn\'t fetch the image.';
              break;
      case 9: text = 'You have to be <i>signed in</i> to sweet store to post sweets';
              break;
      case 10: text = 'Oops! Something went wrong. We couldn\'t publish the sweets. Try again.'
               break;
      case 11: text = 'Search in <a href="http://www.opencultuurdata.nl/">Open Cuultur Data API</a>';
               break;
      case 12: text = 'Analyzing the resource type..';
               break;
      case 13: text = 'This does not seem to be a URL. Please enter a valid URL.';
               break;
      case 14: text = 'Select text to annotate the page or browse other annotations.';
              break;
      }
      this.$text_el.html(text);
      $(window).scrollTop(0, 0);
    }
  });

  swtr.HelpView = HelpView;
})(window);
