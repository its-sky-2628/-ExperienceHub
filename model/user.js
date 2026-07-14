const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema({

    username: String,

    name: String,

    age: Number,

    email: String,

    password: String,

    profilePic: {
        type: String,
        default: ""
    },

    bio: {
        type: String,
        default: "No bio yet."
    },

    posts: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "post"
    }],

    followers: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "user"
    }],

    following: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "user"
    }],

    savedPosts: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "post"
    }]

},
{
    timestamps: true
});

module.exports = mongoose.model("user", UserSchema);