'use strict';

const fetch = require('node-fetch');
const helpers = require('../helpers');
const user = require('../../user');
const db = require('../../database');

const Career = module.exports;

Career.register = async (req, res) => {
    console.log('register');
    const userData = req.body;
    try {
        const userCareerData = {
            student_id: userData.student_id,
            major: userData.major,
            age: userData.age,
            gender: userData.gender,
            gpa: userData.gpa,
            extra_curricular: userData.extra_curricular,
            num_programming_languages: userData.num_programming_languages,
            num_past_internships: userData.num_past_internships,
        };

        // TODO: Change this line to do call and retrieve actual candidate
        // success prediction from the model instead of using a random number
        // userCareerData.prediction = Math.round(Math.random());
        
        // API request options
        const requestOptions = {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(userCareerData),
            redirect: 'follow'
        };

        // Make the request to the microservice and get the prediction
        try {
            const response = await fetch('https://career-ml-microservice.fly.dev/predict', requestOptions)
            .then(response => response.json());
            userCareerData.prediction = response.good_employee
        } catch (err) {
            console.error(err);
            return res.status(500).json({ error: 'The Career-Ml-microservice threw an error.' });
        }

        await user.setCareerData(req.uid, userCareerData);
        db.sortedSetAdd('users:career', req.uid, req.uid);
        res.json({});
    } catch (err) {
        console.log(err);
        helpers.noScriptErrors(req, res, err.message, 400);
    }
    console.log('register done');
};
