var mongoose = require("mongoose");

var eventSchema = mongoose.Schema({
  ch_meeting_sys_id: {
    type: String,
    required: false,
  },
  ch_scheduled_start_date_time: {
    type: Date,
    required: true,
  },
  ch_scheduled_end_date_time: {
    type: Date,
    required: true,
  },
  ch_meeting_hash: {
    type: String,
    required: true,
  },
  ch_meeting_start: {
    type: Date,
    required: false,
  },
  ch_meeting_end: {
    type: Date,
    required: false,
  },
  ch_meeting_status: {
    type: String,
    required: true,
  },
  ch_participants: {
    type: Array,
    required: true,
  },
  ch_instructor: {
    type: String,
    required: false,
  },
  ch_event_uuid: {
    type: String,
    require: true,
  },
  ch_title: {
    type: String,
    required: false,
  },
});

var Event = (module.exports = mongoose.model("event", eventSchema));

module.exports.get = function (cb, limit) {
  Event.find(cb).limit(limit);
};
