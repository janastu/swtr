#!/usr/bin/python

import flask
from flask import session
import lxml.html
import config
import requests
import json
import urllib2
import imghdr

app = flask.Flask(__name__)
app.config['SECRET_KEY'] = config.secret_key


@app.route('/', methods=['GET'])
def index():
    auth_tok = None
    if flask.request.args.get('code'):
        payload = {
            'scopes': 'email sweet',
            'client_secret': config.app_secret,
            'code': flask.request.args.get('code'),
            'redirect_uri': config.redirect_uri,
            'grant_type': 'authorization_code',
            'client_id': config.app_id
        }
        # token exchange endpoint
        oauth_token_x_endpoint = config.swtstoreURL + '/oauth/token'
        resp = requests.post(oauth_token_x_endpoint, data=payload)
        auth_tok = json.loads(resp.text)
        print auth_tok

        if 'error' in auth_tok:
            print auth_tok['error']
            return flask.make_response(auth_tok['error'], 200)

        session['auth_tok'] = auth_tok

    if 'auth_tok' in session:
        auth_tok = session['auth_tok']
    else:
        auth_tok = {'access_token': '', 'refresh_token': ''}

    print auth_tok
    return flask.render_template('index.html',
                                 access_token=auth_tok['access_token'],
                                 refresh_token=auth_tok['refresh_token'],
                                 config=config,
                                 url=flask.request.args.get('where'))


@app.route('/annotate', methods=['GET'])
def annotate():
    print flask.request.args['where']
    img = urllib2.urlopen(flask.request.args['where']).read()
    if imghdr.what('ignore', img) is None:
        root = lxml.html.parse(flask.request.args['where']).getroot()
        root.make_links_absolute(flask.request.args['where'],
                                 resolve_base_href=True)

        jQuery = root.makeelement('script')
        root.body.append(jQuery)
        jQuery.set("src", "//code.jquery.com/jquery-1.11.0.min.js")
        jQuery.set("type", "text/javascript")

        annotatorScript = root.makeelement('script')
        root.body.append(annotatorScript)
        annotatorScript.set("src", flask.url_for('static',
                                                 filename=
                                                 "js/annotator-full.min.js"))
        annotatorScript.set("type", "text/javascript")

        annotatorCSS = root.makeelement('link')
        root.body.append(annotatorCSS)
        annotatorCSS.set("href", flask.url_for('static',
                                               filename=
                                               "css/annotator.min.css"))
        annotatorCSS.set("rel", "stylesheet")
        annotatorCSS.set("type", "text/css")

        appScript = root.makeelement('script')
        root.body.append(appScript)
        appScript.set("src", flask.url_for('static',
                                           filename="js/app.js"))
        appScript.set("type", "text/javascript")

        response = flask.make_response()
        response.data = lxml.html.tostring(root)
        return response

    else:
        if 'auth_tok' in session:
            auth_tok = session['auth_tok']
        else:
            auth_tok = {'access_token': '', 'refresh_token': ''}

        return flask.render_template('index.html',
                                     access_token=auth_tok['access_token'],
                                     refresh_token=auth_tok['refresh_token'],
                                     config=config,
                                     url=flask.request.args.get('where'))

# if the app is run directly from command-line
# assume its being run locally in a dev environment
if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)
