# secret key for the application used in session
SECRET_KEY = "a long random string; see python UUID"

# the URL pointing to the sweet store this application will sweet to
SWTSTORE_URL = 'http://sweet/store/url'

# the URL at which your application is hosted
# when you are deploying the app locally, by default this should be
#app_url= 'http://localhost:5000'
APP_URL = 'http://localhost:5000'

# the app_id or client_id you have recieved when you registered this
# application to swtstore
APP_ID = 'the app_id or client_id'

# the app_secret or client_secret you have recieved when you registered this
# application to swtstore
APP_SECRET = 'the app_secret or client_secret'

# the absolute url of the OAuth2.0 redirect endpoint
# this is the endpoint where the second part of the oauth handshake happen and
# the endpoint passes the client secret and the recvd code for the final call
# to recieve the OAuth token. For this app, the endpoint is /authenticate
REDIRECT_URI = 'http://localhost:5000/authenticate'


# Api endpiont for the the /search/ocd
OCD_SEARCH_ENDPOINT = 'http://api.opencultuurdata.nl/v0/search'
OCD_RESOLVE_ENDPOINT = 'http://api.opencultuurdata.nl/v0/resolve/'
