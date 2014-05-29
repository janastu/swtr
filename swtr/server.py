#!/usr/bin/python

import flask
from flask import session
import config
import requests
import json

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


# if the app is run directly from command-line
# assume its being run locally in a dev environment
if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)
