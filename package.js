Package.describe({
  name:    "okgrow:image-upload",
  version: "0.8.2",
  summary: "Let users upload images in your app",
  git:     "https://github.com/okgrow/meteor-image-upload/"
});

Package.onUse(function (api) {
  api.use([
    'cfs:standard-packages@0.5.9',
    'cfs:gridfs@0.0.33',
    'cfs:graphicsmagick@0.0.18',
    'cfs:s3@0.1.3',
    'cfs:tempstore@0.1.5',
    'cfs:power-queue@0.9.11',
    'session@1.0.5',
    'spacebars@1.0.0',
    'templating@1.0.0',
    'underscore@1.0.4',
    'tracker@1.0.8'
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
  api.export('ImageUpload');
});
