# -*- coding: utf8 -*-

import flask
from flask import session
import lxml.html
import config
import requests
import json
import StringIO
import imghdr
from datetime import datetime, timedelta


app = flask.Flask(__name__)
app.config['SECRET_KEY'] = config.secret_key


@app.route('/', methods=['GET'])
def index():
    auth_tok = None
    # check if ?code param is there
    if flask.request.args.get('code'):
        # prepare the payload
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
        print 'recvd auth token from swtstore'
        print auth_tok

        if 'error' in auth_tok:
            print auth_tok['error']
            return flask.make_response(auth_tok['error'], 200)

        # set sessions et al
        session['auth_tok'] = auth_tok
        session['auth_tok']['issued'] = datetime.utcnow()

    # else if session is already existing..
    if 'auth_tok' in session:
        auth_tok = session['auth_tok']
        # check if it has expired
        oauth_token_expires_in_endpoint = config.swtstoreURL +\
            '/oauth/token-expires-in'
        resp = requests.get(oauth_token_expires_in_endpoint)
        expires_in = json.loads(resp.text)['expires_in']
        # added for backwared compatibility. previous session stores did not
        # have issued key
        try:
            check = datetime.utcnow() - auth_tok['issued']

            if check > timedelta(seconds=expires_in):
                print 'access token expired'
                # TODO: try to refresh the token before signing out the user
                auth_tok = {'access_token': '', 'refresh_token': ''}
            else:
                print 'access token did not expire'

        # if issued key is not there, reset the session
        except KeyError:
            auth_tok = {'access_token': '', 'refresh_token': ''}

    else:
        auth_tok = {'access_token': '', 'refresh_token': ''}

    #print 'existing tokens'
    #print auth_tok
    return flask.render_template('index.html',
                                 access_token=auth_tok['access_token'],
                                 refresh_token=auth_tok['refresh_token'],
                                 config=config,
                                 url=flask.request.args.get('where'))


@app.route('/annotate', methods=['GET'])
def annotate():
    print flask.request.args['where']
    # img = urllib2.urlopen(flask.request.args['where']).read()
    request = requests.get(flask.request.args['where'])
    content = request.text
    if imghdr.what('ignore', content) is None:
        root = lxml.html.parse(StringIO.StringIO(content)).getroot()
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

        swtmakerCSS = root.makeelement('link')
        root.body.append(swtmakerCSS)
        swtmakerCSS.set("href", flask.url_for('static',
                                              filename=
                                              "css/swtmaker.css"))
        swtmakerCSS.set("rel", "stylesheet")
        swtmakerCSS.set("type", "text/css")

        bootstrapCSS = root.makeelement('link')
        root.body.append(bootstrapCSS)
        bootstrapCSS.set("href", flask.url_for('static',
                                               filename=
                                               "css/bootstrap.min.css"))
        bootstrapCSS.set("rel", "stylesheet")
        bootstrapCSS.set("type", "text/css")

        underscoreJS = root.makeelement('script')
        root.body.append(underscoreJS)
        underscoreJS.set("src", flask.url_for('static',
                                              filename="js/lib/" +
                                              "underscore-1.5.2.min.js"))
        underscoreJS.set("type", "text/javascript")

        backboneJS = root.makeelement('script')
        root.body.append(backboneJS)
        backboneJS.set("src", flask.url_for('static',
                                            filename=
                                            "js/lib/backbone-1.0.0.min.js"))
        backboneJS.set("type", "text/javascript")

        if 'auth_tok' in session:
            auth_tok = session['auth_tok']
        else:
            auth_tok = {'access_token': '', 'refresh_token': ''}

        configScript = root.makeelement('script')
        root.body.append(configScript)
        configScript.text = """window.swtr = window.swtr || {};
        swtr.swtstoreURL = {}
        swtr.endpoints = {}
        'get': '/api/sweets/q',
        'post': '/api/sweets',
        'auth': '/oauth/authorize',
        'login': '/auth/login',
        'logout': '/auth/logout'
        {};

        swtr.access_token = '{}';
        swtr.refresh_token = '{}';
        swtr.app_id = '{}';swtr.app_secret = '{}';
        swtr.oauth_redirect_uri = '{}';""".format(
            '{}', 'function() {}return "{}"{}'.format('{',
                                                      config.swtstoreURL, '};'),
            '{', '}', auth_tok['access_token'], auth_tok['refresh_token'],
            config.app_id, config.app_secret,
            config.redirect_uri)
        configScript.set("type", "text/javascript")

        # swtmakerScript = root.makeelement('script')
        # root.body.append(swtmakerScript)
        # swtmakerScript.set("src", flask.url_for('static',
        #                                         filename="js/swtmaker.js"))
        # swtmakerScript.set("type", "text/javascript")

        oAuthScript = root.makeelement('script')
        root.body.append(oAuthScript)
        oAuthScript.set("src", flask.url_for('static',
                                             filename="js/oauth.js"))
        oAuthScript.set("type", "text/javascript")

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
