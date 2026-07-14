const mongoose = require("mongoose");

const notificationSchema = mongoose.Schema({

    receiver: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "user"
    },

    sender: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "user"
    },

    type: {
        type: String,
        enum: ["like", "comment", "follow"]
    },

    post: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "post",
        default: null
    },

    isRead: {
        type: Boolean,
        default: false
    },

    createdAt: {
        type: Date,
        default: Date.now
    }

});

module.exports = mongoose.model("notification", notificationSchema);