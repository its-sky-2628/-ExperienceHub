const express = require("express");
const multer = require("multer");
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const mongoose = require("mongoose");

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
const storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
        folder: "experiencehub_profiles",
        allowed_formats: ["jpg", "jpeg", "png", "webp"]
    }
});

const upload = multer({ storage });



app.use("/uploads", express.static("uploads"));

app.get("/", function(req, res) {
    res.render("index");
});
app.post("/upload", function(req, res) {
    res.render("index");
});
app.get("/test", function(req, res) {
    res.render("test");
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

    res.redirect("/profile");
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

app.post("/post", isLoggedIn, async function(req, res){

    let { content, category } = req.body;

    let user = await userModel.findOne({
        email: req.user.email
    });

    let post = await postModel.create({
        user: user._id,
        content: content,
        category: category
    });

    user.posts.push(post._id);

    await user.save();

    res.redirect("/profile");

});
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
app.get("/feed", isLoggedIn, async function(req,res){

    let filter = {};

    if(req.query.category){
        filter.category = req.query.category;
    }

    let posts = await postModel.find(filter)
        .populate("user")
        .sort({date:-1});

    posts.forEach(post => {
        console.log(post.user.username, "=>", post.user.profilePic);
    });

    let currentUser = await userModel.findById(req.user.userid);

    res.render("feed",{
        posts,
        currentUser
    });

});
app.get("/users", isLoggedIn, async function(req,res){

    let users = await userModel.find({
        _id: {$ne:req.user.userid}
    });

    res.render("users",{users});
});
app.get("/forgot-password", function(req,res){
    res.render("forgot-password");
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

    }

    await currentUser.save();

    await targetUser.save();

    res.redirect("/feed");

});
app.post("/upload-profile",isLoggedIn,upload.single("profilePic"),async function(req,res){
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
app.listen(process.env.PORT || 3000, function() {
    console.log("Server running");
});