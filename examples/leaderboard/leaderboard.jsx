// both
Players = new Meteor.Collection("players");

Meteor.methods({
  addPoints: function(userId, points) {
    Players.update(userId, { $inc: { score: +points } });
  }
});

// client-side definition of <Leaderboard /> and initialization
if (Meteor.isClient) {

  var Leaderboard = React.createClass({
    mixins: [ DDPMixin, ReactiveMixin ],

    subscriptions: function() {
      return Meteor.subscribe("players");
    },

    getReactiveState: function() {
      if ( this.subsReady() ) {
        var selectedPlayer = Players.findOne(Session.get("selected_player"));
        return {
          user: Meteor.user() && Meteor.user().emails[0].address,
          players: Players.find({}, {sort: {score: -1, name: 1}}).fetch(),
          selectedPlayer: selectedPlayer,
          selectedName: selectedPlayer && selectedPlayer.name
        };
      }
    },

    addFivePoints: function() {
      Meteor.call("addPoints", Session.get("selected_player"), 5);
    },

    selectPlayer: function(id) {
      Session.set("selected_player", id);
    },

    renderPlayer: function(model) {
      var _id = this.state.selectedPlayer && this.state.selectedPlayer._id;

      return <Player
        key={model._id}
        name={model.name}
        score={model.score}
        className={model._id === _id ? "selected" : ""}
        onClick={this.selectPlayer.bind(this, model._id)}
      />;
    },

    render: function() {
      if (! this.state.players) return <p>loading..</p>
      var children = [
        <div className="leaderboard">
          { this.state.players.map(this.renderPlayer) }
        </div>
      ];

      if (this.state.selectedName) {
        children.push(
          <div className="details">
            <div className="name">{this.state.selectedName}</div>
            <input
              type="button"
              className="inc"
              value="Give 5 points"
              onClick={this.addFivePoints}
            />
          </div>
        );

      } else {
        children.push(
          <div className="none">Click a player to select</div>
        );
      }

      children.push(
        <span>You are {this.state.user || 'not logged in :('}</span>
      )

      return <div className="inner">{ children }</div>;
    }
  });

  // Alternative to `React.createClass({...})` but no ES6 mixins support
  // see: https://facebook.github.io/react/docs/reusable-components.html#no-mixins
  class Player extends React.Component {
    constructor(props) {
      super(props);
    }

    render() {
      var { name, score, ...rest } = this.props;
      var classString = `player ${rest.className}`;
      return <div {...rest} className={classString}>
        <span className="name">{name}</span>
        <span className="score">{score}</span>
      </div>;
    }
  }

  // Attach to a document id.
  Meteor.startup(function (argument) {
    React.render(<Leaderboard />, document.getElementById('leaderboard_placeholder'));
  });

} // client

// On server startup, create some players if the database is empty.
if (Meteor.isServer) {
  Meteor.startup(function () {
    if (Players.find().count() === 0) {
      var names = ["Ada Lovelace",
                   "Grace Hopper",
                   "Marie Curie",
                   "Carl Friedrich Gauss",
                   "Nikola Tesla",
                   "Claude Shannon"];
      for (var i = 0; i < names.length; i++) {
        Players.insert({
          name: names[i],
          score: Math.floor(Random.fraction()*10)*5
        });
      }
    }
  });

  Meteor.publish("players", function() {
    return Players.find();
  });
}
