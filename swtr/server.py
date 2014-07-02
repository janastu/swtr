# -*- coding: utf8 -*-

import flask
from flask import session
import config
import requests
import json
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


# if the app is run directly from command-line
# assume its being run locally in a dev environment
if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)
