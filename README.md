# Meteor & React
This a [Meteor](https://meteor.com) package that loads in the [React](https://facebook.github.io/react) library (with addons) and 2 mixins that enable binding reactive data sources and DDP subscriptions to a Component.

*If you're looking for a JSX compiler see [`grigio:babel`](https://github.com/grigio/meteor-babel)*

*If you're looking for a lighweight router see [`meteorhacks:flow-router`](https://github.com/meteorhacks/flow-router) ([example](https://github.com/flow-examples/flow-router-react-example))*

**Current React version: 0.13.1**

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

## How it works
### Loading React
The difference between the development and production versions of React is more than just minification. There are warnings that are removed and optimizations made. When building React from its source the library handles this, but since Meteor doesn't support loading NPM packages on the client, this package provides the pre-built production version. It does so by checking if the `process` was started with `meteor build`

### Reactive Subscriptions
All of the subscription handles that are returned from `subscriptions` have `.ready()` called on them, which is a reactive data source. Every time a new subscription becomes ready it will check them all again. Once they are all ready, a `ReactiveVar` is set to true. The component method `this.subsReady()` is actually a bound `get` call on a ReactiveVar. 

```js
var subsReady = new ReactiveVar(false);
this.subsReady = subsReady.get.bind(subsReady);
```

When called from within `getReactiveState`, it sets up a dependency on that method's `Tracker.autorun` even as a bound function (which is pretty awesome).

## Future Work
### Server-side
Currently the package only loads the files onto the client. Having it on the server for the possibility of server-side rendering would be cool.
