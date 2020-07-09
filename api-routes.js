// Initialize express router
let router = require("express").Router();
// Set default API response
router.get("/", function (req, res) {
  res.json({
    status: "API Its Working",
    message: "Welcome to RESTHub crafted with love!",
  });
});

// Import contact controller
var participantController = require("./controllers/participantController");
var eventController = require("./controllers/eventController");
var meetingController = require("./controllers/meetingController");

// Contact routes
router
  .route("/participants")
  .get(participantController.index)
  .post(participantController.new);
router
  .route("/participants/:id")
  .get(participantController.view)
  .patch(participantController.update)
  .put(participantController.update)
  .delete(participantController.delete);

// Event routes
router.route("/events").get(eventController.index).post(eventController.new);
router
  .route("/events/:id")
  .get(eventController.view)
  .patch(eventController.update)
  .put(eventController.update)
  .delete(eventController.delete);
router.route("/events/status/:id").put(eventController.updateStatus);

router.route("/meeting/join").post(meetingController.join);
router.route("/meeting/end").post(meetingController.end);
router.route("/meeting/attendee").get(meetingController.attendee);

// Export API routes
module.exports = router;
