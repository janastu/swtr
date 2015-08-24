# Swtr

This app is the Sweet Maker and Sweet Swagger app together.
In other words, this the definitive client side application for
[sweets](http://wiki.janastu.org/Sweet_Web).

This application lets you annotate images and webpages and sweet about them to
a [swtstore](http://github.com/janastu/swtstore).

This acts like a dashboard for an user using the Sweet Web platform, as well.

# Installing

## Requirements

Using the package manager of your operating system, you have to install the
following packages.

On **Debian**, **Ubuntu** and other **Debian-based** and **Ubuntu-based**
systems the packages are:

* `python-dev`
* `libxml2-dev`
* `libxslt1-dev`

**NOTE**: The exact package names may vary across distributions and OSes. 
Please check your distribution's package name.

## To install

Once you have all the requirements installed, in this directory, run

`$ python setup.py install`


# Running a development version

* Configure options in `config.py`, copy from `sample_config.py`

  `$ cp swtr/sample_config.py swtr/config.py`

* Edit the `config.py` file to have appropriate and correct values.

* To run the application:

  `$ python swtr/server.py`

then navigate to the URL in your browser


# Deployment

See deploying flask apps [here](http://flask.pocoo.org/docs/0.10/deploying/).
