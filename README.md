# Meteor & React
This a [Meteor](https://meteor.com) package that includes 2 React mixins that enable binding reactive data sources and DDP subscriptions to a React Component.

*If you're looking for a JSX compiler see [`grigio:babel`](https://github.com/grigio/meteor-babel)*

## Table of Contents
1. [Usage](#usage)
	2. [ReactiveMixin](#reactivemixin)
	3. [DDPMixin](#ddpmixin)
2. [Loading React](#loading-react)
2. [How it works](#how-it-works)
3. [Future Fork](#future-work)

## Usage
### Installation

```
meteor add grove:react
```

### ReactiveMixin
This mixin provides a way of binding reactive data sources to a React
component. Components that use this mixin should implement a method
named `getReactiveState` and return an object from that method, much
like the standard `getInitialState`. Within the `getReactiveState`
function you must make sure to call on [reactive data sources](http://docs.meteor.com/#/full/reactivity) or else the method won't rerun.



#### Example
```js
Bookface = React.createClass({
  mixins: [ ReactiveMixin ],
  
  getReactiveState: function() {
    return {
      friends: Friends.find().fetch(),
      loggedIn: !!Meteor.user()
    }
  },
  
  render: function() {
    if (this.state.loggedIn) {
	    if (this.state.friends.length > 0) {
	      return <h1>You've got friends!</h1>
	    }
	    return <h1>Forever alone...</h1>;
	 }
	 return <h1>Please log in</h1>
  }  
});
```

### DDPMixin
This mixin provides a way of binding DDP subscriptions to a React component. Components that use this mixin should implement a method named `subscriptions` and return either a single [subscription handle](http://docs.meteor.com/#/full/meteor_subscribe) or an array of subscription handles. You can then call `subsReady()` within `getReactiveState` to reactively wait on them, or check `this.state.subsReady` from within the render function to see if they're ready. (You can also call `this.subsReady()` from within `render` but it follows React convention more closely to use the component's state).

Make sure to include the DDPMixin _before_ ReactiveMixin for the component. As stated in the [Reusable Component docs](https://facebook.github.io/react/docs/reusable-components.html#mixins), _"methods defined on mixins run in the order mixins were listed, followed by... the component."_ DDPMixin must run first and define the `subsReady` function before it can be called within `getReactiveState`.

An interesting use case might be to have a component that makes its own DDP connection and uses that instead of the default Meteor connection. `Meteor.subscribe` is just a [bound wrapper around a DDP connection](https://github.com/meteor/meteor/blob/devel/packages/ddp/client_convenience.js#L45-L56)

A `SubsManager` object from [`meteorhacks:subs-manager`](https://github.com/meteorhacks/subs-manager) could also be used instead of `Meteor.subscribe`.

#### Example

```js
Post = React.createClass({
  mixins: [ DDPMixin, ReactiveMixin ],

  getInitialState: function () {
    return {
      post: null
    };
  },

  getReactiveState: function() {
    if ( this.subsReady() ) {
      var p = Posts.findOne( Session.get('currentPostId') );
      return { post: p };
    }
  },

  subscriptions: function() {
    return Meteor.subscribe('singlePost', Session.get('currentPost') );
  },
  
  // or if you want to wait on multiple subscriptions
  subscriptions: function() {
    return [
		Meteor.subscribe('singlePost', Session.get('currentPostId') ),
		Meteor.subscribe('postComments', Session.get('currentPostId') )
    ];
  },

  render: function() {
    if ( this.state.post ) { // or this.state.subsReady, but if the publication
      return (			     // was empty then this.state.post is undefined
        <main id="Post">
			<p>{this.state.post}</p>
        </main>
      );
    }
    return <h1>Loading...</h1>;
  }
});
```
For more modularity you could use the params from your Router instead of `Session.get`

## Loading React
It's recommended to use [`cosmos:browserify`](https://github.com/elidoran/cosmos-browserify/) to get the React library itself. To do so correctly, you'll want to create a local package, `require` what you want, and then explicitly export them. You want to use a local package so that it gets loaded in before your application. For example, if you want to use React with addons and React Router:

```js
// packages/client-deps/package.js
Package.describe({
  name: 'client-deps',
});

Npm.depends({
  "react" : "0.13.3",
  "react-router" : "0.13.3"
});

Package.onUse(function(api) {
  api.use(['cosmos:browserify@0.2.0']);
  api.addFiles(['browserify.js']);
  api.export(['React', 'ReactRouter']);
});
```

```js
// packages/client-deps/browserify.js
React = require('react/addons');
ReactRouter = require('react-router');
```

`React` and `ReactRouter` will then be exposed at the global scope to both the client and server.

**A note on using the production version of React**: The difference between the development and production versions of React is more than just minification. There are warnings that are removed and optimizations made. To remove these warnings, make sure that your `NODE_ENV` environment variable is set to `"production"` when building your app. The [envify](https://www.npmjs.com/package/envify) transform present in cosmos:browserify will replace `process.env.NODE_ENV` with `"production"` throughout the library, and then when Meteor runs [UglifyJS](https://github.com/mishoo/UglifyJS2) it'll eliminate the now-dead code.

## How it works
### Reactive Subscriptions
All of the subscription handles that are returned from `subscriptions` have `.ready()` called on them, which is a reactive data source. Every time a new subscription becomes ready it will check them all again. Once they are all ready, a `ReactiveVar` is set to true. The component method `this.subsReady()` is actually a bound `get` call on a ReactiveVar. 

```js
var subsReady = new ReactiveVar(false);
this.subsReady = subsReady.get.bind(subsReady);
```

When called from within `getReactiveState`, it sets up a dependency on that method's `Tracker.autorun` even as a bound function (which is pretty awesome).

## Future Work
### Server-side
The package loads React onto server and client, but the mixins are not supported on the server since Tracker and `Meteor.subscribe` are not supported on the server. Thoughts and pull requests welcome.
