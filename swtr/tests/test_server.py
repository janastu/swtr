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
        return server.create_app()

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
        print r.data
        assert r.data == '''
        '''
        
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
        print r.data
        assert r.data == '''
        '''

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
        
        assert r.data == '''
        '''


if __name__ == '__main__':
    unittest.main()