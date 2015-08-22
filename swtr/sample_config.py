# secret key for the application used in session
secret_key = "a long random string; see python UUID"

# the URL pointing to the sweet store this application will sweet to
swtstoreURL = 'http://sweet/store/url'

# the URL at which your application is hosted
# when you are deploying the app locally, by default this should be
#app_url= 'http://localhost:5000'
app_url = 'http://yourapplication.domain'

# the app_id or client_id you have recieved when you registered this
# application to swtstore
app_id = 'the app_id or client_id'

# the app_secret or client_secret you have recieved when you registered this
# application to swtstore
app_secret = 'the app_secret or client_secret'

# the absolute url of the OAuth2.0 redirect endpoint
# this is the endpoint where the second part of the oauth handshake happen and
# the endpoint passes the client secret and the recvd code for the final call
# to recieve the OAuth token. For this app, the endpoint is /authenticate
redirect_uri = 'http://yourapplication.domain/authenticate'


# Api endpiont for the the /search/ocd
ocd_search_endpoit = 'http://api.opencultuurdata.nl/v0/search'
ocd_resolve_enpoint = 'http://api.opencultuurdata.nl/v0/resolve/'