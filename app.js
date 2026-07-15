const express = require("express");
const notificationModel = require("./model/notification");
const multer = require("multer");
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const mongoose = require("mongoose");
const crypto = require("crypto");
const transporter = require("./config/mailer");
require("dotenv").config();
mongoose.connect(process.env.MONGODB_URI)
.then(() => console.log("MongoDB Atlas Connected"))
.catch(err => console.log(err));
const app = express();
const bcrypt=require('bcrypt');
const jwt=require("jsonwebtoken");
const userModel = require("./model/user");
const postModel = require("./model/post");
const cookieparser=require('cookie-parser');
const cloudinary = require("cloudinary").v2;

cloudinary.config({
  cloud_name: process.env.CLOUD_NAME,
  api_key: process.env.API_KEY,
  api_secret: process.env.API_SECRET
});
app.set("view engine","ejs");
app.use(express.json());
app.use(express.urlencoded({extended:true}));
app.use(cookieparser());
app.use(express.static("public"));


const profileStorage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
        folder: "experiencehub_profiles",
        allowed_formats: ["jpg", "jpeg", "png", "webp"]
    }
});

const profileUpload = multer({
    storage: profileStorage
});

const postStorage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
        folder: "experiencehub_posts",
        allowed_formats: ["jpg", "jpeg", "png", "webp"]
    }
});

const postUpload = multer({
    storage: postStorage
});
app.get("/", async function (req, res) {

    const latestPosts = await postModel
        .find()
        .populate("user")
        .sort({ createdAt: -1 })
        .limit(3);

    let lovedPosts = await postModel
        .find()
        .populate("user");

    lovedPosts.sort((a, b) => b.likes.length - a.likes.length);

    const totalUsers = await userModel.countDocuments();

    const totalPosts = await postModel.countDocuments();

    const allPosts = await postModel.find();

    let totalLikes = 0;

    allPosts.forEach(post => {
        totalLikes += post.likes.length;
    });

    res.render("home", {
        latestPosts,
        lovedPosts: lovedPosts.slice(0, 3),
        totalUsers,
        totalPosts,
        totalLikes
    });

});
app.get("/register", function(req,res){
    res.render("index");
});
app.post("/upload", function(req, res) {
    res.render("index");
});
app.get("/test", function(req, res) {
    res.render("test");
});
app.get("/forgot",(req,res)=>{

res.render("forgot");

});


app.post("/forgot", async function(req, res){

    try{

        const user = await userModel.findOne({
            email: req.body.email
        });

        if(!user){
            return res.send("No account found.");
        }

        const token = crypto.randomBytes(32).toString("hex");

        user.resetToken = token;
        user.resetTokenExpire = Date.now() + 1000 * 60 * 15;

        await user.save();

        const resetLink = `${process.env.BASE_URL}/reset/${token}`;

        // ✅ यहाँ नया डिबगिंग कोड जोड़ दिया गया है
        const info = await transporter.sendMail({
            from: process.env.EMAIL_USER,
            to: user.email,
            subject: "Reset Your ExperienceHub Password",
            html: `
                <h2>ExperienceHub</h2>
                <p>Click below to reset your password.</p>
                <a href="${resetLink}">Reset Password</a>
                <p>This link will expire in 15 minutes.</p>
            `
        });
        
        console.log("=================================");
        console.log("Email Sent Successfully");
        console.log("To :", user.email);
        console.log("Message ID :", info.messageId);
        console.log("Response :", info.response);
        console.log("Accepted :", info.accepted);
        console.log("Rejected :", info.rejected);
        console.log("=================================");

        res.send("Password reset link sent successfully.");

    }catch(err){

        console.log(err);

        res.status(500).send("Failed to send email.");

    }

});

app.get("/profile",isLoggedIn, async function(req, res) {
    let user = await userModel.findOne({email:req.user.email});
    await user.populate("posts");
    await user.populate("followers");
    await user.populate("following");
    res.render("profile",{user});
});
app.get("/edit-profile", isLoggedIn, async function(req,res){

    let user = await userModel.findById(req.user.userid);

    res.render("editprofile",{user});

});
app.post("/edit-profile", isLoggedIn, async function(req,res){

    let {name,username,bio}=req.body;

    await userModel.findByIdAndUpdate(req.user.userid,{

        name,
        username,
        bio

    });

    res.redirect("/profile");

});
app.get("/like/:id", isLoggedIn, async function(req, res) {

    let post = await postModel.findById(req.params.id);

    if (!post) {
        return res.redirect("/profile");
    }

    const liked = post.likes.includes(req.user.userid);

    await postModel.findByIdAndUpdate(
        req.params.id,
        liked
        ? { $pull: { likes: req.user.userid } }
        : { $push: { likes: req.user.userid } }
    );
    if(!liked && post.user.toString() !== req.user.userid){

    await notificationModel.create({

        receiver: post.user,

        sender: req.user.userid,

        type: "like",

        post: post._id

    });

}

   res.redirect("/feed");
});
app.get("/reset/:token", async (req, res) => {

const user=await userModel.findOne({

resetToken:req.params.token,

resetTokenExpire:{$gt:Date.now()}

});

if(!user){

return res.send("Invalid or expired link.");

}

res.render("reset",{

token:req.params.token

});

});
app.post("/reset/:token", async (req, res) => {

const user=await userModel.findOne({

resetToken:req.params.token,

resetTokenExpire:{$gt:Date.now()}

});

if(!user){

return res.send("Invalid or expired link.");

}

const hash=await bcrypt.hash(req.body.password,10);

user.password=hash;

user.resetToken="";

user.resetTokenExpire=null;

await user.save();

res.redirect("/login");

});
function isAdmin(req,res,next){

    if(req.user.email !== "shreyanshyadav966772@gmail.com"){
        return res.send("Access Denied");
    }

    next();

}
app.get("/admin", isLoggedIn, isAdmin, async function(req, res){

    const totalUsers = await userModel.countDocuments();

    const totalPosts = await postModel.countDocuments();

    const today = new Date();
    today.setHours(0,0,0,0);

    const newUsersToday = await userModel.countDocuments({
        createdAt: { $gte: today }
    });

    const newPostsToday = await postModel.countDocuments({
        createdAt: { $gte: today }
    });

    const posts = await postModel.find();

    let totalLikes = 0;
    let totalComments = 0;

    posts.forEach(post=>{
        totalLikes += post.likes.length;
        totalComments += post.comments.length;
    });

    res.render("admin",{
        totalUsers,
        totalPosts,
        newUsersToday,
        newPostsToday,
        totalLikes,
        totalComments
    });

});
app.get("/admin/delete-post/:id",isLoggedIn,isAdmin,async function(req,res){

    await postModel.findByIdAndDelete(req.params.id);

    await userModel.updateMany(
        {},
        {$pull:{posts:req.params.id}}
    );

    res.redirect("/admin");

});
app.get("/admin/delete-user/:id",isLoggedIn,isAdmin,async function(req,res){

    await userModel.findByIdAndDelete(req.params.id);

    await postModel.deleteMany({
        user:req.params.id
    });

    res.redirect("/admin");

});
app.get("/edit/:id", isLoggedIn, async function(req, res) {

    let post = await postModel.findOne({ _id: req.params.id });

    if(!post){
        return res.send("Post not found");
    }

    if(post.user.toString() !== req.user.userid){
        return res.send("You are not authorized to edit this post");
    }

    res.render("edit", { post });
});
app.get("/save/:id", isLoggedIn, async function(req,res){

    let user = await userModel.findById(req.user.userid);

    const saved = user.savedPosts.some(
        id => id.toString() === req.params.id
    );

    if(saved){

        user.savedPosts.pull(req.params.id);

    }else{

        user.savedPosts.push(req.params.id);

    }

    await user.save();

    res.redirect("/feed");

});

app.post("/update/:id", isLoggedIn, async function(req, res) {

    let post = await postModel.findOne({ _id: req.params.id });

    if(!post){
        return res.send("Post not found");
    }

    if(post.user.toString() !== req.user.userid){
        return res.send("You are not authorized to update this post");
    }

    await postModel.findOneAndUpdate(
        { _id: req.params.id },
        { content: req.body.content }
    );

    res.redirect("/profile");
});

app.post(
    "/post",
    isLoggedIn,
    postUpload.single("postImage"),
    async function(req, res){

        let { content, category } = req.body;

        let user = await userModel.findOne({
            email: req.user.email
        });

        let image = "";

        if(req.file){
            image = req.file.path;   // Cloudinary URL
        }

        let post = await postModel.create({
            user: user._id,
            content: content,
            category: category,
            image: image
        });

        user.posts.push(post._id);

        await user.save();

        res.redirect("/profile");

    }
);
app.get("/login", function(req, res) {
    res.render("login");
});
app.post("/register", async function(req, res) {
    let {email,password,age,username,name}=req.body;
    let find=await userModel.findOne({email})
    if(find){
    return res.send(`
        <script>
            alert("User already exists!");
            window.location.href="/";
        </script>
    `);
}
    bcrypt.genSalt(10,(err,salt)=>{
        bcrypt.hash(password,salt,async (err,hash)=>{
            let user=await userModel.create({
                username,
                name,
                age,
                email,
                password:hash,
            });
            console.log("CREATED USER:", user);
            let token =jwt.sign({email:email,userid:user._id},"Shreyansh")
            res.cookie("token",token);
            res.redirect("/profile");

        })
    })
});
app.post("/login", async function(req, res) {
    let {email,password}=req.body;
    let find=await userModel.findOne({email})

    if(!find) return res.status(500).send("Something went wrong");

    bcrypt.compare(password,find.password,function(err,result){

        if(result){

            let token = jwt.sign(
                {email: find.email, userid: find._id},
                "Shreyansh"
            );

            res.cookie("token", token);
            res.redirect("/profile");

        } else {
            res.redirect('/login');
        }
    });
});
app.get("/logout", async function(req, res) {
    res.cookie("token","");
    res.redirect("/login");
});
app.post("/comment/:id", isLoggedIn, async function(req,res){

    let post = await postModel.findOne({_id:req.params.id});

    post.comments.push({
        user:req.user.userid,
        text:req.body.comment
    });

    await post.save();
    if(post.user.toString() !== req.user.userid){

    await notificationModel.create({

        receiver: post.user,

        sender: req.user.userid,

        type: "comment",

        post: post._id

    });

}

    res.redirect("/profile");
});
app.get("/allusers", async function(req,res){
    let users = await userModel.find();
    res.send(users);
});
app.get("/deleteeverything", isLoggedIn, async function(req,res){

    if(req.user.email !== "shreyanshyadav95572@gmail.com"){
        return res.send("Access Denied");
    }

    await userModel.deleteMany({});
    await postModel.deleteMany({});

    res.send("Everything deleted");
});
app.get("/delete/:id", isLoggedIn, async function(req, res){

    let post = await postModel.findOne({_id:req.params.id});

    if(!post){
        return res.send("Post not found");
    }

    if(post.user.toString() !== req.user.userid){
        return res.send("You are not authorized to delete this post");
    }

    await postModel.findOneAndDelete({_id:req.params.id});

    await userModel.findOneAndUpdate(
        {_id:req.user.userid},
        {$pull:{posts:req.params.id}}
    );

    res.redirect("/profile");
});
function isLoggedIn(req, res, next) {

    if (!req.cookies.token) {
        return res.redirect("/login");
    }
    else
    {
    let data = jwt.verify(req.cookies.token, "Shreyansh");
    req.user = data;
    next();
    }
}
app.get("/feed", isLoggedIn, async function(req, res){

    let filter = {};

    // Category Filter
    if(req.query.category){
        filter.category = req.query.category;
    }

    // Current User
    let currentUser = await userModel
        .findById(req.user.userid)
        .populate("savedPosts");

    let posts;

    // Following Feed
    if(req.query.filter === "following"){

        posts = await postModel.find({
            user: { $in: currentUser.following }
        })
        .populate("user")
        .sort({ date: -1 });

    } else {

        posts = await postModel.find(filter)
            .populate("user");

        // Trending
        if(req.query.filter === "trending"){

            posts.sort((a, b) => b.likes.length - a.likes.length);

        } else {

            // ✅ फिक्स 4: date की जगह अब सही तरीके से createdAt से लेटेस्ट पोस्ट्स सॉर्ट होंगी
            posts.sort((a, b) => b.createdAt - a.createdAt);

        }

    }

    posts.forEach(post => {
        console.log(post.user.username, "=>", post.user.profilePic);
    });

    res.render("feed", {
        posts,
        currentUser
    });

});
app.get("/story/:id", async function(req, res){

    const post = await postModel
        .findById(req.params.id)
        .populate("user");

    if(!post){
        return res.redirect("/");
    }

    res.render("story",{
        post
    });

});
app.get("/users", isLoggedIn, async function(req,res){

    let users = await userModel.find({
        _id: {$ne:req.user.userid}
    });

    res.render("users",{users});
});
app.get("/search", isLoggedIn, async function(req,res){

    let search = req.query.search || "";

    let users = await userModel.find({
        username: {
            $regex: search,
            $options: "i"
        },
        _id: {
            $ne: req.user.userid
        }
    });

    res.render("search",{
        users,
        search
    });

});
app.get("/follow/:id", isLoggedIn, async function(req,res){

    let currentUser = await userModel.findById(req.user.userid);

    let targetUser = await userModel.findById(req.params.id);

    if(!targetUser){
        return res.send("User not found");
    }

    const isFollowing = currentUser.following.some(
        id => id.toString() === targetUser._id.toString()
    );

    if(isFollowing){

        currentUser.following.pull(targetUser._id);

        targetUser.followers.pull(currentUser._id);

    } else {

        currentUser.following.push(targetUser._id);

        targetUser.followers.push(currentUser._id);
        await notificationModel.create({

        receiver: targetUser._id,

        sender: currentUser._id,

        type: "follow"

});

    }

    await currentUser.save();

    await targetUser.save();

    res.redirect("/feed");

});
app.post("/upload-profile",isLoggedIn,profileUpload.single("profilePic"),async function(req,res){
        try{

            if(!req.file){
                return res.send("No file selected");
            }

            await userModel.findByIdAndUpdate(
                req.user.userid,
                {
                    profilePic: req.file.path
                }
            );

            res.redirect("/profile");

        } catch(err){

            console.log(err);
            res.send("Profile upload failed");

        }

    }
);
app.get("/user/:id", isLoggedIn, async function(req,res){

    let profileUser = await userModel.findById(req.params.id)
        .populate("posts")
        .populate("followers")
        .populate("following");

    if(!profileUser){
        return res.send("User not found");
    }

    let currentUser = await userModel.findById(req.user.userid);

    res.render("user-profile",{
        profileUser,
        currentUser
    });

});
app.get("/notifications", isLoggedIn, async function(req,res){

    let notifications = await notificationModel.find({

        receiver: req.user.userid

    })
    .populate("sender")
    .populate("post")
    .sort({createdAt:-1});

    res.render("notifications",{

        notifications

    });

});
app.listen(process.env.PORT || 3000, function() {
    console.log("Server running");
});