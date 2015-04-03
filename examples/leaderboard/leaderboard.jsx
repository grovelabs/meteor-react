// both
Players = new Meteor.Collection("players");

Meteor.methods({
  addPoints: function(userId, points) {
    Players.update(userId, { $inc: { score: +points } });
  }
});

// client-side definition of <Leaderboard /> and initialization
if (Meteor.isClient) {

  var cx = React.addons.classSet;

  var Leaderboard = React.createClass({
    mixins: [ DDPMixin, ReactiveMixin ],

    subscriptions: function() {
      return Meteor.subscribe("players");
    },

    getReactiveState: function() {
      if ( this.subsReady() ) {
        var selectedPlayer = Players.findOne(Session.get("selected_player"));
        return {
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

      return <div className="inner">{ children }</div>;
    }
  });

  var Player = React.createClass({
    mixins: [ ReactiveMixin ],

    getInitialState: function () {
      return null;
    },

    render: function() {
      var { name, score, ...rest } = this.props;
      return <div {...rest} className={cx("player", rest.className)}>
        <span className="name">{name}</span>
        <span className="score">{score}</span>
      </div>;
    }
  });

  // Attach to a document id.
  Meteor.startup(function (argument) {
    React.render(<Leaderboard />, document.body);
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
