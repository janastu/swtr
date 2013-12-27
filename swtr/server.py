#!/usr/bin/python

import flask
import conf

app = flask.Flask(__name__)

@app.route('/', methods=['GET'])
def index():
    return flask.render_template('index.html',
                                 url=flask.request.args.get('where'),
                                 conf=conf)


if __name__ == '__main__':
    app.run(debug=conf.debug, host=conf.HOST, port=conf.PORT)
