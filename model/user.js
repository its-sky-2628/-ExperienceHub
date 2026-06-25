const mongoose = require("mongoose");

mongoose.connect(process.env.MONGODB_URI)
.then(() => console.log("MongoDB Atlas Connected"))
.catch(err => console.log(err));

const UserSchema = mongoose.Schema({
    username: String,
    name: String,
    age: Number,
    email: String,
    password: String,

    posts: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "post"
    }]
});

module.exports = mongoose.model("user", UserSchema);