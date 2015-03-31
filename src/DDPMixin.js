var log = console.log.bind(console, "DDPMixin =>");
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
 * If the subscriptions are ready immediately the `subsReady` state will be
 * updated synchronously, reflecting that state at `componentWillMount`
 *
 * `this.state.subsReady` {Boolean} represents state of the declared subs
 * `this.subsReady` {Function} reactive method also representing state of subs
 *
 *
 */
DDPMixin = {

  getInitialState: function() {
    log("getInitialState");
    var self = this;
    if ( self.subscriptions ) {
      var initState = {   // This is for React
        subsReady: false
      };
      var subsReady = new ReactiveVar(false); // This is for Tracker
      // The reactive method to call in getReactiveState
      self.subsReady = subsReady.get.bind(subsReady);
      self._subsComputation = Tracker.autorun( function(computation) {
        computation.onInvalidate( function() {
          log("autorun invalidated");
          log("computation is", computation.stopped ? 'stopped' : 'not stopped');
        });
        log("autorun");
        var reactiveState = {};
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
          var isReady = _.reduce(
            subs,
            function(result, sub) {
              return result && sub.ready();  // The .ready() call is the
                                             // reactive data source
            },
            true
          );
          log("subscriptions are", isReady ? 'ready' : 'not ready');
          reactiveState.subsReady = isReady; // React
          subsReady.set(isReady);       // Meteor
        } else {
          // True if there are no subs, subscriptions() returned nothing
          reactiveState.subsReady = true;
        }

        // Handling changing state
        if (computation.firstRun) {

          initState = reactiveState;  // set sync
        } else if ( self.isMounted() ) {
          // can't call setState until component is mounted
          log("mounted, changing DDP state");
          self.setState(reactiveState); // set async
        } else { // it's not mounted and we need to wait to `setState`
          Tracker.afterFlush(function () {
            // Basically trying to call `afterMounted`
            // This has only after been called after the component has
            // mounted, but I don't think it's guaranteed that this will
            // actually be after it's mounted
            log("afterFlush");
            self.setState(reactiveState); // set async
          });
        }

      });
      return initState;
    }
  },

  // getInitialState: function() {
  //   log("getInitialState");
  //   var self = this;
  //   var subsReady = new ReactiveVar(false); // This is for Tracker
  //   self._subsReadyVar = subsReady;
  //   // The reactive method to call in getReactiveState
  //   self.subsReady = subsReady.get.bind(subsReady);
  //   // return {};
  // },

  // componentWillMount: function() {
  //   log("componentWillMount");
  //   var self = this;
  //   if ( self.subscriptions ) {
  //     self._subsComputation = Tracker.autorun( function(computation) {
  //       log("autorun");
  //       computation.onInvalidate( function() {
  //         log("autorun invalidated", self._reactInternalInstance.getName());
  //         log("computation is", computation.stopped ? 'stopped' : 'not stopped');
  //       });
  //       // If you call Meteor.subscribe within Tracker.autorun, the
  //       // subscription will be automatically cancelled when the computation
  //       // is invalidated or stopped; it's not necessary to call stop on
  //       // subscriptions made from inside autorun. However, if the next
  //       // iteration of your run function subscribes to the same record set
  //       // (same name and parameters), Meteor is smart enough to skip a
  //       // wasteful unsubscribe/resubscribe
  //       var subs = self.subscriptions();
  //       // assuming it's either undefined or DDP.subscribe handles
  //       if (typeof subs !== 'undefined') {
  //         subs = [].concat(subs); // make it an array
  //         var isReady = _.reduce(
  //           subs,
  //           function(result, sub) {
  //             return result && sub.ready();  // The .ready() call is the
  //                                            // reactive data source
  //           },
  //           true
  //         );
  //         log("subscriptions are", isReady ? 'ready' : 'not ready');
  //         self._subsReadyVar.set(isReady);       // Meteor
  //         self.setState({               // React
  //           subsReady: isReady
  //         });
  //       } else {
  //         log("no subscriptions");
  //         // True if there are no subs, subscriptions() returned nothing
  //         self._subsReadyVar.set(true);
  //         self.setState({
  //           subsReady: true
  //         });
  //       }
  //     });
  //   }
  // },

  componentWillUnmount: function() {
    if ( this._subsComputation ) {
      this._subsComputation.stop();
      this._subsComputation = null;
    }
  }

};