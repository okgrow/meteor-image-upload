Image Upload Demo App
---------------------

Note that the demo app is purged of data on the hour every hour.

Running this app yourself
-------------------------

You will need GraphicsMagick installed.

To install on OS X: `brew install graphicsmagick`

Copy `settings-example.json` to `settings.json` and edit with your actual
AWS credentials and bucket name.

Start the app: `meteor --settings settings.json`

Deploying this app
------------------

Use Heroku. You can't use Meteor.com's deployment environment because it does
not support GraphicsMagick.

TODO
====

* Spinner when an image on a post is still processing
