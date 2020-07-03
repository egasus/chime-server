var mongoose = require("mongoose");

var participantSchema = mongoose.Schema({
  email: {
    type: String,
    required: true,
  },
  first_name: {
    type: String,
    required: true,
  },
  last_name: {
    type: String,
    required: true,
  },
  create_date: {
    type: Date,
    default: Date.now,
  },
});

var Participant = (module.exports = mongoose.model(
  "participant",
  participantSchema
));

module.exports.get = function (cb, limit) {
  Participant.find(cb).limit(limit);
};
