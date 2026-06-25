const express = require("express");
const app = express();
const bcrypt=require('bcrypt');
const jwt=require("jsonwebtoken");
const userModel = require("./model/user");
const postModel = require("./model/post");
const { default: mongoose } = require("mongoose");
const cookieparser=require('cookie-parser');
app.set("view engine","ejs");
app.use(express.json());
app.use(express.urlencoded({extended:true}));
app.use(cookieparser());

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
    res.render("profile",{user});
});
app.get("/like/:id", isLoggedIn, async function(req, res) {

    let post = await postModel.findOne({ _id: req.params.id });

    if (post.likes.indexOf(req.user.userid) === -1) {
        post.likes.push(req.user.userid);
    } else {
        post.likes.splice(
            post.likes.indexOf(req.user.userid),
            1
        );
    }

    await post.save();

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
    let{content}=req.body;
    let user=await userModel.findOne({email:req.user.email})
    let post=await postModel.create({
        user:user._id,
        content:content
    })
    user.posts.push(post._id);
    await user.save();
    res.redirect('/profile')
});
app.get("/login", function(req, res) {
    res.render("login");
});
app.post("/register", async function(req, res) {
    let {email,password,age,username,name}=req.body;
    let find=await userModel.findOne({email})
    if(find) return res.status(500).send("User is already registered");
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

    if(req.user.email !== "shreyanshyadav9572@gmail.com"){
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

    let posts = await postModel.find()
        .populate("user");

    res.render("feed",{posts});
});
app.listen(process.env.PORT || 3000, function() {
    console.log("Server running");
});