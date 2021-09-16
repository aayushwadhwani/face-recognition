const express = require('express');
const mongoose = require('mongoose');
const body_parser = require('body-parser');
const key = require('./config/keys.js');;
const session = require('express-session');
const mongodbSession = require('connect-mongodb-session')(session);
const app = express();
const registerModel = require('./Schema/details.js');
const db = mongoose.connect(key.mngoURI, { useNewUrlParser: true,useUnifiedTopology: true}).then(()=>{
    console.log('Connected to mongodb successfully');
}).catch(err=>console.log(err));
const store = new mongodbSession({
    uri: key.mngoURI,
    collection: 'mySessions'
});

app.use(express.urlencoded({extended: true}));
const isAuth = (req,res,next)=>{
    if(req.session.isAuth){
        next();
    }else{
        res.redirect('/user/signup');
    }
};
app.use(session({
    secret: 'This is secret',
    resave: false,
    saveUninitialized: false,
    store: store
}));



app.set('view engine','ejs');

app.get('/',(req,res)=>{
    
    res.render('homepage');
});

app.get('/user/signup',(req,res)=>{
    res.render('user/sign_up');
});

app.get('/user/login',(req,res)=>{
    res.render('user/login');
});

app.post('/user/signup',(req,res)=>{
    let errors = {};
    const {first_name,last_name,mobile_number,gender,age,email,account_number,password,confirm_password,pin}= req.body;
    if(mobile_number.length != 10){
        errors['mobile_number'] = 'Mobile Number should be 10 digits long';
    }
    if(Number(age) < 18){
        errors['age'] = 'Age should be atleast 18 years to register';
    }
    if(account_number.length != 6){
        errors['account_number'] = 'Account Number Should be 6 digits long';
    }
    if(password.length < 8){
        errors['password'] = 'Password should have atleast 8 characters';
    }
    if(password != confirm_password){
        console.log(password);
        console.log(confirm_password);
        errors['password'] = 'Password and Confirm password Did not match';
    }
    if(pin.length != 4){
        errors['pin'] = 'Pin has to 4 ditis long';
    }
    console.log(errors);
    if(Object.keys(errors).length == 0){
        registerModel.findOne({email: email}).then(user=>{
            if(user){
                errors['email'] = 'User Already exists'
                console.log(errors);
                res.render('user/sign_up');
            }else{
                const newUser = new registerModel({
                    first_name,
                    last_name,
                    contact_number: mobile_number,
                    gender,
                    age,
                    email,
                    account_number,
                    password,
                    pin
                });

                newUser.save().then(()=>{
                    console.log('saved successfully');
                    res.redirect('./login');
                }).catch(err=> console.log(err));
            }
        });
    }else{
        res.render('user/sign_up');
    }
});

app.post('/user/login',async (req,res)=>{
    const {email, password} = req.body;
    let user = await registerModel.findOne({email});
    if(!user){
        return res.redirect('/user/login');
    }
    if(password != user.password){
        return res.redirect('/user/login');
    }

    req.session.isAuth = {isAuth: true, id: user._id};
    res.redirect('/dashboard/dashboard');
});

app.post('/logout',(req,res)=>{
    req.session.destroy((err)=>{
        if(err) throw err;
        res.redirect('/');
    });
});

app.get('/dashboard/dashboard',isAuth,async (req,res)=>{
    const user = req.session.isAuth.id;
    const user_id = user.valueOf();
    console.log(typeof user_id);
    const user_data = await registerModel.findOne({_id: user_id});
    console.log(user_data);
    res.render('dashboard/dashboard',{user_data});
});


app.listen(3000,()=>{
    console.log("Server Started at localhost:3000");
});