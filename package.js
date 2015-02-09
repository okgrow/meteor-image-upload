Package.describe({
  name:    "okgrow:image-upload",
  version: "0.4.1",
  summary: "Let users upload images in your app",
  git:     "https://github.com/okgrow/meteor-image-upload/"
});

Package.onUse(function (api) {
  api.use([
    'cfs:standard-packages',
    'cfs:filesystem',
    'cfs:graphicsmagick',
    'cfs:s3@0.1.1',
    'cfs:tempstore',
    'cfs:power-queue',
    'session',
    'spacebars',
    'templating'
  ]);
  api.addFiles('lib/image_upload.js', ['server', 'client']);
  api.addFiles(
    [
      'client/views/display-image.html',
      'client/views/display-image.js',
      'client/views/upload-image.html',
      'client/views/upload-image.js'
    ],
    'client');
  api.export('ImageCollectionFactory');
});
