const User = require('../models/User');
const { validationResults } = require('express-validator');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

exports.registerUser = async (req,res) =>{
    const errors = validationResults(req);
    if (!errors.isEmpty()){
        return res.status(400).json({errors:errors.array()});
    }

    const {name,email,password} = req.body;
    try{
        let user = await User.findOne({email});
        if (user) return res.status(400).json({msg:'User already exists'});

        user = new User({name,email,password});
        await user.save()

        res.status(201).json({ msg: 'User registered successfully' });

    }
    catch (error) {
        res.status(500).send('Server Error');
    }
};