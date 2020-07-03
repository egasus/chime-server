// Import event model
Event = require("../models/event");
// Handle index actions
exports.index = function (req, res) {
  Event.get(function (err, events) {
    if (err) {
      res.json({
        status: "error",
        message: err,
      });
    }
    res.json({
      status: "success",
      message: "events retrieved successfully",
      data: events,
    });
  });
};

// Handle create event actions
exports.new = function (req, res) {
  var event = new Event();
  event.ch_scheduled_start_date_time = req.body.ch_scheduled_start_date_time;
  event.ch_scheduled_end_date_time = req.body.ch_scheduled_end_date_time;
  event.ch_meeting_hash = req.body.ch_meeting_hash || "bbbbbbbb";
  event.ch_meeting_start = req.body.ch_meeting_start;
  event.ch_meeting_end = req.body.ch_meeting_end;
  event.ch_meeting_status = req.body.ch_meeting_status || 0;
  event.ch_participants = req.body.ch_participants;

  // save the event and check for errors
  event.save(function (err) {
    // if (err)
    //     res.json(err);
    res.json({
      message: "New event created!",
      data: event,
    });
  });
};
// Handle view participant info
exports.view = function (req, res) {
  Event.findById(req.params.id, function (err, event) {
    if (err) res.send(err);
    res.json({
      message: "event details loading..",
      data: event,
    });
  });
};
// Handle update event info
exports.update = function (req, res) {
  Event.findById(req.params.id, function (err, event) {
    if (err) res.send(err);

    event.ch_scheduled_start_date_time = req.body.ch_scheduled_start_date_time;
    event.ch_scheduled_end_date_time = req.body.ch_scheduled_end_date_time;
    event.ch_participants = req.body.ch_participants;

    // save the event and check for errors
    event.save(function (err) {
      if (err) res.json(err);
      res.json({
        message: "event Info updated",
        data: event,
      });
    });
  });
};
// Handle delete participant
exports.delete = function (req, res) {
  Event.remove(
    {
      _id: req.params.id,
    },
    function (err, event) {
      if (err) res.send(err);
      res.json({
        status: "success",
        message: "event deleted",
      });
    }
  );
};
