import sys, os
from flask.ext.testing import TestCase
from flask import url_for
import unittest
import httpretty
import json
from werkzeug.security import gen_salt
from werkzeug.datastructures import MultiDict
from StringIO import StringIO

from swtr import server

class TestServer(TestCase):
    
    def create_app(self):
        app = server.create_app()
        with app.test_client() as t:
            app.config['app_url'] = 'http://foo.app'
        return app

    @httpretty.activate
    def test_annotate_well_formed(self):
        httpretty.register_uri(
            httpretty.GET, 'http://foo.org/resource',
            content_type='application/html',
            status=200,
            body=r'''<html>
            <head></head>
            <body>foo bar</body>
            </html>
            '''
        )

        r = self.client.get(url_for('swtr.annotate'),  query_string={'where': 'http://foo.org/resource'})
        self.assertEqual(r.status_code, 200)
        assert '<head><base href="http://foo.org/resource"></head>' in r.data
        assert '<script src="http://foo.app/static/js/app.js" type="text/javascript"></script>' in r.data
        
        
    @httpretty.activate
    def test_annotate_missing_head(self):
        httpretty.register_uri(
            httpretty.GET, 'http://foo.org/resource',
            content_type='application/html',
            status=200,
            body=r'''<html>
            foo bar
            </html>
            '''
        )

        r = self.client.get(url_for('swtr.annotate'),  query_string={'where': 'http://foo.org/resource'})
        self.assertEqual(r.status_code, 200)
        assert '<head><base href="http://foo.org/resource"></head>' in r.data
        assert '<script src="http://foo.app/static/js/app.js" type="text/javascript"></script>' in r.data

    @httpretty.activate
    def test_annotate_with_base(self):
        httpretty.register_uri(
            httpretty.GET, 'http://foo.org/resource',
            content_type='application/html',
            status=200,
            body=r'''<html>
            <base href="http://foo.bar">
            foo bar
            </html>
            '''
        )

        r = self.client.get(url_for('swtr.annotate'),  query_string={'where': 'http://foo.org/resource'})
        self.assertEqual(r.status_code, 200)
        
        assert '<head><base href="http://foo.bar"></head>' in r.data
        assert '<script src="http://foo.app/static/js/app.js" type="text/javascript"></script>' in r.data
        
    
    def test_bootstrap(self):
        r = self.client.get(url_for('swtr.bootstrap'))
        assert json.loads(r.data) == {
              "access_token": "", 
              "allowedContext": [
                "img-anno"
              ], 
              "app_id": None, 
              "auth_redirect_uri": None, 
              "endpoints": {
                "annotate_webpage": "/webpage", 
                "auth": "/oauth/authorize", 
                "context": "/api/contexts", 
                "get": "/api/sweets/q", 
                "login": "/auth/login", 
                "logout": "/auth/logout", 
                "post": "/api/sweets"
              }, 
              "refresh_token": "", 
              "swtstoreURL": None
            }

if __name__ == '__main__':
    unittest.main()