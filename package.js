Package.describe({
  name: "grove:react",
  version: "0.3.0",
  summary: "React for Meteor - vendor files and essential mixins",
  git: "https://github.com/grovelabs/meteor-react/"
});

Package.onUse( function(api) {
  api.use([
    'tracker@1.0.7',
    'reactive-var@1.0.5',
    'underscore@1.0.3'
  ], 'client');

  api.addFiles([
    'src/ReactiveMixin.js',
    'src/DDPMixin.js'
  ], 'client');

  api.export([
    'ReactiveMixin',
    'DDPMixin'
  ], 'client');

});