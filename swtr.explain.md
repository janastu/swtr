# High-level components and data flow of the swtr application

>  The document is written in an informal way.

Table of contents
1. Introduction
2. Design
3. Configuration
4. Deployment

1. Introduction

swtr is the cannonical swt maker + swt swagger application.
That means, the swtr application can be used to -
a) interact with resources on an existing web page(like
text, images, video etc), annotate them, and make swts out of the annotations
and post the swts to a swt store.
b) fetch existing swts about an existing web page and display/render them based
on a combination of - the type of swt (the context), and configuration
parameters set by the user.

2. Design

swtr is designed entirely to be a client-side javascript app.
The components of the swtr app can be divided like-
i) text annotation module - an interface to the user to select and annotate
text.
  1. creates an interface for the user to select any text on the webpage.
  2. when user has selected text - gives two options - edit/renarrate or comment/annotate.
  3.1 if user selects comment, the module provides a text box to enter user's
      comment, keeping the selected text by the user in context.
  3.2 if the user selects edit, the module provides an editor keeping the
      selected text by the user in context.
  4. In both the above case, the editor window has options to save the changes
     or cancel them.
  5.1 If the user cancels, all the changes made by the user is discarded and
      previous version of the page is kept.
  5.2 If the user saves changes, the new edit or comment is updated in the
      DOM of the browser to visually reflect the changes, and also the changes
      are cached in a local data store.

ii) image annotation module - an interface to the user to select arbitrary
parts of an image in rectangle shape and add textual comments to them. Later
this can be extended to add support for audio, video comments.
  1. provides an interface to click on any image on the webpage and bring it to
     center focus to make it annotatable. We use the annotorious project to do
     the image annotation.
  2. Once an annotation to the image has been made, the module can provide the
     user with options to cancel or save the changes.
  3.1 If the user cancels, all the changes made by the user is discarded (i.e
      annotations removed).
  3.2 If the user saves changes, this module retrieves the annotations via
      the annotorious' API and stores them in the local data store.

iii) map annotation module - an interface to the user to select a region of
interest on the map by drawing a bounding box, or dropping a pin at a
location. The annotation can contain media types of audio, video and also
textual notes related to the place. OpenSeaDragon supports annotations of tiled
images/maps. OpenSeaDragon works as a plugin to annotorious.
  1. provides an interface, with map tiles loaded using OSM or any other tiles
  service provider of choice, to annotate by either clicking on a location of
  interest or drawing a bounding box around a region.
  2. Once an annotation to the map has been made, the module can provide the
     user with options to cancel or save the changes.
  3.1 If the user cancels, all the changes made by the user is discarded (i.e
      annotations removed).
  3.2 If the user saves changes, this module retrieves the annotations via
      the annotorious' API and stores them in the local data store.

iv) controller

v) swt maker

vi) swt swagger

3. Configuration

The application has to be registered with swtstore for performing authenticated
requests on the APIs. This configuration details go in a file named
**config.py**.  The file would also contain the URL of the swtstore with which
the app has been registered. A sample configuration file has been included in
the repository.

4. Deployment

Swtr has been built with flask, a python micro web framework. To deploy a flask
application look at [this link](http://flask.pocoo.org/docs/0.10/deploying/).
