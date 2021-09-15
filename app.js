const express = require('express');
const mongoose = require('mongoose');
const body_parser = require('body-parser');

const app = express();
app.set('view engine','ejs');
app.use(express.urlencoded({extended: true}));

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
        console.log(con_password);
        errors['password'] = 'Password and Confirm password Did not match';
    }
    if(pin.length != 4){
        errors['pin'] = 'Pin has to 4 ditis long';
    }
    console.log(errors);
});

app.listen(3000,()=>{
    console.log("Server Started at localhost:3000");
});