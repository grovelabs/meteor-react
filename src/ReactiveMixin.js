/**
 * This mixin provides a way of binding reactive data sources to React
 * components. Components that use this mixin should implement a method
 * named `getReactiveState` and return an object from that method, much
 * like the standard `getInitialState`. Within the `getReactiveState`
 * function you must make sure to call on [reactive data sources](http://docs.meteor.com/#/full/reactivity)
 * or else the method won't rerun. See DDPMixin if you're trying to reactively
 * wait on DDP subscriptions to be ready
 *
 * If the subscriptions are ready immediately the `subsReady` state will be
 * updated synchronously, reflecting that state at `componentWillMount`
 */
ReactiveMixin = {

  getInitialState: function() {
    var self = this;
    if ( self.getReactiveState ) {
      var initState = {};
      self._reactiveStateComputation = Tracker.autorun( function(computation) {
        // Something in getReactiveState MUST be a reactive data source
        // in order for rerun
        var reactiveState = self.getReactiveState();
        if ( typeof reactiveState !== 'undefined' ) {
          if (computation.firstRun) {
              initState = reactiveState;
          } else if ( self.isMounted() ) {
            // can't call setState until component is mounted
            self.setState(reactiveState);
          } else { // it's not mounted and we need to wait to `setState`
            Tracker.afterFlush(function () {
              self.setState(reactiveState); // set async
            });
          }
        }
      });
      return initState;
    }
  },

  componentWillUnmount: function() {
    if (this._reactiveStateComputation) {
      this._reactiveStateComputation.stop();
      this._reactiveStateComputation = null;
    }
  }

};