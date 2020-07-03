// Import contact model
Participant = require("../models/participant");
// Handle index actions
exports.index = function (req, res) {
  Participant.get(function (err, participants) {
    if (err) {
      res.json({
        status: "error",
        message: err,
      });
    }
    res.json({
      status: "success",
      message: "participants retrieved successfully",
      data: participants,
    });
  });
};
// Handle create contact actions
exports.new = function (req, res) {
  var participant = new Participant();
  participant.email = req.body.email;
  participant.first_name = req.body.first_name;
  participant.last_name = req.body.last_name;
  // save the participant and check for errors
  participant.save(function (err) {
    // if (err)
    //     res.json(err);
    res.json({
      message: "New participant created!",
      data: participant,
    });
  });
};
// Handle view participant info
exports.view = function (req, res) {
  Participant.findById(req.params.id, function (err, participant) {
    if (err) res.send(err);
    res.json({
      message: "participant details loading..",
      data: participant,
    });
  });
};
// Handle update participant info
exports.update = function (req, res) {
  Participant.findById(req.params.id, function (err, participant) {
    if (err) res.send(err);
    participant.first_name = req.body.first_name;
    participant.email = req.body.email;
    participant.last_name = req.body.last_name;
    // save the participant and check for errors
    participant.save(function (err) {
      if (err) res.json(err);
      res.json({
        message: "participant Info updated",
        data: participant,
      });
    });
  });
};
// Handle delete participant
exports.delete = function (req, res) {
  Participant.remove(
    {
      _id: req.params.id,
    },
    function (err, participant) {
      if (err) res.send(err);
      res.json({
        status: "success",
        message: "participant deleted",
      });
    }
  );
};
