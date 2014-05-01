#!/usr/bin/python

import flask
from flask import session
import conf
import requests
import json

app = flask.Flask(__name__)

app.config['secret_key'] = "asdkasdiq2jedmaid0q2238uwadscksnc"
app.secret_key = "asdkasdiq2jedmaid0q2238uwadscksnc"

appID = 'YrYc9oMO7fT0avRUAtbRO1cLvoOUUI08BAuqOAJc'
appSecret = 'r9BIYjYOPotMQUOoI98DmH7Eu1M4zg6cMeLay7LOlSsrF1KhKZ'

@app.route('/', methods=['GET'])
def index():
    auth_tok = None
    if flask.request.args.get('code'):
        payload = {
            'scopes': 'email sweet',
            'client_secret': appSecret,
            'code': flask.request.args.get('code'),
            'redirect_uri': 'http://localhost:5000/',
            'grant_type': 'authorization_code',
            'client_id': appID
        }
        resp = requests.post('http://localhost:5001/oauth/token', data=payload)
        auth_tok = json.loads(resp.text)
        print auth_tok
        if auth_tok.has_key('error'):
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
                                     url=flask.request.args.get('where'),
                                     conf=conf)

if __name__ == '__main__':
    app.run(debug=conf.debug, host=conf.HOST, port=conf.PORT)
