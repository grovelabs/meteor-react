/**
 * React Mixin for binding reactive data sources and DDP subscriptions
 * to the state of a component using Tracker.
 *
 * Components using this mixin should implement `subscriptions`, returning
 * either a single subscription handle, an array of subscription handles,
 * or nothing. These subscriptions handles come from sources such as
 * `Meteor.subscribe`
 *
 * Components using this mixin have access to an additional field on the state,
 * `subsReady`, and a function on the component, also `subsReady`. The
 * difference between the two is that the `subsReady` function is reactive.
 * You want to use that in  `getReactiveState` -- it sets up a dependency
 * within the implicit Tracker.autorun. You can use `subsReady` within a
 * components `render`, but it follows React convention more closely to use the
 * state variable instead.
 *
 * `this.state.subsReady` {Boolean} represents state of the declared subs
 * `this.subsReady` {Function} reactive method also representing state of subs
 *
 *
 */
DDPMixin = {

  getInitialState: function() {
    var self = this;
    if ( self.subscriptions ) {
      // Setting up Tracker state
      var subsReady = new ReactiveVar(false);
      self._subsReadyVar = subsReady;
      // The reactive method to call in getReactiveState
      self.subsReady = subsReady.get.bind(subsReady);

      // Setting up React state
      return {
        subsReady: false
      };
    }
  },

  componentWillMount: function() {
    var self = this;
    self._subsComputation = Tracker.autorun( function(computation) {
      var subsReady;
      // If you call Meteor.subscribe within Tracker.autorun, the
      // subscription will be automatically cancelled when the computation
      // is invalidated or stopped; it's not necessary to call stop on
      // subscriptions made from inside autorun. However, if the next
      // iteration of your run function subscribes to the same record set
      // (same name and parameters), Meteor is smart enough to skip a
      // wasteful unsubscribe/resubscribe
      var subs = self.subscriptions();
      // assuming it's either undefined or DDP.subscribe handles
      if (typeof subs !== 'undefined') {
        subs = [].concat(subs); // make it an array
        subsReady = _.every(subs, function(sub) { return sub.ready(); });
        // The .ready() call is the reactive data source
      } else {
        // True if there are no subs, subscriptions() returned nothing
        subsReady = true;
      }

      self._subsReadyVar.set(subsReady);    // Tracker
      self.setState({                       // React
        subsReady: subsReady
      });
    });
  },

  componentWillUnmount: function() {
    if ( this._subsComputation ) {
      this._subsComputation.stop();
      this._subsComputation = null;
    }
  }

};