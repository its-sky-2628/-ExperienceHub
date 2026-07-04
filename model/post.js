const mongoose = require("mongoose");

const postSchema = mongoose.Schema({

    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "user"
    },

    date: {
        type: Date,
        default: Date.now
    },

    content: String,

    category: {
        type: String,
        default: "Life Experience 🌱"
    },

    likes: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "user"
    }],

    comments: [
        {
            user: {
                type: mongoose.Schema.Types.ObjectId,
                ref: "user"
            },

            text: String
        }
    ]

});

module.exports = mongoose.model("post", postSchema);