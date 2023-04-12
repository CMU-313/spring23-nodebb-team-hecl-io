'use strict';

const fetch = require('node-fetch');
const helpers = require('../helpers');
const user = require('../../user');
const db = require('../../database');

const Career = module.exports;

Career.register = async (req, res) => {
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

        const body = JSON.stringify(userCareerData);
        const microserviceURL = 'https://career-ml-service.fly.dev/predict';
        const errorMessage = 'The career-ml-service microservice failed to predict';
        const headers = {
            'Content-Type': 'application/json',
        };
        const requestData = {
            method: 'POST',
            headers: headers,
            body: body,
            redirect: 'follow',
        };

        try {
            // success prediction from the model
            const prediction = await fetch(microserviceURL, requestData).then(response => response.json());
            userCareerData.prediction = prediction.good_employee;
        } catch (err) {
            // model failure
            console.error(err);
            return res.status(500).json({ error: errorMessage });
        }

        await user.setCareerData(req.uid, userCareerData);
        db.sortedSetAdd('users:career', req.uid, req.uid);
        res.json({});
    } catch (err) {
        console.log(err);
        helpers.noScriptErrors(req, res, err.message, 400);
    }
    ajaxify.go('career/', null, true);
};
