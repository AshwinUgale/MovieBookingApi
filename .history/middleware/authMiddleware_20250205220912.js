const jwt = require('jsonwebtoken');
const User = require('../models/User');

exports.auth = async (req,res,next) =>{
    try{
        const token = req.header('Authorization')?.replace('Bearer ','');
        if (!token) return res.status(401).json({message:'No token provided'});

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.user.id);
        if(!user) return res.status(404).json({message: 'User not found'});

        req.user = user;
        next();
    } catch (error) {
        
        res.status(401).json({ message: 'Unauthorized' });
    }
};


exports.adminAuth = async (req, res, next) => {
    try {
        const token = req.header('Authorization')?.replace('Bearer ', '');
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.user.id);

        if (user.role !== 'admin') {
            return res.status(403).json({ message: 'Access denied: Admins only' });
        }

        req.user = user;
        next();
    } catch (error) {
        res.status(401).json({ message: 'Unauthorized' });
    }
};